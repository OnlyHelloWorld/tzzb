/**
 * io.js — 导入导出模块
 *
 * 支持 JSON / CSV / PDF 三种格式
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  // 创建临时容器
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  container.style.backgroundColor = '#ffffff'
  container.style.padding = '40px'
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  container.style.color = '#1a1814'
  document.body.appendChild(container)

  let totalMV = 0
  let totalPnL = 0

  // 构建 HTML 内容
  let htmlContent = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 28px; margin: 0 0 10px 0; font-weight: 600;">投资账本</h1>
      <p style="color: #666; margin: 0; font-size: 14px;">导出日期: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #1a1814; color: #f9f7f3;">
          <th style="padding: 12px 10px; text-align: left; border: 1px solid #ddd;">市场</th>
          <th style="padding: 12px 10px; text-align: left; border: 1px solid #ddd;">代码</th>
          <th style="padding: 12px 10px; text-align: left; border: 1px solid #ddd;">名称</th>
          <th style="padding: 12px 10px; text-align: right; border: 1px solid #ddd;">持仓量</th>
          <th style="padding: 12px 10px; text-align: right; border: 1px solid #ddd;">成本均价</th>
          <th style="padding: 12px 10px; text-align: right; border: 1px solid #ddd;">现价</th>
          <th style="padding: 12px 10px; text-align: right; border: 1px solid #ddd;">市值</th>
          <th style="padding: 12px 10px; text-align: right; border: 1px solid #ddd;">盈亏</th>
          <th style="padding: 12px 10px; text-align: right; border: 1px solid #ddd;">盈亏%</th>
        </tr>
      </thead>
      <tbody>
  `

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
    
    const mvCNY = ccy === 'CNY' ? mv : mv * (fx[ccy] || 1)
    const pnlCNY = ccy === 'CNY' ? pnl : pnl * (fx[ccy] || 1)
    
    totalMV += mvCNY
    totalPnL += pnlCNY

    const pnlColor = pnl >= 0 ? '#1a7a4a' : '#c0392b'

    htmlContent += `
      <tr style="background-color: #f9f7f3;">
        <td style="padding: 10px; border: 1px solid #ddd;">${h.market}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${h.code}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${h.name || ''}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${qty.toFixed(0)}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${SYM[ccy]}${avgCost.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${SYM[ccy]}${price.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${SYM.CNY}${mvCNY.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; color: ${pnlColor};">${SYM.CNY}${pnlCNY.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; color: ${pnlColor};">${pnlPct.toFixed(2)}%</td>
      </tr>
    `
  }

  htmlContent += `
      </tbody>
    </table>
    <div style="margin-top: 20px; font-size: 16px; font-weight: 600;">
      <p>总计市值: ${SYM.CNY}${totalMV.toFixed(2)}</p>
      <p style="color: ${totalPnL >= 0 ? '#1a7a4a' : '#c0392b'};">总计盈亏: ${SYM.CNY}${totalPnL.toFixed(2)}</p>
    </div>
  `

  container.innerHTML = htmlContent

  try {
    // 使用 html2canvas 捕获
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    // 创建 PDF
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const doc = new jsPDF('p', 'mm', 'a4')
    let heightLeft = imgHeight
    let position = 0

    doc.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      doc.addPage()
      doc.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // 保存 PDF
    const date = new Date().toISOString().slice(0, 10)
    doc.save(`tzzb-${date}.pdf`)
  } finally {
    // 清理临时容器
    document.body.removeChild(container)
  }
}
