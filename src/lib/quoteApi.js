/**
 * quoteApi.js — 行情 API 多源兜底层
 *
 * 数据源优先级：
 *   1. 东方财富（主源，JSON/UTF-8）
 *   2. 腾讯财经（备源，GBK 编码，已用 TextDecoder 正确解码）
 *   3. 新浪财经（兜底，GBK 编码，已用 TextDecoder 正确解码）
 *
 * 三个源均可正确获取中文名称和价格。
 */

// ─── 东方财富（主源，JSON/UTF-8）────────────────────────────────
async function fetchEastmoney(market, code) {
  let secid
  if (market === 'A股') {
    const c = code.toString()
    secid = (c.startsWith('6') || c.startsWith('9')) ? `1.${c}` : `0.${c}`
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
  // f58=名称(UTF-8), f43=价格, f170=涨跌幅(百分之一)
  // A股/港股: f43 单位是分(÷100)
  // 美股: f43 单位是厘(÷1000)
  let price = 0
  if (d.f43) {
    price = market === '美股' ? d.f43 / 1000 : d.f43 / 100
  }
  const name = d.f58 || ''
  const changePercent = d.f170 != null ? d.f170 / 100 : 0

  return { price, name, changePercent, source: 'eastmoney' }
}

// ─── 腾讯财经（备源，GBK 编码）──────────────────────────────────
async function fetchTencent(market, code) {
  let prefix
  if (market === 'A股') {
    const c = code.toString()
    prefix = (c.startsWith('6') || c.startsWith('9')) ? `s_sh${c}` : `s_sz${c}`
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
  // 腾讯返回 GBK 编码，用 TextDecoder 解码
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
    const c = code.toString()
    prefix = (c.startsWith('6') || c.startsWith('9')) ? `sh${c}` : `sz${c}`
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
  // 新浪返回 GBK 编码，用 TextDecoder 解码
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
  const sources = [
    { name: 'eastmoney', fn: fetchEastmoney },
    { name: 'tencent', fn: fetchTencent },
    { name: 'sina', fn: fetchSina },
  ]

  let lastError = null
  for (const source of sources) {
    try {
      const result = await source.fn(market, code)
      if (result.price > 0) return result
      lastError = new Error(`${source.name} returned price=0`)
    } catch (err) {
      lastError = err
      console.warn(`[quoteApi] ${source.name} failed for ${market}:${code}`, err.message)
    }
  }

  throw lastError || new Error(`All sources failed for ${market}:${code}`)
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
      errors.push({ market: h.market, code: h.code, error: err.message })
    }
  })

  await Promise.allSettled(promises)

  if (errors.length > 0) {
    console.warn(`[quoteApi] ${errors.length} quotes failed:`, errors)
  }

  return result
}

// ─── 汇率获取（多源兜底）─────────────────────────────────────────
// 主源：exchangerate-api（免费，无需 Key，标准 JSON）
async function fetchFxFromExchangeApi() {
  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { mode: 'cors' })
  if (!res.ok) throw new Error(`ExchangeRate API HTTP ${res.status}`)
  const json = await res.json()
  const cny = json.rates?.CNY || 0
  const hkd = json.rates?.HKD || 0
  if (cny > 0 && hkd > 0) {
    // 返回 USD/CNY 和 HKD/CNY
    // exchangerate-api 返回的是 1 USD = X HKD，需转换为 1 HKD = ? CNY
    return { USD: cny, HKD: cny / hkd }
  }
  throw new Error('ExchangeRate API parse error')
}

// 备源：东方财富汇率接口
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
