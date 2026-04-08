"""
quotes.py — 行情代理 API
将前端行情请求代理到后端，解决 WebView CORS 问题
"""
import logging
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quotes", tags=["行情"])

# ─── 辅助函数 ──────────────────────────────────────────────────
def is_shanghai(code: str) -> bool:
    """判断 A 股是沪市还是深市"""
    c = code.lstrip('0')
    return c.startswith('6') or c.startswith('5') or c.startswith('9')

def is_etf(code: str) -> bool:
    """判断是否是 ETF"""
    etf_prefixes = ['159', '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', 
                    '510', '511', '512', '513', '514', '515', '516', '517', '518', '519', '588']
    return any(code.startswith(p) for p in etf_prefixes)

def normalize_code(market: str, code: str) -> str:
    """规范化股票代码"""
    normalized = code.upper().strip()
    if market == "港股" and normalized.isdigit() and len(normalized) < 5:
        normalized = normalized.zfill(5)
    return normalized


# ─── 东方财富（主源）────────────────────────────────────────────
async def fetch_eastmoney(market: str, code: str) -> dict:
    """从东方财富获取行情"""
    if market == "A股":
        secid = f"1.{code}" if is_shanghai(code) else f"0.{code}"
    elif market == "港股":
        secid = f"116.{code}"
    elif market == "美股":
        secid = f"105.{code}"
    else:
        raise ValueError(f"Unsupported market: {market}")

    url = f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f57,f58,f170"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
    
    if not data or data.get("rc") != 0 or not data.get("data"):
        raise ValueError("Eastmoney invalid response")
    
    d = data["data"]
    price = 0.0
    if d.get("f43"):
        if market == "A股":
            if is_etf(code):
                price = d["f43"] / 1000
            else:
                price = d["f43"] / 100
        else:
            price = d["f43"] / 1000
    
    return {
        "price": price,
        "name": d.get("f58", ""),
        "changePercent": d.get("f170", 0) / 100 if d.get("f170") else 0,
        "source": "eastmoney"
    }


# ─── 腾讯财经（备源）────────────────────────────────────────────
async def fetch_tencent(market: str, code: str) -> dict:
    """从腾讯财经获取行情（GBK 编码）"""
    if market == "A股":
        prefix = f"s_sh{code}" if is_shanghai(code) else f"s_sz{code}"
    elif market == "港股":
        prefix = f"hk{code}"
    elif market == "美股":
        prefix = f"s_us{code}"
    else:
        raise ValueError(f"Unsupported market: {market}")

    url = f"https://qt.gtimg.cn/q={prefix}"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        text = resp.content.decode('gbk')
    
    match = re.search(r'="(.+?)"', text)
    if not match:
        raise ValueError("Tencent parse error")
    
    fields = match.group(1).split('~')
    if len(fields) < 4:
        raise ValueError("Tencent insufficient fields")
    
    return {
        "price": float(fields[3]) if fields[3] else 0.0,
        "name": fields[1] if len(fields) > 1 else "",
        "changePercent": 0,
        "source": "tencent"
    }


# ─── 新浪财经（兜底）────────────────────────────────────────────
async def fetch_sina(market: str, code: str) -> dict:
    """从新浪财经获取行情（GBK 编码）"""
    if market == "A股":
        prefix = f"sh{code}" if is_shanghai(code) else f"sz{code}"
    elif market == "港股":
        prefix = f"hk{code}"
    elif market == "美股":
        prefix = f"gb_{code}"
    else:
        raise ValueError(f"Unsupported market: {market}")

    url = f"https://hq.sinajs.cn/list={prefix}"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        text = resp.content.decode('gbk')
    
    match = re.search(r'="(.+?)"', text)
    if not match:
        raise ValueError("Sina parse error")
    
    fields = match.group(1).split(',')
    if len(fields) < 4:
        raise ValueError("Sina insufficient fields")
    
    return {
        "price": float(fields[3]) if fields[3] else 0.0,
        "name": fields[0] if fields[0] else "",
        "changePercent": 0,
        "source": "sina"
    }


# ─── API 端点 ───────────────────────────────────────────────────
@router.get("/quote")
async def get_quote(
    market: str = Query(..., description="市场：A股/港股/美股"),
    code: str = Query(..., description="股票代码")
):
    """获取单只股票行情（多源兜底）"""
    normalized_code = normalize_code(market, code)
    
    sources = [
        ("tencent", fetch_tencent),
        ("sina", fetch_sina),
        ("eastmoney", fetch_eastmoney),
    ]
    
    last_error = None
    for name, fetch_fn in sources:
        try:
            result = await fetch_fn(market, normalized_code)
            if result["price"] > 0:
                logger.info(f"行情获取成功: {market}:{normalized_code} -> {result['price']} ({name})")
                return result
            last_error = ValueError(f"{name} returned price=0")
        except Exception as e:
            last_error = e
            logger.warning(f"行情源 {name} 失败: {market}:{normalized_code} - {str(e)}")
    
    logger.error(f"所有行情源失败: {market}:{normalized_code}")
    raise HTTPException(status_code=503, detail=f"无法获取行情: {str(last_error)}")


@router.post("/quotes/batch")
async def get_quotes_batch(holdings: list[dict]):
    """批量获取行情"""
    results = {}
    errors = []
    
    for h in holdings:
        market = h.get("market")
        code = h.get("code")
        name = h.get("name", "")
        
        if not market or not code:
            continue
        
        try:
            quote = await get_quote(market, code)
            results[code] = quote["price"]
        except Exception as e:
            errors.append({
                "market": market,
                "code": code,
                "name": name,
                "error": str(e)
            })
    
    if errors:
        logger.warning(f"批量行情获取有 {len(errors)} 个失败")
    
    return {"prices": results, "errors": errors}


# ─── 汇率 API ───────────────────────────────────────────────────
async def fetch_fx_exchange_api() -> dict:
    """从 ExchangeRate-API 获取汇率"""
    url = "https://api.exchangerate-api.com/v4/latest/USD"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
    
    rates = data.get("rates", {})
    cny = rates.get("CNY", 0)
    hkd = rates.get("HKD", 0)
    
    if cny > 0 and hkd > 0:
        return {"USD": cny, "HKD": cny / hkd}
    raise ValueError("ExchangeRate API parse error")


async def fetch_fx_eastmoney() -> dict:
    """从东方财富获取汇率"""
    urls = [
        "https://push2.eastmoney.com/api/qt/stock/get?secid=118.USD0000001&fields=f43",
        "https://push2.eastmoney.com/api/qt/stock/get?secid=118.HKD0000001&fields=f43",
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        responses = await client.get(urls[0]), await client.get(urls[1])
        
        data1 = responses[0].json()
        data2 = responses[1].json()
        
        usd = (data1.get("data", {}).get("f43") or 0) / 100
        hkd = (data2.get("data", {}).get("f43") or 0) / 100
        
        if usd > 0 and hkd > 0:
            return {"USD": usd, "HKD": hkd}
        raise ValueError("Eastmoney fx parse error")


@router.get("/fx")
async def get_fx_rates():
    """获取汇率（多源兜底）"""
    sources = [
        ("exchangerate-api", fetch_fx_exchange_api),
        ("eastmoney", fetch_fx_eastmoney),
    ]
    
    for name, fetch_fn in sources:
        try:
            rates = await fetch_fn()
            logger.info(f"汇率获取成功 ({name}): USD={rates['USD']}, HKD={rates['HKD']}")
            return rates
        except Exception as e:
            logger.warning(f"汇率源 {name} 失败: {str(e)}")
    
    raise HTTPException(status_code=503, detail="无法获取汇率")
