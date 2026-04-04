// 计算平均成本
export const avgCost = (trades) => {
  const totQty = trades.reduce((s, t) => s + t.qty, 0)
  return totQty > 0 ? trades.reduce((s, t) => s + t.qty * t.price, 0) / totQty : 0
}

// 计算总数量
export const totalQty = (trades) => trades.reduce((s, t) => s + t.qty, 0)

// 格式化数字
export const fmt = (n, d = 2) => Number(n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })

// 转换为人民币
export const toCNY = (val, ccy, fx) => ccy === 'CNY' ? val : val * (fx[ccy] || 1)

// 获取今天的日期
export const today = () => new Date().toISOString().slice(0, 10)

// 常量定义
export const SYM = { CNY: '¥', HKD: 'HK$', USD: '$' }
export const MARKET_CCY = { 'A股': 'CNY', '港股': 'HKD', '美股': 'USD' }
export const MARKET_COLOR = { 'A股': '#c0392b', '港股': '#1a6fa8', '美股': '#1a7a4a' }
export const MARKET_BG = { 'A股': '#fdf0ef', '港股': '#eef4fb', '美股': '#edf7f1' }
export const TABS = ['全部', 'A股', '港股', '美股']
export const MARKET_OPTIONS = ['A股', '港股', '美股']
export const LEDGER_PATH_PREFIX = '#/ledger/'