/**
 * io.js — 导入导出模块
 *
 * 支持 CSV / PDF 两种格式
 * 支持单个账本和多个账本导入导出
 */
import jsPDF from 'jspdf'
import { fetchQuote } from './quoteApi.js'

// ─── 常量定义 ───────────────────────────────────────────────────
const SYM = { CNY: '¥', HKD: 'HK$', USD: '$' }
const MARKET_CCY = { 'A股': 'CNY', '港股': 'HKD', '美股': 'USD' }
const PDF_FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Heiti SC", sans-serif'

// ─── 工具函数 ───────────────────────────────────────────────────
function escapeCSV(value) {
  const str = String(value || '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadText(text, filename, mimeType = 'text/csv') {
  const blob = new Blob([text], { type: mimeType })
  downloadBlob(blob, filename)
}

function toHoldingRow(h, prices, fx) {
  const ccy = MARKET_CCY[h.market] || 'CNY'
  const price = prices?.[h.code] || 0
  const qty = h.trades.reduce((s, t) => s + t.qty, 0)
  const totalCost = h.trades.reduce((s, t) => s + t.qty * t.price, 0)
  const avgCost = qty > 0 ? totalCost / qty : 0
  const mv = price * qty
  const costBasis = avgCost * qty
  const pnl = mv - costBasis
  const pnlPct = costBasis > 0 ? (pnl / costBasis * 100) : 0
  const mvCNY = ccy === 'CNY' ? mv : mv * (fx?.[ccy] || 1)
  const pnlCNY = ccy === 'CNY' ? pnl : pnl * (fx?.[ccy] || 1)

  return { ccy, price, qty, avgCost, mv, pnl, pnlPct, mvCNY, pnlCNY }
}

// ─── CSV 导出功能 ───────────────────────────────────────────────────

/**
 * 导出单个账本 CSV
 * @param {Array} holdings - 持仓数据
 * @param {Object} prices - 价格数据
 * @param {Object} fx - 汇率数据
 */
export function exportCSV(holdings, prices, fx) {
  const headers = ['Market', 'Code', 'Name', 'Qty', 'AvgCost', 'Price', 'MV', 'PnL', 'PnL%', 'MV(CNY)']
  const rows = []

  for (const h of holdings) {
    const { ccy, price, qty, avgCost, mv, pnl, pnlPct, mvCNY } = toHoldingRow(h, prices, fx)

    rows.push([
      h.market,
      h.code,
      h.name || '',
      qty,
      avgCost.toFixed(2),
      price.toFixed(2),
      mv.toFixed(2),
      pnl.toFixed(2),
      pnlPct.toFixed(2) + '%',
      mvCNY.toFixed(2),
    ])
  }

  // BOM for Excel UTF-8 compatibility
  const bom = '\uFEFF'
  const csv = bom + [headers.map(escapeCSV).join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  downloadText(csv, `investment-ledger-${date}.csv`, 'text/csv;charset=utf-8')
}

/**
 * 导出所有账本 CSV（包含账本信息）
 * @param {Array} ledgers - 账本列表
 * @param {Object|Array} ledgerHoldings - 账本持仓数据
 * @param {Object} prices - 价格数据
 * @param {Object} fx - 汇率数据
 */
export function exportAllLedgersCSV(ledgers, ledgerHoldings, prices, fx) {
  const headers = ['LedgerId', 'LedgerName', 'LedgerColor', 'Market', 'Code', 'Name', 'Qty', 'AvgCost', 'Price', 'MV', 'PnL', 'PnL%', 'MV(CNY)']
  const rows = []

  for (const ledger of ledgers) {
    // 处理 ledgerHoldings 是数组的情况
    const holdings = Array.isArray(ledgerHoldings) ? 
      ledgerHoldings.filter(h => h.ledger_id === ledger.id) : 
      (ledgerHoldings[ledger.id] || [])
    
    for (const h of holdings) {
      const { ccy, price, qty, avgCost, mv, pnl, pnlPct, mvCNY } = toHoldingRow(h, prices, fx)

      rows.push([
        ledger.id,
        ledger.name,
        ledger.color,
        h.market,
        h.code,
        h.name || '',
        qty,
        avgCost.toFixed(2),
        price.toFixed(2),
        mv.toFixed(2),
        pnl.toFixed(2),
        pnlPct.toFixed(2) + '%',
        mvCNY.toFixed(2),
      ])
    }
    
    // 如果账本没有持仓，也添加一行标记
    if (holdings.length === 0) {
      rows.push([
        ledger.id,
        ledger.name,
        ledger.color,
        '',
        '',
        '(空账本)',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ])
    }
  }

  // BOM for Excel UTF-8 compatibility
  const bom = '\uFEFF'
  const csv = bom + [headers.map(escapeCSV).join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  downloadText(csv, `all-ledgers-${date}.csv`, 'text/csv;charset=utf-8')
}

// ─── CSV 导入功能 ───────────────────────────────────────────────────

/**
 * 解析 CSV 行（支持带引号的字段）
 * @param {string} line - CSV 行
 * @returns {Array} 解析后的字段数组
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  let quoteCount = 0
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
      quoteCount++
    } else if (char === ',' && !inQuotes) {
      // 只有不在引号内的逗号才是分隔符
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // 处理最后一个字段
  result.push(current.trim())
  
  // 移除字段中的双引号（如果有）
  return result.map(field => {
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.substring(1, field.length - 1).replace(/""/g, '"')
    }
    return field
  })
}

/**
 * 通过股票代码获取股票名称
 * @param {Object} result - 解析结果
 * @returns {Promise<Object>} 增强后的结果
 */
async function enrichHoldingsWithNames(result) {
  if (result.isMultiLedger) {
    // 处理多账本格式
    for (const ledgerId in result.ledgerHoldings) {
      const holdings = result.ledgerHoldings[ledgerId]
      for (const holding of holdings) {
        if (!holding.name || holding.name.trim() === '') {
          try {
            const quote = await fetchQuote(holding.market, holding.code)
            if (quote.name) {
              holding.name = quote.name
            }
          } catch (err) {
            console.warn(`获取股票名称失败: ${holding.market}:${holding.code}`, err.message)
          }
        }
      }
    }
  } else {
    // 处理单账本格式
    for (const holding of result.holdings) {
      if (!holding.name || holding.name.trim() === '') {
        try {
          const quote = await fetchQuote(holding.market, holding.code)
          if (quote.name) {
            holding.name = quote.name
          }
        } catch (err) {
          console.warn(`获取股票名称失败: ${holding.market}:${holding.code}`, err.message)
        }
      }
    }
  }
  return result
}

/**
 * 解析多账本 CSV
 * @param {Array} lines - CSV 行数组
 * @param {Array} headers - 表头数组
 * @returns {Object} 解析结果
 */
function parseMultiLedgerCSV(lines, headers) {
  const ledgers = []
  const ledgerHoldings = {}
  const ledgerIdMap = {} // 用于重新生成 ID 映射
  
  const ledgerIdIdx = headers.indexOf('LedgerId')
  const ledgerNameIdx = headers.indexOf('LedgerName')
  const ledgerColorIdx = headers.indexOf('LedgerColor')
  const marketIdx = headers.indexOf('Market')
  const codeIdx = headers.indexOf('Code')
  const nameIdx = headers.indexOf('Name')
  const qtyIdx = headers.indexOf('Qty')
  const avgCostIdx = headers.indexOf('AvgCost')

  let currentLedgerId = null
  let holdingId = 1000
  let tradeId = 10000

  for (const line of lines) {
    const values = parseCSVLine(line)
    
    const originalLedgerId = values[ledgerIdIdx]
    const ledgerName = values[ledgerNameIdx]
    const ledgerColor = values[ledgerColorIdx] || '#1a1814'
    
    // 如果是新账本
    if (!ledgerIdMap[originalLedgerId]) {
      const newLedgerId = Date.now() + Math.random().toString(36).substr(2, 9)
      ledgerIdMap[originalLedgerId] = newLedgerId
      
      ledgers.push({
        id: newLedgerId,
        name: ledgerName,
        color: ledgerColor,
      })
      
      ledgerHoldings[newLedgerId] = []
    }
    
    currentLedgerId = ledgerIdMap[originalLedgerId]
    
    // 检查是否是空账本标记
    if (values[nameIdx] === '(空账本)') {
      continue
    }
    
    // 解析持仓数据
    const market = values[marketIdx]
    const code = values[codeIdx]
    const name = values[nameIdx]
    const qty = parseFloat(values[qtyIdx]) || 0
    const avgCost = parseFloat(values[avgCostIdx]) || 0
    
    if (market && code && qty > 0) {
      // 创建持仓
      const holding = {
        id: holdingId++,
        market,
        code,
        name,
        sector: '',
        trades: [
          {
            id: tradeId++,
            date: new Date().toISOString().slice(0, 10),
            qty,
            price: avgCost,
          }
        ]
      }
      
      ledgerHoldings[currentLedgerId].push(holding)
    }
  }
  
  return {
    isMultiLedger: true,
    ledgers,
    ledgerHoldings,
  }
}

/**
 * 解析单账本 CSV
 * @param {Array} lines - CSV 行数组
 * @param {Array} headers - 表头数组
 * @returns {Object} 解析结果
 */
function parseSingleLedgerCSV(lines, headers) {
  const holdings = []
  let holdingId = 1000
  let tradeId = 10000

  const marketIdx = headers.indexOf('Market')
  const codeIdx = headers.indexOf('Code')
  const nameIdx = headers.indexOf('Name')
  const qtyIdx = headers.indexOf('Qty')
  const avgCostIdx = headers.indexOf('AvgCost')

  for (const line of lines) {
    const values = parseCSVLine(line)
    
    const market = values[marketIdx]
    const code = values[codeIdx]
    const name = values[nameIdx]
    const qty = parseFloat(values[qtyIdx]) || 0
    const avgCost = parseFloat(values[avgCostIdx]) || 0
    
    if (market && code && qty > 0) {
      const holding = {
        id: holdingId++,
        market,
        code,
        name,
        sector: '',
        trades: [
          {
            id: tradeId++,
            date: new Date().toISOString().slice(0, 10),
            qty,
            price: avgCost,
          }
        ]
      }
      
      holdings.push(holding)
    }
  }
  
  return {
    isMultiLedger: false,
    holdings,
  }
}

/**
 * 导入 CSV（支持单个账本或所有账本）
 * @param {File} file - CSV 文件
 * @returns {Promise<Object>} 导入结果
 */
export function importCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target.result
        // 移除 BOM
        const content = text.startsWith('\uFEFF') ? text.slice(1) : text
        
        const lines = content.split('\n').filter(line => line.trim())
        if (lines.length < 1) {
          reject(new Error('CSV 文件为空'))
          return
        }

        const headers = parseCSVLine(lines[0])
        
        // 检查是否是多账本格式
        const isMultiLedger = headers.includes('LedgerId') && headers.includes('LedgerName')
        
        if (isMultiLedger) {
          // 多账本格式
          let result = parseMultiLedgerCSV(lines.slice(1), headers)
          // 尝试通过股票代码获取股票名称
          result = await enrichHoldingsWithNames(result)
          resolve(result)
        } else {
          // 单账本格式
          let result = parseSingleLedgerCSV(lines.slice(1), headers)
          // 尝试通过股票代码获取股票名称
          result = await enrichHoldingsWithNames(result)
          resolve(result)
        }
      } catch (err) {
        reject(new Error('CSV 解析错误: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取错误'))
    reader.readAsText(file)
  })
}

// ─── PDF 导出功能 ───────────────────────────────────────────────────

/**
 * 渲染 PDF 页面
 * @param {Object} options - 渲染选项
 * @returns {string} 页面数据 URL
 */
function renderPdfPage({ title, subtitle, summary = [], headers = [], rows = [], landscape = false }) {
  const canvas = document.createElement('canvas')
  canvas.width = landscape ? 1754 : 1240
  canvas.height = landscape ? 1240 : 1754
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#1a1814'
  ctx.font = `700 ${landscape ? 38 : 42}px ${PDF_FONT_FAMILY}`
  ctx.fillText(title, 60, 80)
  ctx.font = `400 ${landscape ? 22 : 24}px ${PDF_FONT_FAMILY}`
  ctx.fillStyle = '#666'
  ctx.fillText(subtitle, 60, 120)

  let y = 170
  summary.forEach((line) => {
    ctx.fillStyle = '#1a1814'
    ctx.font = `600 26px ${PDF_FONT_FAMILY}`
    ctx.fillText(line, 60, y)
    y += 42
  })
  y += 10

  const rowHeight = 38
  const tableWidth = canvas.width - 120
  const colWidth = tableWidth / Math.max(headers.length, 1)
  ctx.fillStyle = '#1a1814'
  ctx.fillRect(60, y, tableWidth, rowHeight)
  ctx.fillStyle = '#f9f7f3'
  ctx.font = `600 20px ${PDF_FONT_FAMILY}`
  headers.forEach((header, index) => {
    ctx.fillText(header, 66 + index * colWidth, y + 25)
  })
  y += rowHeight

  ctx.font = `400 18px ${PDF_FONT_FAMILY}`
  const renderedRows = []
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    if (y + rowHeight > canvas.height - 60) break
    if (rowIndex % 2 === 0) {
      ctx.fillStyle = '#f9f7f3'
      ctx.fillRect(60, y, tableWidth, rowHeight)
    }
    row.forEach((cell, index) => {
      const text = String(cell ?? '')
      const truncated = text.length > 18 ? `${text.slice(0, 17)}…` : text
      ctx.fillStyle = '#2a2a2a'
      if (index === 7 && text.startsWith('+')) ctx.fillStyle = '#1a7a4a'
      if (index === 7 && text.startsWith('-')) ctx.fillStyle = '#c0392b'
      ctx.fillText(truncated, 66 + index * colWidth, y + 25)
    })
    renderedRows.push(row)
    y += rowHeight
  }
  return { dataUrl: canvas.toDataURL('image/png'), renderedRows: renderedRows.length }
}

/**
 * 导出单个账本 PDF
 * @param {Array} holdings - 持仓数据
 * @param {Object} prices - 价格数据
 * @param {Object} fx - 汇率数据
 */
export async function exportPDF(holdings = [], prices = {}, fx = { USD: 7.28, HKD: 0.925 }) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const now = new Date()
  const rows = holdings.map((h) => ({ h, data: toHoldingRow(h, prices, fx) }))
  let totalMV = 0
  let totalPnL = 0
  rows.forEach((item) => {
    totalMV += item.data.mvCNY
    totalPnL += item.data.pnlCNY
  })

  const summary = [`总市值(CNY): ${SYM.CNY}${totalMV.toFixed(2)}`, `总盈亏(CNY): ${totalPnL >= 0 ? '+' : ''}${SYM.CNY}${totalPnL.toFixed(2)}`]
  const headers = ['市场', '代码', '名称', '持仓', '成本均价', '现价', '市值(CNY)', '盈亏(CNY)', '盈亏%']
  const dataRows = rows.map(({ h, data }) => ([
    h.market, h.code, h.name || '', data.qty.toFixed(0),
    `${SYM[data.ccy]}${data.avgCost.toFixed(2)}`,
    `${SYM[data.ccy]}${data.price.toFixed(2)}`,
    `${SYM.CNY}${data.mvCNY.toFixed(2)}`,
    `${data.pnlCNY >= 0 ? '+' : ''}${SYM.CNY}${data.pnlCNY.toFixed(2)}`,
    `${data.pnlPct.toFixed(2)}%`,
  ]))
  
  // 分页处理
  const pageHeight = 1754 // 画布高度
  const rowHeight = 38 // 行高
  const startY = 170 + summary.length * 42 + 10 // 表格开始Y坐标
  const maxRowsPerPage = Math.floor((pageHeight - startY - 60) / rowHeight) // 每页最大行数
  
  let currentPage = 0
  let currentRow = 0
  
  while (currentRow < dataRows.length) {
    // 计算当前页的行数
    const endRow = Math.min(currentRow + maxRowsPerPage, dataRows.length)
    const pageRows = dataRows.slice(currentRow, endRow)
    
    // 渲染当前页
    const result = renderPdfPage({
      title: '投资账本 - 持仓报告',
      subtitle: `导出时间 ${now.toLocaleString('zh-CN')} ｜ 持仓数量 ${holdings.length} ｜ 第 ${currentPage + 1} 页`,
      summary: currentPage === 0 ? summary : [], // 只在第一页显示汇总信息
      headers: headers,
      rows: pageRows,
      landscape: false,
    })
    
    // 添加页面到PDF
    if (currentPage > 0) {
      doc.addPage('p', 'a4')
    }
    doc.addImage(result.dataUrl, 'PNG', 0, 0, 210, 297)
    
    // 更新当前行和页码
    currentRow += result.renderedRows
    currentPage++
  }

  const date = now.toISOString().slice(0, 10)
  doc.save(`tzzb-${date}.pdf`)
}

/**
 * 导出所有账本 PDF
 * @param {Array} ledgers - 账本列表
 * @param {Object|Array} ledgerHoldings - 账本持仓数据
 * @param {Object} prices - 价格数据
 * @param {Object} fx - 汇率数据
 */
export async function exportAllLedgersPDF(ledgers = [], ledgerHoldings = {}, prices = {}, fx = { USD: 7.28, HKD: 0.925 }) {
  const allRows = []
  let totalMV = 0
  let totalPnL = 0
  for (const ledger of ledgers) {
    // 处理 ledgerHoldings 是数组的情况
    const holdings = Array.isArray(ledgerHoldings) ? 
      ledgerHoldings.filter(h => h.ledger_id === ledger.id) : 
      (ledgerHoldings[ledger.id] || [])
    allRows.push([`【账本】${ledger.name}`, '', '', '', '', '', '', '', ''])
    if (holdings.length === 0) {
      allRows.push(['', '-', '-', '(空账本)', '-', '-', '-', '-', '-'])
      allRows.push(['', '小计', '-', '-', '-', '-', `${SYM.CNY}0.00`, `${SYM.CNY}0.00`, '0.00%'])
      continue
    }
    let ledgerMV = 0
    let ledgerPnL = 0
    holdings.forEach((h) => {
      const data = toHoldingRow(h, prices, fx)
      ledgerMV += data.mvCNY
      ledgerPnL += data.pnlCNY
      allRows.push([
        '',
        h.market,
        h.code,
        h.name || '',
        data.qty.toFixed(0),
        `${SYM[data.ccy]}${data.avgCost.toFixed(2)}`,
        `${SYM.CNY}${data.mvCNY.toFixed(2)}`,
        `${data.pnlCNY >= 0 ? '+' : ''}${SYM.CNY}${data.pnlCNY.toFixed(2)}`,
        `${data.pnlPct.toFixed(2)}%`,
      ])
    })
    totalMV += ledgerMV
    totalPnL += ledgerPnL
    allRows.push([
      '',
      '小计',
      '-',
      '-',
      '-',
      '-',
      `${SYM.CNY}${ledgerMV.toFixed(2)}`,
      `${ledgerPnL >= 0 ? '+' : ''}${SYM.CNY}${ledgerPnL.toFixed(2)}`,
      '-',
    ])
  }

  const doc = new jsPDF('l', 'mm', 'a4')
  const now = new Date()
  const summary = [`总市值(CNY): ${SYM.CNY}${totalMV.toFixed(2)}`, `总盈亏(CNY): ${totalPnL >= 0 ? '+' : ''}${SYM.CNY}${totalPnL.toFixed(2)}`]
  const headers = ['账本', '市场', '代码', '名称', '持仓', '成本均价', '市值(CNY)', '盈亏(CNY)', '盈亏%']
  
  // 分页处理
  const pageHeight = 1754 // 画布高度
  const rowHeight = 38 // 行高
  const startY = 170 + summary.length * 42 + 10 // 表格开始Y坐标
  const maxRowsPerPage = Math.floor((pageHeight - startY - 60) / rowHeight) // 每页最大行数
  
  let currentPage = 0
  let currentRow = 0
  
  while (currentRow < allRows.length) {
    // 计算当前页的行数
    const endRow = Math.min(currentRow + maxRowsPerPage, allRows.length)
    const pageRows = allRows.slice(currentRow, endRow)
    
    // 渲染当前页
    const result = renderPdfPage({
      title: '投资账本 - 所有账本汇总报告',
      subtitle: `导出时间 ${now.toLocaleString('zh-CN')} ｜ 第 ${currentPage + 1} 页`,
      summary: currentPage === 0 ? summary : [], // 只在第一页显示汇总信息
      headers: headers,
      rows: pageRows,
      landscape: true,
    })
    
    // 添加页面到PDF
    if (currentPage > 0) {
      doc.addPage('l', 'a4')
    }
    doc.addImage(result.dataUrl, 'PNG', 0, 0, 297, 210)
    
    // 更新当前行和页码
    currentRow += result.renderedRows
    currentPage++
  }

  doc.save(`all-ledgers-${now.toISOString().slice(0, 10)}.pdf`)
}
