/**
 * quoteApi.js — 行情 API 多源兜底层
 *
 * 数据源优先级：
 *   1. 腾讯财经（主源，GBK 编码，已用 TextDecoder 正确解码）
 *   2. 新浪财经（备源，GBK 编码，已用 TextDecoder 正确解码）
 *   3. 东方财富（兜底，JSON/UTF-8）
 *
 * A股代码规则：
 *   沪市：6xx、5xx(ETF)、9xx(B股) → secid=1.x / sh / s_sh
 *   深市：0xx、1xx、2xx、3xx(ETF) → secid=0.x / sz / s_sz
 *
 * 东方财富价格单位（f43）：
 *   A股：分（÷100）
 *   港股：厘（÷1000）
 *   美股：厘（÷1000）
 */

// ─── 判断 A 股是沪市还是深市 ───────────────────────────────────
function isShanghai(code) {
  const c = code.toString()
  return c.startsWith('6') || c.startsWith('5') || c.startsWith('9')
}

// ─── 判断是否是ETF ───────────────────────────────────
function isETF(code) {
  const c = code.toString()
  // 沪市ETF：510、511、512、513、514、515、516、517、518、519、588开头
  // 深市ETF：159、160、161、162、163、164、165、166、167、168、169开头
  const etfPrefixes = ['159', '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', '510', '511', '512', '513', '514', '515', '516', '517', '518', '519', '588']
  return etfPrefixes.some(prefix => c.startsWith(prefix))
}

// ─── 规范化股票代码 ───────────────────────────────────
function normalizeCode(market, code) {
  // 统一转大写
  let normalized = code.toString().toUpperCase().trim()
  
  // 港股代码：如果全是数字且长度小于5，自动补0
  if (market === '港股' && /^\d+$/.test(normalized)) {
    // 港股代码通常是5位，如果不足5位前面补0
    while (normalized.length < 5) {
      normalized = '0' + normalized
    }
  }
  
  return normalized
}

// ─── 东方财富（主源，JSON/UTF-8）────────────────────────────────
async function fetchEastmoney(market, code) {
  let secid
  if (market === 'A股') {
    secid = isShanghai(code) ? `1.${code}` : `0.${code}`
  } else if (market === '港股') {
    secid = `116.${code}`
  } else if (market === '美股') {
    secid = `105.${code}`
  } else {
    throw new Error(`Unsupported market: ${market}`)
  }

  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f170`
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Eastmoney HTTP ${res.status}`)

  const json = await res.json()
  if (!json || json.rc !== 0 || !json.data) throw new Error('Eastmoney invalid response')

  const d = json.data
  let price = 0
  if (d.f43) {
    if (market === 'A股') {
      if (isETF(code)) {
        price = d.f43 / 1000  // ETF：厘（与港股/美股相同）
      } else {
        price = d.f43 / 100   // 普通A股：分
      }
    } else {
      price = d.f43 / 1000  // 港股/美股：厘
    }
  }
  const name = d.f58 || ''
  const changePercent = d.f170 != null ? d.f170 / 100 : 0

  return { price, name, changePercent, source: 'eastmoney' }
}

// ─── 腾讯财经（备源，GBK 编码）──────────────────────────────────
async function fetchTencent(market, code) {
  let prefix
  if (market === 'A股') {
    prefix = isShanghai(code) ? `s_sh${code}` : `s_sz${code}`
  } else if (market === '港股') {
    prefix = `hk${code}`
  } else if (market === '美股') {
    prefix = `s_us${code}`
  } else {
    throw new Error(`Unsupported market: ${market}`)
  }

  const url = `https://qt.gtimg.cn/q=${prefix}`
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Tencent HTTP ${res.status}`)

  const buffer = await res.arrayBuffer()
  const text = new TextDecoder('gbk').decode(buffer)
  const match = text.match(/="(.+?)"/)
  if (!match) throw new Error('Tencent parse error')

  const fields = match[1].split('~')
  if (fields.length < 4) throw new Error('Tencent insufficient fields')

  const price = parseFloat(fields[3]) || 0
  const name = fields[1] || ''
  return { price, name, changePercent: 0, source: 'tencent' }
}

// ─── 新浪财经（兜底，GBK 编码）──────────────────────────────────
async function fetchSina(market, code) {
  let prefix
  if (market === 'A股') {
    prefix = isShanghai(code) ? `sh${code}` : `sz${code}`
  } else if (market === '港股') {
    prefix = `hk${code}`
  } else if (market === '美股') {
    prefix = `gb_${code}`
  } else {
    throw new Error(`Unsupported market: ${market}`)
  }

  const url = `https://hq.sinajs.cn/list=${prefix}`
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`Sina HTTP ${res.status}`)

  const buffer = await res.arrayBuffer()
  const text = new TextDecoder('gbk').decode(buffer)
  const match = text.match(/="(.+?)"/)
  if (!match) throw new Error('Sina parse error')

  const fields = match[1].split(',')
  if (fields.length < 4) throw new Error('Sina insufficient fields')

  const name = fields[0] || ''
  const price = parseFloat(fields[3]) || 0
  return { price, name, changePercent: 0, source: 'sina' }
}

// ─── 获取单只股票行情（多源兜底）────────────────────────────────
export async function fetchQuote(market, code) {
  // 规范化股票代码
  const normalizedCode = normalizeCode(market, code)
  
  const sources = [
    { name: 'tencent', fn: fetchTencent },
    { name: 'sina', fn: fetchSina },
    { name: 'eastmoney', fn: fetchEastmoney },
  ]

  let lastError = null
  for (const source of sources) {
    try {
      const result = await source.fn(market, normalizedCode)
      if (result.price > 0) return result
      lastError = new Error(`${source.name} returned price=0`)
    } catch (err) {
      lastError = err
      console.warn(`[quoteApi] ${source.name} failed for ${market}:${normalizedCode}`, err.message)
    }
  }

  throw lastError || new Error(`All sources failed for ${market}:${normalizedCode}`)
}

// ─── 批量获取行情 ───────────────────────────────────────────────
export async function fetchQuotes(holdings) {
  if (!holdings || holdings.length === 0) return {}

  const result = {}
  const errors = []

  const promises = holdings.map(async (h) => {
    try {
      const quote = await fetchQuote(h.market, h.code)
      result[h.code] = quote.price
    } catch (err) {
      errors.push({ market: h.market, code: h.code, name: h.name, error: err.message })
    }
  })

  await Promise.allSettled(promises)

  if (errors.length > 0) {
    console.warn(`[quoteApi] ${errors.length} quotes failed:`, errors)
  }

  // 返回 { prices, errors } 供调用方展示错误信息
  return { prices: result, errors }
}

// ─── 汇率获取（多源兜底）─────────────────────────────────────────
async function fetchFxFromExchangeApi() {
  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { mode: 'cors' })
  if (!res.ok) throw new Error(`ExchangeRate API HTTP ${res.status}`)
  const json = await res.json()
  const cny = json.rates?.CNY || 0
  const hkd = json.rates?.HKD || 0
  if (cny > 0 && hkd > 0) {
    return { USD: cny, HKD: cny / hkd }
  }
  throw new Error('ExchangeRate API parse error')
}

async function fetchFxFromEastmoney() {
  const [res1, res2] = await Promise.all([
    fetch('https://push2.eastmoney.com/api/qt/stock/get?secid=118.USD0000001&fields=f43', { mode: 'cors' }),
    fetch('https://push2.eastmoney.com/api/qt/stock/get?secid=118.HKD0000001&fields=f43', { mode: 'cors' }),
  ])
  const json1 = await res1.json()
  const json2 = await res2.json()
  const usd = json1?.data?.f43 ? json1.data.f43 / 100 : 0
  const hkd = json2?.data?.f43 ? json2.data.f43 / 100 : 0
  if (usd > 0 && hkd > 0) return { USD: usd, HKD: hkd }
  throw new Error('Eastmoney fx parse error')
}

export async function fetchFxRates() {
  const sources = [
    { name: 'exchangerate-api', fn: fetchFxFromExchangeApi },
    { name: 'eastmoney', fn: fetchFxFromEastmoney },
  ]
  for (const source of sources) {
    try {
      const rates = await source.fn()
      return rates
    } catch (err) {
      console.warn(`[quoteApi] fx ${source.name} failed:`, err.message)
    }
  }
  return null
}
