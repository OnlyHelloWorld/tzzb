/**
 * io.js — 导入导出模块
 *
 * 支持 CSV / PDF 两种格式
 * 支持单个账本和多个账本导入导出
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── 工具函数 ───────────────────────────────────────────────────
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

const SYM = { CNY: '¥', HKD: 'HK$', USD: '$' }
const MARKET_CCY = { 'A股': 'CNY', '港股': 'HKD', '美股': 'USD' }

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

// ─── 导出单个账本 CSV ───────────────────────────────────────────────────
export function exportCSV(holdings, prices, fx) {
  const headers = ['Market', 'Code', 'Name', 'Qty', 'AvgCost', 'Price', 'MV', 'PnL', 'PnL%', 'MV(CNY)']
  const rows = []

  for (const h of holdings) {
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
  const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  downloadText(csv, `investment-ledger-${date}.csv`, 'text/csv;charset=utf-8')
}

// ─── 导出所有账本 CSV（包含账本信息）────────────────────────────────────────
export function exportAllLedgersCSV(ledgers, ledgerHoldings, prices, fx) {
  const headers = ['LedgerId', 'LedgerName', 'LedgerColor', 'Market', 'Code', 'Name', 'Qty', 'AvgCost', 'Price', 'MV', 'PnL', 'PnL%', 'MV(CNY)']
  const rows = []

  for (const ledger of ledgers) {
    const holdings = ledgerHoldings[ledger.id] || []
    
    for (const h of holdings) {
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
  const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  downloadText(csv, `all-ledgers-${date}.csv`, 'text/csv;charset=utf-8')
}

// ─── 导入 CSV（支持单个账本或所有账本）──────────────────────────────────────
export function importCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        // 移除 BOM
        const content = text.startsWith('\uFEFF') ? text.slice(1) : text
        
        const lines = content.split('\n').filter(line => line.trim())
        if (lines.length < 1) {
          reject(new Error('CSV 文件为空'))
          return
        }

        const headers = lines[0].split(',').map(h => h.trim())
        
        // 检查是否是多账本格式
        const isMultiLedger = headers.includes('LedgerId') && headers.includes('LedgerName')
        
        if (isMultiLedger) {
          // 多账本格式
          const result = parseMultiLedgerCSV(lines.slice(1), headers)
          resolve(result)
        } else {
          // 单账本格式
          const result = parseSingleLedgerCSV(lines.slice(1), headers)
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

// 解析多账本 CSV
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
    const values = line.split(',').map(v => v.trim())
    
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

// 解析单账本 CSV
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
    const values = line.split(',').map(v => v.trim())
    
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

// ─── 导出 PDF ───────────────────────────────────────────────────
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

  doc.setFillColor(26, 24, 20)
  doc.rect(0, 0, 210, 34, 'F')
  doc.setTextColor(249, 247, 243)
  doc.setFontSize(18)
  doc.text('投资账本 - 持仓报告', 14, 15)
  doc.setFontSize(10)
  doc.text(`导出时间 ${now.toLocaleString('zh-CN')}`, 14, 23)
  doc.text(`持仓数量 ${holdings.length}`, 14, 29)

  doc.setTextColor(26, 24, 20)
  doc.setDrawColor(228, 223, 214)
  doc.setFillColor(249, 247, 243)
  doc.roundedRect(14, 40, 88, 18, 2, 2, 'FD')
  doc.roundedRect(108, 40, 88, 18, 2, 2, 'FD')
  doc.setFontSize(10)
  doc.text('总市值 (CNY)', 18, 47)
  doc.text('总盈亏 (CNY)', 112, 47)
  doc.setFontSize(12)
  doc.text(`${SYM.CNY}${totalMV.toFixed(2)}`, 18, 54)
  doc.setTextColor(totalPnL >= 0 ? 26 : 192, totalPnL >= 0 ? 122 : 57, totalPnL >= 0 ? 74 : 43)
  doc.text(`${totalPnL >= 0 ? '+' : ''}${SYM.CNY}${totalPnL.toFixed(2)}`, 112, 54)

  autoTable(doc, {
    startY: 64,
    head: [['市场', '代码', '名称', '持仓', '成本均价', '现价', '市值(CNY)', '盈亏(CNY)', '盈亏%']],
    body: rows.map(({ h, data }) => ([
      h.market,
      h.code,
      h.name || '',
      data.qty.toFixed(0),
      `${SYM[data.ccy]}${data.avgCost.toFixed(2)}`,
      `${SYM[data.ccy]}${data.price.toFixed(2)}`,
      `${SYM.CNY}${data.mvCNY.toFixed(2)}`,
      `${data.pnlCNY >= 0 ? '+' : ''}${SYM.CNY}${data.pnlCNY.toFixed(2)}`,
      `${data.pnlPct.toFixed(2)}%`,
    ])),
    theme: 'striped',
    headStyles: { fillColor: [26, 24, 20], textColor: [249, 247, 243], fontSize: 10 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [249, 247, 243] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    didParseCell: (hook) => {
      if (hook.section === 'body' && hook.column.index === 7) {
        hook.cell.styles.textColor = hook.cell.text[0]?.startsWith('+') ? [26, 122, 74] : [192, 57, 43]
      }
    },
  })

  const date = now.toISOString().slice(0, 10)
  doc.save(`tzzb-${date}.pdf`)
}

export async function exportAllLedgersPDF(ledgers = [], ledgerHoldings = {}, prices = {}, fx = { USD: 7.28, HKD: 0.925 }) {
  const merged = []
  for (const ledger of ledgers) {
    const holdings = ledgerHoldings[ledger.id] || []
    if (holdings.length === 0) {
      merged.push([ledger.name, '-', '-', '-', '-', '-', '-', '-', '-'])
      continue
    }
    holdings.forEach((h) => {
      const data = toHoldingRow(h, prices, fx)
      merged.push([
        ledger.name,
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
  }

  const doc = new jsPDF('l', 'mm', 'a4')
  const now = new Date()
  doc.setFillColor(26, 24, 20)
  doc.rect(0, 0, 297, 26, 'F')
  doc.setTextColor(249, 247, 243)
  doc.setFontSize(16)
  doc.text('投资账本 - 所有账本汇总报告', 14, 12)
  doc.setFontSize(10)
  doc.text(`导出时间 ${now.toLocaleString('zh-CN')}`, 14, 19)

  autoTable(doc, {
    startY: 32,
    head: [['账本', '市场', '代码', '名称', '持仓', '成本均价', '市值(CNY)', '盈亏(CNY)', '盈亏%']],
    body: merged,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [26, 24, 20], textColor: [249, 247, 243] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 16 },
      2: { cellWidth: 18 },
      3: { cellWidth: 46 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 26 },
      7: { halign: 'right', cellWidth: 26 },
      8: { halign: 'right', cellWidth: 16 },
    },
    didParseCell: (hook) => {
      if (hook.section === 'body' && hook.column.index === 7) {
        const text = hook.cell.text[0] || ''
        if (text !== '-') hook.cell.styles.textColor = text.startsWith('+') ? [26, 122, 74] : [192, 57, 43]
      }
    },
  })

  doc.save(`all-ledgers-${now.toISOString().slice(0, 10)}.pdf`)
}
