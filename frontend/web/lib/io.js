/**
 * io.js — 导入导出模块
 *
 * 支持 JSON / CSV / PDF 三种格式
 */

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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
          if (!h.id || !h.market || !h.code || !h.trades || !Array.isArray(h.trades)) {
            reject(new Error(`Invalid holding: missing required fields (id, market, code, trades)`))
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
export async function exportPDF() {
  const element = document.querySelector('.app-root')
  if (!element) {
    throw new Error('无法找到页面元素')
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#f9f7f3',
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const doc = new jsPDF('p', 'mm', 'a4')
    let heightLeft = imgHeight
    let position = 0

    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      doc.addPage()
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const date = new Date().toISOString().slice(0, 10)
    doc.save(`investment-ledger-${date}.pdf`)
  } catch (error) {
    console.error('PDF导出失败:', error)
    throw new Error('PDF导出失败: ' + error.message)
  }
}
