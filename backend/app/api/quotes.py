"""
quotes.py — 行情代理 API（优化版）
使用连接池和并发请求加速
"""
import logging
import re
import asyncio
from typing import Optional, Dict, List
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quotes", tags=["行情"])

# 全局 HTTP 客户端（连接池复用）
_http_client = None

def get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=8.0,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            http2=False
        )
    return _http_client


# ─── 辅助函数 ──────────────────────────────────────────────────
def is_shanghai(code: str) -> bool:
    c = code.lstrip('0')
    return c.startswith('6') or c.startswith('5') or c.startswith('9')

def is_etf(code: str) -> bool:
    etf_prefixes = ['159', '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', 
                    '510', '511', '512', '513', '514', '515', '516', '517', '518', '519', '588']
    return any(code.startswith(p) for p in etf_prefixes)

def normalize_code(market: str, code: str) -> str:
    normalized = code.upper().strip()
    if market == "港股" and normalized.isdigit() and len(normalized) < 5:
        normalized = normalized.zfill(5)
    return normalized


# ─── 腾讯财经（主源，支持批量）────────────────────────────────────────────
async def fetch_tencent_batch(client: httpx.AsyncClient, items: List[dict]) -> Dict[str, dict]:
    """腾讯财经批量获取（一次请求最多 80 只）"""
    results = {}
    
    # 按市场分组构建查询参数
    prefixes = []
    code_to_item = {}
    
    for item in items:
        market, code = item["market"], item["code"]
        normalized = normalize_code(market, code)
        
        if market == "A股":
            prefix = f"s_sh{normalized}" if is_shanghai(normalized) else f"s_sz{normalized}"
        elif market == "港股":
            prefix = f"hk{normalized}"
        elif market == "美股":
            prefix = f"s_us{normalized}"
        else:
            continue
        
        prefixes.append(prefix)
        code_to_item[prefix] = {**item, "normalized": normalized}
    
    if not prefixes:
        return results
    
    # 分批请求（每批 80 只）
    batch_size = 80
    for i in range(0, len(prefixes), batch_size):
        batch = prefixes[i:i + batch_size]
        url = f"https://qt.gtimg.cn/q={','.join(batch)}"
        
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            text = resp.content.decode('gbk')
            
            # 解析响应
            for line in text.split(';'):
                match = re.match(r'v_([^=]+)="(.+?)"', line.strip())
                if not match:
                    match = re.match(r'v_([^=]+)="(.+?)"', line.strip())
                if not match:
                    continue
                
                prefix_key = match.group(1)
                data_str = match.group(2)
                
                if prefix_key not in code_to_item:
                    continue
                
                item = code_to_item[prefix_key]
                fields = data_str.split('~')
                
                if len(fields) >= 4 and fields[3]:
                    price = float(fields[3])
                    if price > 0:
                        results[item["code"]] = {
                            "price": price,
                            "name": fields[1] if len(fields) > 1 else item.get("name", ""),
                            "source": "tencent"
                        }
        except Exception as e:
            logger.warning(f"腾讯批量请求失败: {str(e)}")
    
    return results


# ─── 东方财富（备源）────────────────────────────────────────────
async def fetch_eastmoney_single(client: httpx.AsyncClient, market: str, code: str) -> Optional[dict]:
    """东方财富单只获取"""
    normalized = normalize_code(market, code)
    
    if market == "A股":
        secid = f"1.{normalized}" if is_shanghai(normalized) else f"0.{normalized}"
    elif market == "港股":
        secid = f"116.{normalized}"
    elif market == "美股":
        secid = f"105.{normalized}"
    else:
        return None
    
    url = f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f57,f58,f170"
    
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        
        if not data or data.get("rc") != 0 or not data.get("data"):
            return None
        
        d = data["data"]
        price = 0.0
        if d.get("f43"):
            if market == "A股":
                price = d["f43"] / 1000 if is_etf(normalized) else d["f43"] / 100
            else:
                price = d["f43"] / 1000
        
        if price > 0:
            return {
                "price": price,
                "name": d.get("f58", ""),
                "source": "eastmoney"
            }
    except Exception as e:
        logger.debug(f"东方财富获取失败 {market}:{code}: {str(e)}")
    
    return None


# ─── API 端点 ───────────────────────────────────────────────────
@router.get("/quote")
async def get_quote(
    market: str = Query(..., description="市场：A股/港股/美股"),
    code: str = Query(..., description="股票代码")
):
    """获取单只股票行情"""
    client = get_client()
    normalized = normalize_code(market, code)
    
    # 先尝试腾讯
    result = await fetch_tencent_batch(client, [{"market": market, "code": code}])
    if code in result:
        return result[code]
    
    # 再尝试东方财富
    result = await fetch_eastmoney_single(client, market, normalized)
    if result:
        return result
    
    raise HTTPException(status_code=503, detail=f"无法获取行情: {market}:{code}")


@router.post("/batch")
async def get_quotes_batch(holdings: List[dict]):
    """批量获取行情（并发优化版）"""
    if not holdings:
        return {"prices": {}, "errors": []}
    
    client = get_client()
    results = {}
    errors = []
    
    # 规范化所有代码
    items = []
    for h in holdings:
        market = h.get("market")
        code = h.get("code")
        if market and code:
            items.append({
                "market": market,
                "code": code,
                "name": h.get("name", "")
            })
    
    if not items:
        return {"prices": {}, "errors": []}
    
    # 1. 先用腾讯批量获取（最快）
    tencent_results = await fetch_tencent_batch(client, items)
    results.update({code: r["price"] for code, r in tencent_results.items()})
    
    # 2. 找出失败的，用东方财富并发补充
    failed_items = [item for item in items if item["code"] not in results]
    
    if failed_items:
        # 并发请求东方财富（最多 10 个并发）
        semaphore = asyncio.Semaphore(10)
        
        async def fetch_with_semaphore(item):
            async with semaphore:
                return await fetch_eastmoney_single(client, item["market"], item["code"])
        
        tasks = [fetch_with_semaphore(item) for item in failed_items]
        em_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for item, em_result in zip(failed_items, em_results):
            if isinstance(em_result, dict) and em_result.get("price"):
                results[item["code"]] = em_result["price"]
            elif isinstance(em_result, Exception):
                errors.append({
                    "market": item["market"],
                    "code": item["code"],
                    "name": item.get("name", ""),
                    "error": str(em_result)
                })
    
    # 3. 记录最终失败的
    for item in items:
        if item["code"] not in results:
            errors.append({
                "market": item["market"],
                "code": item["code"],
                "name": item.get("name", ""),
                "error": "所有行情源失败"
            })
    
    if errors:
        logger.warning(f"批量行情获取有 {len(errors)} 个失败")
    
    return {"prices": results, "errors": errors}


# ─── 汇率 API ───────────────────────────────────────────────────
@router.get("/fx")
async def get_fx_rates():
    """获取汇率"""
    client = get_client()
    
    # 优先使用东方财富（国内访问快）
    try:
        urls = [
            "https://push2.eastmoney.com/api/qt/stock/get?secid=118.USD0000001&fields=f43",
            "https://push2.eastmoney.com/api/qt/stock/get?secid=118.HKD0000001&fields=f43",
        ]
        
        # 并发请求
        usd_resp, hkd_resp = await asyncio.gather(
            client.get(urls[0]),
            client.get(urls[1]),
            return_exceptions=True
        )
        
        if not isinstance(usd_resp, Exception) and not isinstance(hkd_resp, Exception):
            usd_data = usd_resp.json()
            hkd_data = hkd_resp.json()
            
            usd = (usd_data.get("data", {}).get("f43") or 0) / 100
            hkd = (hkd_data.get("data", {}).get("f43") or 0) / 100
            
            if usd > 0 and hkd > 0:
                return {"USD": usd, "HKD": hkd}
    except Exception as e:
        logger.warning(f"东方财富汇率失败: {str(e)}")
    
    # 备用：ExchangeRate-API
    try:
        url = "https://api.exchangerate-api.com/v4/latest/USD"
        resp = await client.get(url)
        data = resp.json()
        rates = data.get("rates", {})
        cny = rates.get("CNY", 0)
        hkd = rates.get("HKD", 0)
        if cny > 0 and hkd > 0:
            return {"USD": cny, "HKD": cny / hkd}
    except Exception as e:
        logger.warning(f"ExchangeRate API 失败: {str(e)}")
    
    raise HTTPException(status_code=503, detail="无法获取汇率")
