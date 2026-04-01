/**
 * api.js — 后端 API 请求层（替代 IndexedDB 的 db.js）
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('investment-token') || ''
}

function headers(json = true) {
  const h = {}
  if (json) h['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  })
  if (res.status === 401) {
    // token 过期，跳转登录
    localStorage.removeItem('investment-token')
    localStorage.removeItem('investment-auth')
    window.location.reload()
    throw new Error('登录已过期')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '请求失败' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── 认证 ─────────────────────────────────────────────────────
export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  localStorage.setItem('investment-token', data.access_token)
  localStorage.setItem('investment-auth', '1')
  return data
}

export function logout() {
  localStorage.removeItem('investment-token')
  localStorage.removeItem('investment-auth')
}

export function isLoggedIn() {
  return !!getToken()
}

// 发送验证码
export async function sendCode(email, type = 'register') {
  return request('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email, type }),
  })
}

// 注册
export async function register(email, code, username, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, code, username, password }),
  })
  localStorage.setItem('investment-token', data.access_token)
  localStorage.setItem('investment-auth', '1')
  return data
}

// 重置密码
export async function resetPassword(email, code, newPassword) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, new_password: newPassword }),
  })
}

// ─── 持仓 ─────────────────────────────────────────────────────
export async function loadHoldings() {
  return request('/holdings')
}

export async function saveHoldings(holdings) {
  // 转换前端格式为后端格式
  const data = holdings.map(h => ({
    market: h.market,
    code: h.code,
    name: h.name,
    sector: h.sector || '',
    trades: (h.trades || []).map(t => ({
      date: t.date,
      qty: t.qty,
      price: t.price,
      note: t.note || '',
    })),
  }))
  const result = await request('/holdings/bulk', {
    method: 'PUT',
    body: JSON.stringify({ holdings: data }),
  })
  return result.holdings || []
}

export async function deleteHolding(holdingId) {
  return request(`/holdings/${holdingId}`, { method: 'DELETE' })
}

// ─── 设置 ─────────────────────────────────────────────────────
export async function loadSettings() {
  return request('/settings')
}

export async function saveSettings(settings) {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
