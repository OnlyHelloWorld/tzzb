import { defineStore } from 'pinia'
import * as api from '../lib/api.js'
import { fetchQuotes, fetchFxRates } from '../lib/quoteApi.js'
import { avgCost, totalQty, toCNY } from '../composables/helpers.js'

export const useAppStore = defineStore('app', {
  state: () => ({
    // 账本相关
    ledgers: [],
    ledgerSummaries: [],
    currentLedger: null,
    allLedgersHoldings: [],
    
    // 持仓相关
    holdings: [],
    prices: {},
    fx: { USD: 7.28, HKD: 0.925 },
    autoRefresh: true,
    
    // 行情相关
    quoteStatus: 'idle',
    quoteError: '',
    lastQuoteTime: '',
    
    // 加载状态
    isLoading: false,
    
    // 导入导出相关
    ioMessage: '',
    ioMessageClass: '',
    
    // 其他
    refreshTimer: null
  }),
  
  getters: {
    // 所有账本的汇总信息
    allLedgersSummary: (state) => {
      const byCcy = { CNY: 0, HKD: 0, USD: 0 }
      const byCcyCost = { CNY: 0, HKD: 0, USD: 0 }
      
      state.allLedgersHoldings.forEach(h => {
        const ccy = h.market === 'A股' ? 'CNY' : h.market === '港股' ? 'HKD' : 'USD'
        const price = state.prices[h.code] || avgCost(h.trades || []) || 0
        const qty = totalQty(h.trades || [])
        const cost = avgCost(h.trades || [])
        const mv = price * qty
        const costBasis = cost * qty
        
        byCcy[ccy] += mv
        byCcyCost[ccy] += costBasis
      })
      
      const totalCNY = toCNY(byCcy.CNY, 'CNY', state.fx) + 
                      toCNY(byCcy.HKD, 'HKD', state.fx) + 
                      toCNY(byCcy.USD, 'USD', state.fx)
      const totalCostCNY = toCNY(byCcyCost.CNY, 'CNY', state.fx) + 
                          toCNY(byCcyCost.HKD, 'HKD', state.fx) + 
                          toCNY(byCcyCost.USD, 'USD', state.fx)
      const pnl = totalCNY - totalCostCNY
      const pct = totalCostCNY > 0 ? pnl / totalCostCNY * 100 : 0
      
      return { byCcy, totalCNY, pnl, pct }
    }
  },
  
  actions: {
    // 加载所有数据
    async loadData() {
      this.isLoading = true
      try {
        // 模拟数据
        const mockLedgers = [
          {
            id: 1,
            name: '测试账本',
            color: '#1a7a4a',
            user_id: 1
          }
        ]
        
        const mockHoldings = []
        
        // 使用模拟数据
        this.ledgers = mockLedgers
        
        // 检查当前账本是否仍然存在
        if (this.currentLedger) {
          const exists = this.ledgers.some(l => l.id === this.currentLedger.id)
          if (!exists) {
            this.currentLedger = null
          }
        }
        
        // 加载所有持仓数据
        this.allLedgersHoldings = mockHoldings
        
        // 为所有持仓设置价格
        for (const h of this.allLedgersHoldings) {
          if (!(h.code in this.prices)) {
            const cost = avgCost(h.trades || [])
            this.prices[h.code] = cost || 0
          }
        }
        
        // 计算所有账本的汇总信息
        await this.calculateAllLedgerSummaries()
        
        // 加载当前账本的持仓数据
        if (this.currentLedger) {
          this.holdings = mockHoldings.filter(h => h.ledger_id === this.currentLedger.id) || []
        } else {
          this.holdings = []
        }
        
        // 为当前账本持仓设置价格
        for (const h of this.holdings) {
          if (!(h.code in this.prices)) {
            const cost = avgCost(h.trades || [])
            this.prices[h.code] = cost || 0
          }
        }
        
        // 刷新行情
        await this.refreshQuotes()
      } catch (err) {
        console.warn('加载数据失败:', err)
        this.ledgers = []
        this.ledgerSummaries = []
        this.allLedgersHoldings = []
        this.holdings = []
        this.currentLedger = null
      } finally {
        this.isLoading = false
      }
    },
    
    // 计算单个账本的汇总信息
    async calculateLedgerSummary(ledger) {
      try {
        // 模拟持仓数据
        const holdings = []
        
        if (!holdings || holdings.length === 0) {
          return { ...ledger, totalCNY: 0, pnl: 0, pct: 0, holdingCount: 0 }
        }

        let totalCostCNY = 0
        let totalMVCNY = 0

        for (const h of holdings) {
          const ccy = h.market === 'A股' ? 'CNY' : h.market === '港股' ? 'HKD' : 'USD'
          const cost = avgCost(h.trades || [])
          const qty = totalQty(h.trades || [])
          const price = this.prices[h.code] || cost || 0
          const costBasis = cost * qty
          const mv = price * qty
          
          totalCostCNY += toCNY(costBasis, ccy, this.fx)
          totalMVCNY += toCNY(mv, ccy, this.fx)
        }

        const pnl = totalMVCNY - totalCostCNY
        const pct = totalCostCNY > 0 ? pnl / totalCostCNY * 100 : 0

        return {
          ...ledger,
          totalCNY: totalMVCNY,
          pnl,
          pct,
          holdingCount: holdings.length
        }
      } catch (err) {
        console.warn(`计算账本 ${ledger.name} 汇总失败:`, err)
        return { ...ledger, totalCNY: 0, pnl: 0, pct: 0, holdingCount: 0 }
      }
    },
    
    // 计算所有账本的汇总信息
    async calculateAllLedgerSummaries() {
      const summaries = []
      for (const ledger of this.ledgers) {
        const summary = await this.calculateLedgerSummary(ledger)
        summaries.push(summary)
      }
      this.ledgerSummaries = summaries
    },
    
    // 刷新行情
    async refreshQuotes() {
      this.quoteStatus = 'loading'
      this.quoteError = ''

      try {
        // 准备要获取行情的持仓数据
        let holdingsForQuotes = []
        if (this.holdings.length > 0) {
          holdingsForQuotes = this.holdings
        } else if (this.allLedgersHoldings.length > 0) {
          holdingsForQuotes = this.allLedgersHoldings
        }

        // 并行获取汇率和行情
        const [fxResult, quoteResult] = await Promise.allSettled([
          fetchFxRates(),
          holdingsForQuotes.length > 0 ? fetchQuotes(holdingsForQuotes) : Promise.resolve({ prices: {}, errors: [] })
        ])

        // 更新汇率
        if (fxResult.status === 'fulfilled' && fxResult.value) {
          this.fx.USD = Math.round(fxResult.value.USD * 100) / 100
          this.fx.HKD = Math.round(fxResult.value.HKD * 100) / 100
          // 保存汇率设置
          await api.saveSettings({ 
            fx_usd: this.fx.USD, 
            fx_hkd: this.fx.HKD, 
            auto_refresh: this.autoRefresh 
          })
        }

        // 更新行情
        const quoteData = quoteResult.status === 'fulfilled' ? quoteResult.value : { prices: {}, errors: [] }
        if (quoteData.prices && Object.keys(quoteData.prices).length > 0) {
          Object.assign(this.prices, quoteData.prices)
        }

        // 收集错误信息
        const failedList = (quoteData.errors || []).map(e => `${e.name || e.code}(${e.market})`)
        if (failedList.length > 0) {
          this.quoteError = `以下标的行情获取失败：${failedList.join('、')}`
        }

        const hasFx = fxResult.status === 'fulfilled' && fxResult.value
        const hasQuotes = holdingsForQuotes.length === 0 || (quoteData.prices && Object.keys(quoteData.prices).length > 0)

        if (hasFx || hasQuotes) {
          this.quoteStatus = (holdingsForQuotes.length > 0 && failedList.length === holdingsForQuotes.length) ? 'error' : 'ok'
          const now = new Date()
          this.lastQuoteTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
          
          // 重新计算所有账本的汇总信息
          await this.calculateAllLedgerSummaries()
        } else {
          this.quoteStatus = 'error'
          this.quoteError = '所有数据源均无有效数据'
        }
      } catch (err) {
        this.quoteStatus = 'error'
        this.quoteError = err.message
        console.warn('[App] refresh failed:', err)
      }
    },
    
    // 设置当前账本
    setCurrentLedger(ledger) {
      this.currentLedger = ledger
    },
    
    // 保存持仓数据
    async saveHoldings(holdingsData) {
      if (!this.currentLedger) return
      try {
        const savedHoldings = await api.saveHoldings(holdingsData, this.currentLedger.id)
        this.holdings = savedHoldings || []
        // 重新计算账本汇总
        await this.calculateAllLedgerSummaries()
        return savedHoldings
      } catch (err) {
        console.warn('保存持仓失败:', err)
        throw err
      }
    },
    
    // 显示消息
    showMessage(message, isError = false) {
      this.ioMessage = message
      this.ioMessageClass = isError ? 'error' : 'success'
      setTimeout(() => { this.ioMessage = '' }, 3000)
    }
  }
})