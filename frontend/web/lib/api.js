/**
 * api.js — 后端 API 请求层
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

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
  console.log('开始请求:', `${BASE_URL}${url}`)
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: { ...headers(), ...options.headers },
    })
    console.log('请求响应状态:', res.status)
    if (res.status === 401) {
      localStorage.removeItem('investment-token')
      localStorage.removeItem('investment-auth')
      window.location.reload()
      throw new Error('登录已过期')
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '请求失败' }))
      console.log('请求错误:', err)
      const detail = err?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : detail?.message || detail?.error || `HTTP ${res.status}`
      const error = new Error(message)
      error.status = res.status
      error.detail = detail
      throw error
    }
    const data = await res.json()
    console.log('请求成功，返回数据:', data)
    return data
  } catch (error) {
    console.error('请求失败:', error)
    throw error
  }
}

// ─── 认证 ─────────────────────────────────────────────────────
export async function login(username, password) {
  console.log('开始登录，用户名:', username)
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  console.log('登录成功，获取到token:', data.access_token)
  localStorage.setItem('investment-token', data.access_token)
  localStorage.setItem('investment-auth', '1')
  console.log('token已保存到localStorage')
  return data
}

export function logout() {
  localStorage.removeItem('investment-token')
  localStorage.removeItem('investment-auth')
}

export function isLoggedIn() {
  const token = getToken()
  console.log('检查登录状态，token:', token)
  return !!token
}

export async function sendCode(email, type = 'register') {
  return request('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email, type }),
  })
}

export async function register(email, code, username, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, code, username, password }),
  })
  localStorage.setItem('investment-token', data.access_token)
  localStorage.setItem('investment-auth', '1')
  return data
}

export async function resetPassword(email, code, newPassword) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, new_password: newPassword }),
  })
}

// ─── 账本 ─────────────────────────────────────────────────────
export async function loadLedgers() {
  console.log('开始加载账本数据')
  try {
    const data = await request('/ledgers')
    console.log('加载账本数据成功:', data)
    return data
  } catch (error) {
    console.error('加载账本数据失败:', error)
    throw error
  }
}

export async function createLedger(name, color = '#1a1814') {
  console.log('开始创建账本:', name)
  try {
    const data = await request('/ledgers', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    })
    console.log('创建账本成功:', data)
    return data
  } catch (error) {
    console.error('创建账本失败:', error)
    throw error
  }
}

export async function updateLedger(ledgerId, data) {
  console.log('开始更新账本:', ledgerId, data)
  try {
    const result = await request(`/ledgers/${ledgerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    console.log('更新账本成功:', result)
    return result
  } catch (error) {
    console.error('更新账本失败:', error)
    throw error
  }
}

export async function deleteLedger(ledgerId) {
  console.log('开始删除账本:', ledgerId)
  try {
    const result = await request(`/ledgers/${ledgerId}`, {
      method: 'DELETE',
    })
    console.log('删除账本成功:', result)
    return result
  } catch (error) {
    console.error('删除账本失败:', error)
    throw error
  }
}

// ─── 持仓 ─────────────────────────────────────────────────────
export async function loadHoldings(ledgerId = null) {
  console.log('开始加载持仓数据, ledgerId:', ledgerId)
  try {
    const url = ledgerId ? `/holdings?ledger_id=${ledgerId}` : '/holdings'
    const data = await request(url)
    console.log('加载持仓数据成功:', data)
    return data
  } catch (error) {
    console.error('加载持仓数据失败:', error)
    throw error
  }
}

export async function saveHoldings(holdings, ledgerId) {
  console.log('开始保存持仓数据，持仓数量:', holdings.length, 'ledgerId:', ledgerId)
  try {
    const data = holdings.map(h => ({
      market: h.market,
      code: h.code,
      name: h.name,
      sector: h.sector || '',
      ledger_id: ledgerId,
      trades: (h.trades || []).map(t => ({
        date: t.date,
        qty: t.qty,
        price: t.price,
        note: t.note || '',
      })),
    }))
    console.log('转换后的持仓数据:', data)
    const result = await request('/holdings/bulk', {
      method: 'PUT',
      body: JSON.stringify({ ledger_id: ledgerId, holdings: data }),
    })
    console.log('保存持仓数据成功:', result)
    return result.holdings || []
  } catch (error) {
    console.error('保存持仓数据失败:', error)
    throw error
  }
}

export async function deleteHolding(market, code, ledgerId) {
  const url = ledgerId 
    ? `/holdings/${market}/${code}?ledger_id=${ledgerId}` 
    : `/holdings/${market}/${code}`
  return request(url, { method: 'DELETE' })
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
