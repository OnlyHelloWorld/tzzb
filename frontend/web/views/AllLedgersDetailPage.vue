<template>
  <div class="app-root density-cozy" :style="appThemeStyle">
    <!-- ── Header ── -->
    <div class="header">
      <div class="header-left" @click="goHome()">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="#1a1814"/>
          <path d="M7 9h14M7 14h10M7 19h12" stroke="#f9f7f3" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="21" cy="19" r="3.5" fill="#c4a050"/>
        </svg>
        <span class="app-title">投资账本</span>
      </div>
      <div class="header-right">
        <button class="icon-btn" title="返回首页" aria-label="返回首页" @click="goHome()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7 13V9h2v4H7Z" fill="currentColor"/>
            <path d="M2.5 7.5 8 3l5.5 4.5V13h-3V9H5.5v4h-3V7.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 3.5h3.5M3 3.5 4.5 2M3 3.5 4.5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="main-content">
      <div v-if="showBlessingEffect" :class="['blessing-overlay']">
        <span
          v-for="(char, index) in blessingChars"
          :key="`${blessingEffectKey}-${index}`"
          :class="['blessing-char', 'blessing-char-pop']"
        >{{ char }}</span>
      </div>
      <transition name="page" mode="out-in">
        <!-- All Ledgers Detail Page -->
        <div :key="'all-ledgers-detail-page'" class="all-ledgers-detail-page">
        <!-- 加载中状态 - 骨架屏 -->
        <template v-if="store.isLoading">
        <!-- 汇总卡片骨架屏 -->
        <div class="summary-card all-ledgers-summary-card">
          <div class="skeleton skeleton-summary-top">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-big-num"></div>
          </div>
          <div class="skeleton skeleton-row">
            <div class="skeleton-line skeleton-pnl"></div>
          </div>
          <div class="skeleton skeleton-ccy">
            <div class="skeleton-line skeleton-ccy-item"></div>
            <div class="skeleton-line skeleton-ccy-item"></div>
            <div class="skeleton-line skeleton-ccy-item"></div>
          </div>
          <div class="all-ledgers-bottom-row">
            <div class="io-btns">
              <div class="skeleton-line skeleton-button"></div>
            </div>
            <div class="skeleton-line skeleton-button"></div>
          </div>
        </div>

        <!-- 标的市值排行骨架屏 -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title-row">
              <div class="skeleton-line skeleton-chart-title"></div>
              <div class="sort-tabs">
                <div class="skeleton-line skeleton-sort-tab"></div>
                <div class="skeleton-line skeleton-sort-tab"></div>
              </div>
            </div>
          </div>
          <div class="holdings-ranking">
            <div v-for="i in 3" :key="`skeleton-holding-${i}`" class="holding-ranking-item">
              <div class="holding-ranking-left">
                <div class="ranking-number">{{ i }}</div>
                <div class="holding-info">
                  <div class="holding-name-row">
                    <div class="skeleton-line skeleton-holding-name"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                  </div>
                  <div class="holding-value-row">
                    <div class="skeleton-line skeleton-percentage-tag"></div>
                    <div class="skeleton-line skeleton-holding-value"></div>
                    <div class="skeleton-line skeleton-holding-pnl"></div>
                  </div>
                </div>
              </div>
              <div class="holding-bar">
                <div class="holding-bar-fill" style="width: 60%; background-color: #e8e0d4;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 账本市值排行骨架屏 -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title-row">
              <div class="skeleton-line skeleton-chart-title"></div>
              <div class="sort-tabs">
                <div class="skeleton-line skeleton-sort-tab"></div>
                <div class="skeleton-line skeleton-sort-tab"></div>
              </div>
            </div>
          </div>
          <div class="ledgers-ranking">
            <div v-for="i in 3" :key="`skeleton-ledger-${i}`" class="ledger-ranking-item">
              <div class="ledger-ranking-left">
                <div class="ranking-number">{{ i }}</div>
                <div class="ledger-info">
                  <div class="ledger-name-row">
                    <div class="skeleton-line skeleton-ledger-name"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                  </div>
                  <div class="ledger-value-row">
                    <div class="skeleton-line skeleton-percentage-tag"></div>
                    <div class="skeleton-line skeleton-ledger-value"></div>
                    <div class="skeleton-line skeleton-ledger-pnl"></div>
                  </div>
                </div>
              </div>
              <div class="ledger-bar">
                <div class="ledger-bar-fill" style="width: 50%; background-color: #e8e0d4;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 持仓列表骨架屏 -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title-row">
              <div class="skeleton-line skeleton-chart-title"></div>
              <div class="sort-tabs">
                <div class="skeleton-line skeleton-sort-tab"></div>
                <div class="skeleton-line skeleton-sort-tab"></div>
              </div>
            </div>
          </div>
          <div class="holdings-ranking">
            <div v-for="i in 3" :key="`skeleton-all-holding-${i}`" class="holding-ranking-item">
              <div class="holding-ranking-left">
                <div class="ranking-number">{{ i }}</div>
                <div class="holding-info">
                  <div class="holding-name-row">
                    <div class="skeleton-line skeleton-holding-name"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                  </div>
                  <div class="holding-value-row">
                    <div class="skeleton-line skeleton-percentage-tag"></div>
                    <div class="skeleton-line skeleton-holding-value"></div>
                    <div class="skeleton-line skeleton-holding-pnl"></div>
                  </div>
                </div>
              </div>
              <div class="holding-bar">
                <div class="holding-bar-fill" style="width: 40%; background-color: #e8e0d4;"></div>
              </div>
            </div>
          </div>
        </div>
        </template>
        <template v-else>
        <div class="summary-card all-ledgers-summary-card">
          <div class="summary-top-row">
            <div>
              <div class="summary-label">所有账本总市值（人民币）</div>
              <div class="big-num" style="font-size: 28px;">¥ {{ fmt(store.allLedgersSummary.totalCNY) }}</div>
            </div>
            <div class="ledger-count-chip">
              <span class="summary-label">账本数量</span>
              <span class="ledger-count-num">{{ store.ledgers.length }}</span>
            </div>
          </div>
          <div class="summary-row">
            <div class="summary-pnl">
              <PnLTag :val="store.allLedgersSummary.pnl" :pct="store.allLedgersSummary.pct" :size="14" />
              <span class="pnl-abs">{{ store.allLedgersSummary.pnl >= 0 ? '+' : '' }}¥{{ fmt(store.allLedgersSummary.pnl) }}</span>
            </div>
          </div>
          <div class="ccy-row">
            <div v-for="item in allLedgersCcyBreakdown" :key="item.ccy" class="ccy-chip">
              <Tag :market="item.label" /> &thinsp;
              <span>{{ SYM[item.ccy] }}{{ fmt(item.val) }}</span>
              <span v-if="item.ccy !== 'CNY'" class="ccy-conv"> ≈ ¥{{ fmt(toCNY(item.val, item.ccy, store.fx)) }}</span>
              <span class="ccy-percentage"> ({{ fmt(getCcyPercentage(item.ccy), 1) }}%)</span>
            </div>
          </div>
        </div>



        <!-- ── Holdings by Market Value ── -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title-row">
              <div class="chart-title">标的市值排行</div>
              <div class="sort-tabs">
                <button 
                  :class="['sort-tab', { active: holdingSortBy === 'mv' }]" 
                  @click="holdingSortBy = 'mv'"
                >按市值</button>
                <button 
                  :class="['sort-tab', { active: holdingSortBy === 'pnl' }]" 
                  @click="holdingSortBy = 'pnl'"
                >按盈亏</button>
                <button 
                  :class="['sort-tab', 'sort-direction-btn', { active: true }]" 
                  @click="holdingSortAsc = !holdingSortAsc"
                  :title="holdingSortAsc ? '正序' : '倒序'"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path v-if="!holdingSortAsc" d="M7 2v10M3 6l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path v-else d="M7 12V2M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="holdings-ranking">
            <div v-for="(holding, index) in topHoldings" :key="`${holding.market}-${holding.code}`" class="holding-ranking-item">
              <div class="holding-ranking-left">
                <div class="ranking-number">{{ (currentPage - 1) * 10 + index + 1 }}</div>
                <div class="holding-info">
                  <div class="holding-name-row">
                    <span class="holding-name">{{ holding.name }}</span>
                    <span class="holding-tag market-tag" :class="`market-${holding.market}`">{{ holding.market }}</span>
                    <span class="holding-tag code-tag">{{ holding.code }}</span>
                    <span class="holding-tag qty-tag">{{ holding.qty }}股</span>
                  </div>
                  <div class="holding-value-row">
                    <span class="holding-tag percentage-tag">{{ fmt(holding.percentage, 1) }}%</span>
                    <div class="holding-value">¥ {{ fmt(holding.mvCNY) }}</div>
                    <div :class="['holding-pnl', holding.pnl >= 0 ? 'pnl-green' : 'pnl-red']">
                      {{ holding.pnl >= 0 ? '+' : '' }}¥{{ fmt(holding.pnl) }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="holding-ranking-right">
              </div>
              <div class="holding-bar">
                <div class="holding-bar-fill" :style="{ width: `${holding.percentage * 3}%`, backgroundColor: getHoldingColor(index) }"></div>
              </div>
            </div>
          </div>
          <div v-if="totalPages > 1" class="pagination">
            <button class="pagination-btn" :disabled="currentPage === 1" @click="prevPage">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 2.5 7 5.5 10 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
            <button class="pagination-btn" :disabled="currentPage === totalPages" @click="nextPage">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 7.5 9 10.5 6 13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 10H12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- ── Ledgers by Market Value ── -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title-row">
              <div class="chart-title">账本市值排行</div>
              <div class="sort-tabs">
                <button 
                  :class="['sort-tab', { active: ledgerSortBy === 'mv' }]" 
                  @click="ledgerSortBy = 'mv'"
                >按市值</button>
                <button 
                  :class="['sort-tab', { active: ledgerSortBy === 'pnl' }]" 
                  @click="ledgerSortBy = 'pnl'"
                >按盈亏</button>
                <button 
                  :class="['sort-tab', 'sort-direction-btn', { active: true }]" 
                  @click="ledgerSortAsc = !ledgerSortAsc"
                  :title="ledgerSortAsc ? '正序' : '倒序'"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path v-if="!ledgerSortAsc" d="M7 2v10M3 6l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path v-else d="M7 12V2M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="ledgers-ranking">
            <div v-for="(ledger, index) in sortedLedgers" :key="ledger.id" class="ledger-ranking-item">
              <div class="ledger-ranking-left">
                <div class="ranking-number">{{ index + 1 }}</div>
                <div class="ledger-info">
                  <div class="ledger-name-row">
                    <span class="ledger-name" :style="{ color: ledger.color }">{{ ledger.name }}</span>
                    <span class="holding-tag holdings-tag">{{ ledger.holdingCount }} 只持仓</span>
                  </div>
                  <div class="ledger-value-row">
                    <span class="holding-tag percentage-tag">{{ fmt(ledger.percentage, 1) }}%</span>
                    <div class="ledger-value">¥ {{ fmt(ledger.totalCNY) }}</div>
                    <div :class="['ledger-pnl', ledger.pnl >= 0 ? 'pnl-green' : 'pnl-red']">
                      {{ ledger.pnl >= 0 ? '+' : '' }}¥{{ fmt(ledger.pnl) }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="ledger-ranking-right">
              </div>
              <div class="ledger-bar">
                <div class="ledger-bar-fill" :style="{ width: `${ledger.percentage * 3}%`, backgroundColor: ledger.color }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── All Holdings List ── -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title-row">
              <div class="chart-title">持仓列表</div>
              <div class="sort-tabs">
                <button 
                  :class="['sort-tab', { active: allHoldingSortBy === 'mv' }]" 
                  @click="allHoldingSortBy = 'mv'"
                >按市值</button>
                <button 
                  :class="['sort-tab', { active: allHoldingSortBy === 'pnl' }]" 
                  @click="allHoldingSortBy = 'pnl'"
                >按盈亏</button>
                <button 
                  :class="['sort-tab', 'sort-direction-btn', { active: true }]" 
                  @click="allHoldingSortAsc = !allHoldingSortAsc"
                  :title="allHoldingSortAsc ? '正序' : '倒序'"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path v-if="!allHoldingSortAsc" d="M7 2v10M3 6l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path v-else d="M7 12V2M3 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="holdings-ranking">
            <div v-for="(holding, index) in allHoldingsList" :key="`${holding.ledgerId}-${holding.code}`" class="holding-ranking-item">
              <div class="holding-ranking-left">
                <div class="ranking-number">{{ index + 1 }}</div>
                <div class="holding-info">
                  <div class="holding-name-row">
                    <span class="holding-name">{{ holding.name }}</span>
                    <span class="holding-tag market-tag" :class="`market-${holding.market}`">{{ holding.market }}</span>
                    <span class="holding-tag code-tag">{{ holding.code }}</span>
                    <span class="holding-tag qty-tag">{{ holding.qty }}股</span>
                    <span class="holding-tag ledger-tag" :style="{ backgroundColor: holding.ledgerColor, color: '#fff' }">{{ holding.ledgerName }}</span>
                  </div>
                  <div class="holding-value-row">
                    <span class="holding-tag percentage-tag">{{ fmt(holding.percentage, 1) }}%</span>
                    <div class="holding-value">¥ {{ fmt(holding.mvCNY) }}</div>
                    <div :class="['holding-pnl', holding.pnl >= 0 ? 'pnl-green' : 'pnl-red']">
                      {{ holding.pnl >= 0 ? '+' : '' }}¥{{ fmt(holding.pnl) }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="holding-ranking-right">
              </div>
              <div class="holding-bar">
                <div class="holding-bar-fill" :style="{ width: `${holding.percentage * 3}%`, backgroundColor: getHoldingColor(index) }"></div>
              </div>
            </div>
          </div>
        </div>
        </template>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import PnLTag from '../components/PnLTag.vue'
import Tag from '../components/Tag.vue'
import { useAppStore } from '../store/index.js'
import { fmt, toCNY, SYM, avgCost, totalQty } from '../composables/helpers.js'

export default {
  components: { PnLTag, Tag },
  setup() {
    const router = useRouter()
    const store = useAppStore()
    
    const appThemeStyle = computed(() => {
      return { '--ledger-theme': '#1a1814' }
    })

    const allLedgersCcyBreakdown = computed(() => [
      { label: 'A股', ccy: 'CNY', val: store.allLedgersSummary.byCcy.CNY },
      { label: '港股', ccy: 'HKD', val: store.allLedgersSummary.byCcy.HKD },
      { label: '美股', ccy: 'USD', val: store.allLedgersSummary.byCcy.USD }
    ])

    const currentPage = ref(1)
    const pageSize = 10
    
    const holdingSortBy = ref('mv')
    const holdingSortAsc = ref(false)
    const ledgerSortBy = ref('mv')
    const ledgerSortAsc = ref(false)
    const allHoldingSortBy = ref('mv')
    const allHoldingSortAsc = ref(false)

    const allHoldingsSorted = computed(() => {
      const total = store.allLedgersSummary.totalCNY
      const holdingsMap = new Map()

      store.allLedgersHoldings.forEach(holding => {
        const ccy = holding.market === 'A股' ? 'CNY' : holding.market === '港股' ? 'HKD' : 'USD'
        const price = store.prices[holding.code] || 0
        const cost = avgCost(holding.trades || [])
        const qty = totalQty(holding.trades || [])
        const mv = price * qty
        const costBasis = cost * qty
        const mvCNY = toCNY(mv, ccy, store.fx)
        const costCNY = toCNY(costBasis, ccy, store.fx)
        const pnl = mvCNY - costCNY

        const key = holding.code
        if (holdingsMap.has(key)) {
          const existing = holdingsMap.get(key)
          existing.qty += qty
          existing.mv += mv
          existing.mvCNY += mvCNY
          existing.costCNY += costCNY
          existing.pnl += pnl
        } else {
          holdingsMap.set(key, {
            market: holding.market,
            code: holding.code,
            name: holding.name,
            qty,
            mv,
            mvCNY,
            costCNY,
            pnl,
            percentage: 0
          })
        }
      })

      const allHoldings = Array.from(holdingsMap.values())
      allHoldings.forEach(h => {
        h.percentage = total > 0 ? (h.mvCNY / total) * 100 : 0
      })

      let sorted
      if (holdingSortBy.value === 'pnl') {
        sorted = allHoldings.sort((a, b) => b.pnl - a.pnl)
      } else {
        sorted = allHoldings.sort((a, b) => b.mvCNY - a.mvCNY)
      }
      
      if (holdingSortAsc.value) {
        sorted = sorted.reverse()
      }
      
      return sorted
    })

    const topHoldings = computed(() => {
      const start = (currentPage.value - 1) * pageSize
      const end = start + pageSize
      return allHoldingsSorted.value.slice(start, end)
    })

    const totalPages = computed(() => {
      return Math.ceil(allHoldingsSorted.value.length / pageSize)
    })

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    const sortedLedgers = computed(() => {
      const total = store.allLedgersSummary.totalCNY
      const ledgers = store.ledgerSummaries
        .map(ledger => ({
          ...ledger,
          percentage: total > 0 ? (ledger.totalCNY / total) * 100 : 0
        }))
      
      let sorted
      if (ledgerSortBy.value === 'pnl') {
        sorted = ledgers.sort((a, b) => b.pnl - a.pnl)
      } else {
        sorted = ledgers.sort((a, b) => b.totalCNY - a.totalCNY)
      }
      
      if (ledgerSortAsc.value) {
        sorted = sorted.reverse()
      }
      
      return sorted
    })

    const allHoldingsList = computed(() => {
      const total = store.allLedgersSummary.totalCNY
      const ledgerMap = new Map(store.ledgers.map(l => [l.id, l]))
      
      const holdings = store.allLedgersHoldings.map(holding => {
        const ccy = holding.market === 'A股' ? 'CNY' : holding.market === '港股' ? 'HKD' : 'USD'
        const price = store.prices[holding.code] || 0
        const cost = avgCost(holding.trades || [])
        const qty = totalQty(holding.trades || [])
        const mv = price * qty
        const costBasis = cost * qty
        const mvCNY = toCNY(mv, ccy, store.fx)
        const costCNY = toCNY(costBasis, ccy, store.fx)
        const pnl = mvCNY - costCNY
        const ledger = ledgerMap.get(holding.ledger_id) || { name: '未知', color: '#999' }

        return {
          ledgerId: holding.ledger_id,
          ledgerName: ledger.name,
          ledgerColor: ledger.color,
          market: holding.market,
          code: holding.code,
          name: holding.name,
          qty,
          mv,
          mvCNY,
          costCNY,
          pnl,
          percentage: total > 0 ? (mvCNY / total) * 100 : 0
        }
      })

      if (allHoldingSortBy.value === 'pnl') {
        holdings.sort((a, b) => b.pnl - a.pnl)
      } else {
        holdings.sort((a, b) => b.mvCNY - a.mvCNY)
      }
      
      if (allHoldingSortAsc.value) {
        holdings.reverse()
      }
      
      return holdings
    })

    const getHoldingColor = (index) => {
      const colors = ['#1a7a4a', '#1a6fa8', '#8e44ad', '#f39c12', '#e74c3c']
      return colors[index % colors.length]
    }

    const getCcyPercentage = (ccy) => {
      const total = store.allLedgersSummary.totalCNY
      if (total === 0) return 0
      const value = toCNY(store.allLedgersSummary.byCcy[ccy], ccy, store.fx)
      return (value / total) * 100
    }

    const goHome = () => {
      router.push('/')
    }

    onMounted(async () => {
      if (store.allLedgersHoldings.length === 0) {
        await store.loadData()
      }
    })
    
    onUnmounted(() => {
    })

    return {
      store,
      appThemeStyle,
      allLedgersCcyBreakdown,
      topHoldings,
      sortedLedgers,
      allHoldingsList,
      currentPage,
      totalPages,
      prevPage,
      nextPage,
      holdingSortBy,
      holdingSortAsc,
      ledgerSortBy,
      ledgerSortAsc,
      allHoldingSortBy,
      allHoldingSortAsc,
      fmt,
      toCNY,
      SYM,
      getHoldingColor,
      getCcyPercentage,
      goHome
    }
  }
}
</script>
