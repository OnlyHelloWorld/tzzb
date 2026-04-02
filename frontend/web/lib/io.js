/**
 * io.js — 导入导出模块
 *
 * 支持 JSON / CSV / PDF 三种格式
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

function downloadText(text, filename, mimeType = 'application/json') {
  const blob = new Blob([text], { type: mimeType })
  downloadBlob(blob, filename)
}

const SYM = { CNY: '¥', HKD: 'HK$', USD: '$' }
const MARKET_CCY = { 'A股': 'CNY', '港股': 'HKD', '美股': 'USD' }

// ─── 导出 JSON ──────────────────────────────────────────────────
export function exportJSON(holdings, settings) {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    holdings,
    settings,
  }
  const json = JSON.stringify(data, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  downloadText(json, `investment-ledger-${date}.json`, 'application/json')
}

// ─── 导入 JSON ──────────────────────────────────────────────────
export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        // 验证格式
        if (!data.holdings || !Array.isArray(data.holdings)) {
          reject(new Error('Invalid format: missing holdings array'))
          return
        }
        // 验证每个 holding 的基本结构
        for (const h of data.holdings) {
          if (!h.market || !h.code || !h.trades || !Array.isArray(h.trades)) {
            reject(new Error(`Invalid holding: missing required fields (market, code, trades)`))
            return
          }
        }
        const settings = data.settings || { fx: { USD: 7.28, HKD: 0.925 }, autoRefresh: true }
        resolve({ holdings: data.holdings, settings })
      } catch (err) {
        reject(new Error('JSON parse error: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsText(file)
  })
}

// ─── 导出 CSV ───────────────────────────────────────────────────
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


// ─── 导出 PDF ───────────────────────────────────────────────────
export async function exportPDF(holdings = [], prices = {}, fx = { USD: 7.28, HKD: 0.925 }) {

  // 创建PDF文档
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // 添加标题
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('投资账本', pageWidth / 2, 20, { align: 'center' })
  
  // 添加导出日期
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`导出日期: ${new Date().toLocaleString('zh-CN')}`, pageWidth / 2, 28, { align: 'center' })
  
  // 准备表格数据
  const headers = ['市场', '代码', '名称', '持仓量', '成本均价', '现价', '市值', '盈亏', '盈亏%']
  const rows = []
  
  let totalMV = 0
  let totalPnL = 0
  
  for (const h of holdings) {
    const ccy = MARKET_CCY[h.market] || 'CNY'
    const price = prices[h.code] || 0
    const qty = h.trades.reduce((s, t) => s + t.qty, 0)
    const totalCost = h.trades.reduce((s, t) => s + t.qty * t.price, 0)
    const avgCost = qty > 0 ? totalCost / qty : 0
    const mv = price * qty
    const costBasis = avgCost * qty
    const pnl = mv - costBasis
    const pnlPct = costBasis > 0 ? (pnl / costBasis * 100) : 0
    
    // 转换为人民币
    const mvCNY = ccy === 'CNY' ? mv : mv * (fx[ccy] || 1)
    const pnlCNY = ccy === 'CNY' ? pnl : pnl * (fx[ccy] || 1)
    
    totalMV += mvCNY
    totalPnL += pnlCNY
    
    rows.push([
      h.market,
      h.code,
      h.name || '',
      qty.toFixed(0),
      `${SYM[ccy]}${avgCost.toFixed(2)}`,
      `${SYM[ccy]}${price.toFixed(2)}`,
      `¥${mvCNY.toFixed(2)}`,
      `¥${pnlCNY.toFixed(2)}`,
      `${pnlPct.toFixed(2)}%`
    ])
  }
  
  // 添加表格
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    margin: {
      top: 35,
      left: 10,
      right: 10
    },
    styles: {
      font: 'helvetica',
      fontSize: 10
    },
    headStyles: {
      fillColor: [26, 24, 20],
      textColor: [249, 247, 243],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [249, 247, 243]
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 40 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
      8: { cellWidth: 25, halign: 'right' }
    }
  })
  
  // 添加总计
  const finalY = doc.lastAutoTable.finalY
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`总计市值: ¥${totalMV.toFixed(2)}`, 10, finalY + 15)
  doc.text(`总计盈亏: ¥${totalPnL.toFixed(2)}`, 10, finalY + 22)
  
  // 保存PDF
  const date = new Date().toISOString().slice(0, 10)
  doc.save(`tzzb-${date}.pdf`)
}
