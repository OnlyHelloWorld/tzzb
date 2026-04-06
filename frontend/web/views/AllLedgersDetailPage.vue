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
        <button class="icon-btn" title="返回" @click="goHome()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 2.5 7 5.5 10 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13 8H3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="main-content">
      <div v-if="store.isLoading" class="section-loading">
        <div class="loading-wave">
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
        </div>
        <div class="loading-text">正在加载数据...</div>
      </div>
      <transition name="page" mode="out-in">
        <template v-if="!store.isLoading">
        <!-- All Ledgers Detail Page -->
        <div key="all-ledgers-detail-page" class="all-ledgers-detail-page">
        <!-- ── Summary ── -->
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
            <div class="chart-title">标的市值排行</div>
            <div class="chart-subtitle">按市值大小排序</div>
          </div>
          <div class="holdings-ranking">
            <div v-for="(holding, index) in topHoldings" :key="`${holding.market}-${holding.code}`" class="holding-ranking-item">
              <div class="holding-ranking-left">
                <div class="ranking-number">{{ index + 1 }}</div>
                <div class="holding-info">
                  <div class="holding-name">{{ holding.name }}</div>
                  <div class="holding-code">{{ holding.market }} {{ holding.code }}</div>
                </div>
              </div>
              <div class="holding-ranking-right">
                <div class="holding-value">¥ {{ fmt(holding.mvCNY) }}</div>
                <div class="holding-percentage">{{ fmt(holding.percentage, 1) }}%</div>
              </div>
              <div class="holding-bar">
                <div class="holding-bar-fill" :style="{ width: `${holding.percentage * 3}%`, backgroundColor: getHoldingColor(index) }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Ledgers by Market Value ── -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">账本市值排行</div>
            <div class="chart-subtitle">按市值大小排序</div>
          </div>
          <div class="ledgers-ranking">
            <div v-for="(ledger, index) in sortedLedgers" :key="ledger.id" class="ledger-ranking-item">
              <div class="ledger-ranking-left">
                <div class="ranking-number">{{ index + 1 }}</div>
                <div class="ledger-info">
                  <div class="ledger-name" :style="{ color: ledger.color }">{{ ledger.name }}</div>
                  <div class="ledger-holdings">{{ ledger.holdingCount }} 只持仓</div>
                </div>
              </div>
              <div class="ledger-ranking-right">
                <div class="ledger-value">¥ {{ fmt(ledger.totalCNY) }}</div>
                <div class="ledger-percentage">{{ fmt(ledger.percentage, 1) }}%</div>
              </div>
              <div class="ledger-bar">
                <div class="ledger-bar-fill" :style="{ width: `${ledger.percentage * 3}%`, backgroundColor: ledger.color }"></div>
              </div>
            </div>
          </div>
        </div>

        </div>
        </template>
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
import { fmt, toCNY, SYM } from '../composables/helpers.js'

export default {
  components: { PnLTag, Tag },
  setup() {
    const router = useRouter()
    const store = useAppStore()
    // 应用主题样式
    const appThemeStyle = computed(() => {
      return { '--ledger-theme': '#1a1814' }
    })

    // 所有账本的货币分类
    const allLedgersCcyBreakdown = computed(() => [
      { label: 'A股', ccy: 'CNY', val: store.allLedgersSummary.byCcy.CNY },
      { label: '港股', ccy: 'HKD', val: store.allLedgersSummary.byCcy.HKD },
      { label: '美股', ccy: 'USD', val: store.allLedgersSummary.byCcy.USD }
    ])

    // 所有持仓按市值排序
    const topHoldings = computed(() => {
      const allHoldings = []
      const total = store.allLedgersSummary.totalCNY

      store.allLedgersHoldings.forEach(holding => {
        const ccy = holding.market === 'A股' ? 'CNY' : holding.market === '港股' ? 'HKD' : 'USD'
        const price = store.prices[holding.code] || 0
        const qty = holding.trades.reduce((sum, trade) => sum + trade.qty, 0)
        const mv = price * qty
        const mvCNY = toCNY(mv, ccy, store.fx)

        allHoldings.push({
          ...holding,
          mv,
          mvCNY,
          percentage: total > 0 ? (mvCNY / total) * 100 : 0
        })
      })

      return allHoldings.sort((a, b) => b.mvCNY - a.mvCNY).slice(0, 10)
    })

    // 账本按市值排序
    const sortedLedgers = computed(() => {
      const total = store.allLedgersSummary.totalCNY
      return store.ledgerSummaries
        .map(ledger => ({
          ...ledger,
          percentage: total > 0 ? (ledger.totalCNY / total) * 100 : 0
        }))
        .sort((a, b) => b.totalCNY - a.totalCNY)
    })

    // 获取持仓颜色
    const getHoldingColor = (index) => {
      const colors = ['#1a7a4a', '#1a6fa8', '#8e44ad', '#f39c12', '#e74c3c']
      return colors[index % colors.length]
    }

    // 计算各货币的百分比
    const getCcyPercentage = (ccy) => {
      const total = store.allLedgersSummary.totalCNY
      if (total === 0) return 0
      const value = toCNY(store.allLedgersSummary.byCcy[ccy], ccy, store.fx)
      return (value / total) * 100
    }

    // 返回首页
    const goHome = () => {
      router.push('/')
    }

    // 页面加载时
    onMounted(async () => {
      await store.loadData()
    })
    
    // 页面卸载时
    onUnmounted(() => {
    })

    return {
      store,
      appThemeStyle,
      allLedgersCcyBreakdown,
      topHoldings,
      sortedLedgers,
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