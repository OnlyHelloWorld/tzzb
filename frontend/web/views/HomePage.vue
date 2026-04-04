<template>
  <div class="app-root density-cozy">
    <!-- ── Header ── -->
    <div class="header">
      <div class="header-left">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="#1a1814"/>
          <path d="M7 9h14M7 14h10M7 19h12" stroke="#f9f7f3" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="21" cy="19" r="3.5" fill="#c4a050"/>
        </svg>
        <span class="app-title">投资账本</span>
      </div>
      <div class="header-right">
        <button class="icon-btn" title="退出登录" @click="handleLogout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2.5H3.5A1.5 1.5 0 0 0 2 4v8a1.5 1.5 0 0 0 1.5 1.5H6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M10 11.5 13 8l-3-3.5M13 8H6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn btn-ink" @click="openCreateLedger">+ 新建账本</button>
      </div>
    </div>

    <div class="main-content">
      <div v-if="showBlessingEffect || store.isLoading" :class="['blessing-overlay', { 'blessing-overlay-loop': store.isLoading }]">
        <span
          v-for="(char, index) in blessingChars"
          :key="`${store.isLoading ? 'loading' : blessingEffectKey}-${index}`"
          :class="['blessing-char', store.isLoading ? 'blessing-char-loop' : 'blessing-char-pop']"
        >{{ char }}</span>
      </div>
      <div v-if="store.isLoading" class="section-loading">
        <div class="loading-wave">
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
        </div>
        <div class="loading-text">正在刷新当前区域...</div>
      </div>
      <transition name="page" mode="out-in">
        <template v-if="!store.isLoading">
        <!-- Ledger management page -->
        <div key="ledger-management" class="ledger-management">
        <!-- 所有账本汇总卡片 -->
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
            </div>
          </div>
          <!-- ── Import/Export for all ledgers ── -->
          <div class="ledger-io-section">
            <div class="io-btns">
              <div class="io-dropdown" @click.stop>
                <button class="btn btn-ink" style="font-size:11px" @click="showAllLedgerIOMenu = !showAllLedgerIOMenu">
                  导入/导出所有账本
                </button>
                <div v-if="showAllLedgerIOMenu" class="io-dropdown-menu">
                  <button class="dropdown-item" @click="handleExportAllLedgersCSV(); showAllLedgerIOMenu = false;">导出所有账本 CSV</button>
                  <button class="dropdown-item" @click="handleExportAllLedgersPDF(); showAllLedgerIOMenu = false;">导出所有账本 PDF</button>
                  <button class="dropdown-item" @click="triggerAllLedgersImport(); showAllLedgerIOMenu = false;">导入账本 CSV</button>
                </div>
              </div>
              <input ref="allLedgersImportInput" type="file" accept=".csv" style="display:none" @change="handleAllLedgersImport" />
            </div>
            <div v-if="store.ioMessage" class="io-message" :class="store.ioMessageClass">{{ store.ioMessage }}</div>
          </div>
        </div>

        <div class="ledgers-grid">
          <div v-for="summary in store.ledgerSummaries" :key="summary.id" class="ledger-card" @click="switchLedger(summary)">
            <div class="ledger-card-header" :style="{ backgroundColor: summary.color }"></div>
            <div class="ledger-card-body">
              <div class="ledger-card-title-row">
                <h3>{{ summary.name }}</h3>
                <div class="ledger-card-menu-wrap" @click.stop>
                  <button class="ledger-card-menu-btn" @click.stop="toggleLedgerActionMenu(summary.id)">⋯</button>
                  <div v-if="openLedgerActionMenuId === summary.id" class="ledger-card-menu">
                    <button class="ledger-card-menu-item" @click.stop="editLedger(summary); closeLedgerActionMenu()">编辑账本</button>
                    <button class="ledger-card-menu-item ledger-card-menu-item-danger" @click.stop="confirmDeleteLedger(summary); closeLedgerActionMenu()">删除账本</button>
                  </div>
                </div>
              </div>
              <div class="ledger-summary">
                <div class="summary-item">
                  <span class="summary-label">总市值</span>
                  <span class="summary-value">¥ {{ fmt(summary.totalCNY) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">持仓</span>
                  <span class="summary-value">{{ summary.holdingCount }} 只</span>
                </div>
                <div class="summary-item" :class="{ 'pnl-green': summary.pnl >= 0, 'pnl-red': summary.pnl < 0 }">
                  <span class="summary-label">盈亏</span>
                  <span class="summary-value">{{ summary.pnl >= 0 ? '+' : '' }}¥{{ fmt(summary.pnl) }} ({{ summary.pct >= 0 ? '+' : '' }}{{ fmt(summary.pct, 1) }}%)</span>
                </div>
              </div>
              <p class="ledger-card-hint">点击进入账本</p>
            </div>
          </div>
          <div class="ledger-card ledger-card-empty" @click="openCreateLedger">
            <div class="ledger-card-empty-content">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#ddd" stroke-width="2"/>
                <path d="M24 16v16M16 24h16" stroke="#ddd" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p>创建新账本</p>
            </div>
          </div>
        </div>
      </div>
      </template>
      </transition>
    </div>

    <!-- ── Create Ledger Modal ── -->
    <div v-if="createLedgerModal" class="overlay" @click.self="createLedgerModal = false">
      <div class="modal">
        <div class="modal-title">创建新账本</div>
        <div class="form-grid">
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">账本名称</div>
            <input class="form-control" placeholder="输入账本名称" v-model="newLedgerName" />
          </div>
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">主题色</div>
            <div class="color-picker">
              <div v-for="color in ledgerColors" :key="color" 
                   class="color-option" 
                   :style="{ backgroundColor: color }" 
                   :class="{ active: newLedgerColor === color }"
                   @click="newLedgerColor = color"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="createLedgerModal = false">取消</button>
          <button class="btn btn-ink" @click="saveNewLedger">创建</button>
        </div>
      </div>
    </div>

    <!-- ── Edit Ledger Modal ── -->
    <div v-if="editLedgerModal" class="overlay" @click.self="editLedgerModal = false">
      <div class="modal">
        <div class="modal-title">编辑账本</div>
        <div class="form-grid">
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">账本名称</div>
            <input class="form-control" placeholder="输入账本名称" v-model="editingLedger.name" />
          </div>
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">主题色</div>
            <div class="color-picker">
              <div v-for="color in ledgerColors" :key="color" 
                   class="color-option" 
                   :style="{ backgroundColor: color }" 
                   :class="{ active: editingLedger.color === color }"
                   @click="editingLedger.color = color"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="editLedgerModal = false">取消</button>
          <button class="btn btn-ink" @click="saveEditLedger">保存</button>
        </div>
      </div>
    </div>

    <!-- ── Delete Ledger Confirm Modal ── -->
    <div v-if="deleteLedgerConfirm" class="overlay" @click.self="deleteLedgerConfirm = false">
      <div class="modal">
        <div class="modal-title">确认删除账本</div>
        <div style="margin: 20px 0; font-size: 14px; line-height: 1.5; text-align: center; color: #666;">
          确定要删除账本 "{{ deleteLedgerConfirm.name }}" 吗？<br>
          <span style="color: #c0392b; font-weight: 500;">此操作不可撤销，所有相关持仓数据将被删除</span>
        </div>
        <div class="modal-footer" style="justify-content: center; gap: 20px;">
          <button class="btn btn-ghost" style="padding: 10px 24px; min-width: 100px; font-size: 14px;" @click="deleteLedgerConfirm = false">取消</button>
          <button class="btn btn-warn" style="padding: 10px 24px; min-width: 100px; font-size: 14px; color: #c0392b; border-color: #c0392b;" @click="deleteSelectedLedger">确认删除</button>
        </div>
      </div>
    </div>

    <!-- ── Error Detail Modal ── -->
    <div v-if="errorModal.visible" class="overlay" @click.self="closeErrorModal">
      <div class="modal error-detail-modal">
        <div class="modal-title">操作失败</div>
        <div class="error-detail-message">{{ errorModal.message }}</div>
        <div class="error-detail-actions">
          <button class="btn btn-ghost" @click="errorModal.expanded = !errorModal.expanded">
            {{ errorModal.expanded ? '收起异常详情' : '展开异常详情' }}
          </button>
          <button class="btn btn-ink" @click="copyErrorDetail">复制异常日志</button>
        </div>
        <pre v-if="errorModal.expanded" class="error-detail-log">{{ errorModal.detail }}</pre>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeErrorModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PnLTag from '../components/PnLTag.vue'
import Tag from '../components/Tag.vue'
import { useAppStore } from '../store/index.js'
import * as api from '../lib/api.js'
import { exportAllLedgersCSV, exportAllLedgersPDF, importCSV } from '../lib/io.js'
import { fmt, toCNY, SYM } from '../composables/helpers.js'

export default {
  components: { PnLTag, Tag },
  setup() {
    const router = useRouter()
    const store = useAppStore()
    
    // 状态
    const createLedgerModal = ref(false)
    const editLedgerModal = ref(false)
    const deleteLedgerConfirm = ref(null)
    const newLedgerName = ref('')
    const newLedgerColor = ref('#1a1814')
    const editingLedger = ref({ id: null, name: '', color: '#1a1814' })
    const showAllLedgerIOMenu = ref(false)
    const allLedgersImportInput = ref(null)
    const openLedgerActionMenuId = ref(null)
    const blessingChars = ['恭', '喜', '发', '财']
    const showBlessingEffect = ref(false)
    const blessingEffectKey = ref(0)
    const errorModal = ref({ visible: false, message: '', detail: '', expanded: false })
    
    // 账本颜色选项
    const ledgerColors = [
      '#1a1814', '#1a7a4a', '#c0392b', '#1a6fa8', '#8e44ad',
      '#f39c12', '#e74c3c', '#3498db', '#27ae60', '#9b59b6'
    ]
    
    // 所有账本的货币分类
    const allLedgersCcyBreakdown = computed(() => [
      { label: 'A股', ccy: 'CNY', val: store.allLedgersSummary.byCcy.CNY },
      { label: '港股', ccy: 'HKD', val: store.allLedgersSummary.byCcy.HKD },
      { label: '美股', ccy: 'USD', val: store.allLedgersSummary.byCcy.USD }
    ])
    
    // 触发祝福效果
    const triggerBlessingEffect = (duration = 1800) => {
      blessingEffectKey.value += 1
      showBlessingEffect.value = true
      setTimeout(() => {
        showBlessingEffect.value = false
      }, duration)
    }
    
    // 切换账本菜单
    const toggleLedgerActionMenu = (ledgerId) => {
      openLedgerActionMenuId.value = openLedgerActionMenuId.value === ledgerId ? null : ledgerId
    }
    
    // 关闭账本菜单
    const closeLedgerActionMenu = () => {
      openLedgerActionMenuId.value = null
    }
    
    // 打开创建账本模态框
    const openCreateLedger = () => {
      newLedgerName.value = ''
      newLedgerColor.value = '#1a1814'
      createLedgerModal.value = true
    }
    
    // 保存新账本
    const saveNewLedger = async () => {
      if (!newLedgerName.value.trim()) {
        store.showMessage('请输入账本名称', true)
        return
      }

      try {
        const newLedger = await api.createLedger(newLedgerName.value.trim(), newLedgerColor.value)
        createLedgerModal.value = false
        await store.loadData()
        triggerBlessingEffect()
        store.showMessage('账本创建成功')
      } catch (err) {
        store.showMessage('创建账本失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 编辑账本
    const editLedger = (ledger) => {
      editingLedger.value = { ...ledger }
      editLedgerModal.value = true
    }
    
    // 保存编辑的账本
    const saveEditLedger = async () => {
      if (!editingLedger.value.name.trim()) {
        store.showMessage('请输入账本名称', true)
        return
      }

      try {
        const updatedLedger = await api.updateLedger(editingLedger.value.id, {
          name: editingLedger.value.name.trim(),
          color: editingLedger.value.color
        })
        editLedgerModal.value = false
        await store.loadData()
        triggerBlessingEffect()
        store.showMessage('账本更新成功')
      } catch (err) {
        store.showMessage('更新账本失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 确认删除账本
    const confirmDeleteLedger = (ledger) => {
      deleteLedgerConfirm.value = ledger
    }
    
    // 删除选中的账本
    const deleteSelectedLedger = async () => {
      if (!deleteLedgerConfirm.value) return

      try {
        const deletedId = deleteLedgerConfirm.value.id
        await api.deleteLedger(deletedId)
        deleteLedgerConfirm.value = null
        await store.loadData()
        triggerBlessingEffect()
        store.showMessage('账本删除成功')
      } catch (err) {
        store.showMessage('删除账本失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 切换到账本详情页
    const switchLedger = (ledger) => {
      console.log('切换账本:', ledger)
      store.setCurrentLedger(ledger)
      router.push(`/ledger/${ledger.id}`)
    }
    
    // 处理导出所有账本 CSV
    const handleExportAllLedgersCSV = () => {
      exportAllLedgersCSV(store.ledgers, store.allLedgersHoldings, store.prices, store.fx)
    }
    
    // 处理导出所有账本 PDF
    const handleExportAllLedgersPDF = () => {
      exportAllLedgersPDF(store.ledgers, store.allLedgersHoldings, store.prices, store.fx)
    }
    
    // 触发导入所有账本
    const triggerAllLedgersImport = () => {
      if (allLedgersImportInput.value) allLedgersImportInput.value.click()
    }
    
    // 处理导入所有账本
    const handleAllLedgersImport = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const data = await importCSV(file)
        if (data.isMultiLedger) {
          for (const ledger of data.ledgers) {
            const newLedger = await api.createLedger(ledger.name, ledger.color)
            const holdingsToSave = data.ledgerHoldings[ledger.id] || []
            if (holdingsToSave.length > 0) {
              await api.saveHoldings(holdingsToSave, newLedger.id)
            }
          }
          await store.loadData()
          store.showMessage(`导入成功，共 ${data.ledgers.length} 个账本`)
        } else {
          store.showMessage('请先选择一个账本再导入', true)
        }
      } catch (err) {
        store.showMessage('导入失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }

      if (allLedgersImportInput.value) allLedgersImportInput.value.value = ''
    }
    
    // 处理登录
    const handleLogin = async () => {
      try {
        await store.loadData()
        store.showMessage('登录成功，数据加载完成')
      } catch (err) {
        store.showMessage('登录后数据加载失败: ' + err.message, true)
      }
    }
    
    // 处理登出
    const handleLogout = () => {
      api.logout()
      router.push('/home')
    }
    
    // 格式化错误详情
    const formatErrorDetail = (err) => {
      const detail = err?.detail
      if (typeof detail === 'string') return detail
      if (detail && typeof detail === 'object') return JSON.stringify(detail, null, 2)
      return err?.stack || err?.message || String(err)
    }
    
    // 显示错误详情模态框
    const showErrorDetailModal = (fallbackMessage, err) => {
      errorModal.value = {
        visible: true,
        message: err?.message || fallbackMessage,
        detail: formatErrorDetail(err),
        expanded: false,
      }
    }
    
    // 关闭错误详情模态框
    const closeErrorModal = () => {
      errorModal.value.visible = false
    }
    
    // 复制错误详情
    const copyErrorDetail = async () => {
      try {
        await navigator.clipboard.writeText(errorModal.value.detail || '')
        store.showMessage('异常日志已复制')
      } catch (e) {
        store.showMessage('复制失败，请手动复制', true)
      }
    }
    
    // 页面加载时加载数据
    onMounted(async () => {
      try {
        await store.loadData()
      } catch (err) {
        console.warn('加载数据失败，使用模拟数据:', err)
        // 添加模拟账本数据以便测试跳转功能
        store.ledgers = [
          { id: '1', name: '模拟账本1', color: '#1a1814' },
          { id: '2', name: '模拟账本2', color: '#1a7a4a' },
          { id: '3', name: '模拟账本3', color: '#c0392b' }
        ]
        store.ledgerSummaries = [
          { id: '1', name: '模拟账本1', color: '#1a1814', totalCNY: 10000, pnl: 1000, pct: 10, holdingCount: 3 },
          { id: '2', name: '模拟账本2', color: '#1a7a4a', totalCNY: 20000, pnl: -500, pct: -2.5, holdingCount: 5 },
          { id: '3', name: '模拟账本3', color: '#c0392b', totalCNY: 15000, pnl: 750, pct: 5, holdingCount: 4 }
        ]
      }
    })
    
    return {
      store,
      createLedgerModal,
      editLedgerModal,
      deleteLedgerConfirm,
      newLedgerName,
      newLedgerColor,
      editingLedger,
      showAllLedgerIOMenu,
      allLedgersImportInput,
      openLedgerActionMenuId,
      blessingChars,
      showBlessingEffect,
      blessingEffectKey,
      errorModal,
      ledgerColors,
      allLedgersCcyBreakdown,
      fmt,
      toCNY,
      SYM,
      triggerBlessingEffect,
      toggleLedgerActionMenu,
      closeLedgerActionMenu,
      openCreateLedger,
      saveNewLedger,
      editLedger,
      saveEditLedger,
      confirmDeleteLedger,
      deleteSelectedLedger,
      switchLedger,
      handleExportAllLedgersCSV,
      handleExportAllLedgersPDF,
      triggerAllLedgersImport,
      handleAllLedgersImport,
      handleLogin,
      handleLogout,
      showErrorDetailModal,
      closeErrorModal,
      copyErrorDetail
    }
  }
}
</script>