/**
 * quoteApi.js — 行情 API（通过后端代理）
 * 将所有行情请求代理到后端，解决 WebView CORS 问题
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// ─── 规范化股票代码 ───────────────────────────────────
function normalizeCode(market, code) {
  let normalized = code.toString().toUpperCase().trim()
  
  if (market === '港股' && /^\d+$/.test(normalized)) {
    while (normalized.length < 5) {
      normalized = '0' + normalized
    }
  }
  
  return normalized
}

// ─── 获取单只股票行情 ─────────────────────────────────
export async function fetchQuote(market, code) {
  const normalizedCode = normalizeCode(market, code)
  
  const url = `${BASE_URL}/quotes/quote?market=${encodeURIComponent(market)}&code=${encodeURIComponent(normalizedCode)}`
  const res = await fetch(url)
  
  if (!res.ok) {
    const err = await res.json().catch(function() { return { detail: '请求失败' } })
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  
  return res.json()
}

// ─── 批量获取行情 ───────────────────────────────────────
export async function fetchQuotes(holdings) {
  if (!holdings || holdings.length === 0) return { prices: {}, errors: [] }

  const result = {}
  const errors = []

  // 逐个请求（避免批量请求过大）
  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i]
    try {
      const quote = await fetchQuote(h.market, h.code)
      result[h.code] = quote.price
    } catch (err) {
      errors.push({ market: h.market, code: h.code, name: h.name, error: err.message })
    }
  }

  if (errors.length > 0) {
    console.warn(`[quoteApi] ${errors.length} quotes failed:`, errors)
  }

  return { prices: result, errors }
}

// ─── 获取汇率 ──────────────────────────────────────────
export async function fetchFxRates() {
  const url = `${BASE_URL}/quotes/fx`
  const res = await fetch(url)
  
  if (!res.ok) {
    const err = await res.json().catch(function() { return { detail: '请求失败' } })
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  
  return res.json()
}
