/**
 * quoteApi.js — 行情 API（通过后端代理，优化版）
 * 使用批量请求加速
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

// ─── 批量获取行情（优化版，使用后端批量 API）─────────────────
export async function fetchQuotes(holdings) {
  if (!holdings || holdings.length === 0) return { prices: {}, errors: [] }

  // 使用后端批量 API（一次请求所有行情）
  const url = `${BASE_URL}/quotes/batch`
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(holdings.map(function(h) {
        return {
          market: h.market,
          code: normalizeCode(h.market, h.code),
          name: h.name || ''
        }
      }))
    })
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    
    const data = await res.json()
    
    if (data.errors && data.errors.length > 0) {
      console.warn('[quoteApi] 部分行情获取失败:', data.errors)
    }
    
    return { prices: data.prices || {}, errors: data.errors || [] }
  } catch (err) {
    console.error('[quoteApi] 批量请求失败:', err)
    return { prices: {}, errors: holdings.map(function(h) {
      return { market: h.market, code: h.code, name: h.name, error: err.message }
    })}
  }
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
