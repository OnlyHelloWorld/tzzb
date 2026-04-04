<template>
  <div class="app-root density-cozy" :style="appThemeStyle">
    <!-- ── Header ── -->
    <div class="header">
      <div class="header-left" @click="goHome()">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" :fill="store.currentLedger?.color || '#1a1814'"/>
          <path d="M7 9h14M7 14h10M7 19h12" stroke="#f9f7f3" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="21" cy="19" r="3.5" fill="#c4a050"/>
        </svg>
        <span class="app-title">投资账本</span>
      </div>
      <div class="header-right">
        <div class="header-actions-group">
          <span class="ledger-badge" :style="{ backgroundColor: store.currentLedger?.color, color: '#fff' }">
            {{ store.currentLedger?.name }}
            <span class="ledger-badge-action" @click="showLedgerList = !showLedgerList">▼</span>
          </span>
          
          <div class="dropdown-container" @click.stop>
            <button class="btn btn-ghost" style="padding: 6px 10px;" @click="showDropdown = !showDropdown">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:middle">
                <circle cx="7" cy="7" r="1" fill="currentColor"/>
                <circle cx="7" cy="4" r="1" fill="currentColor"/>
                <circle cx="7" cy="10" r="1" fill="currentColor"/>
              </svg>
            </button>
            <div v-if="showDropdown" class="dropdown-menu" @click.stop>
              <button class="dropdown-item" @click="goHome(); showDropdown = false;">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="vertical-align:middle;margin-right:6px">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                返回主页
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="openCreateLedger(); showDropdown = false;">+ 新建账本</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="store.refreshQuotes(); showDropdown = false;" :disabled="store.quoteStatus === 'loading'">
                <svg :class="{ 'spin': store.quoteStatus === 'loading' }" width="12" height="12" viewBox="0 0 14 14" fill="none" style="vertical-align:middle;margin-right:6px">
                  <path d="M1.5 7a5.5 5.5 0 0 1 9.3-3.95M12.5 7a5.5 5.5 0 0 1-9.3 3.95" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M10.8.5v2.55h-2.55M3.2 13.5v-2.55h2.55" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ store.quoteStatus === 'loading' ? '获取中…' : '刷新行情' }}
              </button>
              <div v-if="store.quoteStatus" class="quote-status-inline">
                <span :class="['quote-status', store.quoteStatus]">
                  {{ store.quoteStatus === 'loading' ? '加载中...' : store.quoteStatus === 'error' ? '行情异常' : store.lastQuoteTime }}
                </span>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="editLedger(store.currentLedger); showDropdown = false;">编辑当前账本</button>
              <button class="dropdown-item" @click="confirmDeleteLedger(store.currentLedger); showDropdown = false;" style="color: #c0392b;">删除当前账本</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="handleLogout(); showDropdown = false;" style="color: #c0392b;">退出</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ledger dropdown -->
      <div v-if="store.currentLedger && showLedgerList" class="ledger-dropdown">
        <div v-for="ledger in store.ledgers" :key="ledger.id" class="ledger-item" @click="switchLedger(ledger)">
          <div class="ledger-color" :style="{ backgroundColor: ledger.color }"></div>
          <div class="ledger-info">
            <div class="ledger-name">{{ ledger.name }}</div>
          </div>
          <div class="ledger-actions">
            <button class="btn btn-ghost btn-sm" @click.stop="editLedger(ledger)">编辑</button>
            <button class="btn btn-warn btn-sm" @click.stop="confirmDeleteLedger(ledger)">删除</button>
          </div>
        </div>
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
        <template v-if="!store.isLoading && store.currentLedger">
        <!-- Holding management -->
        <div key="holding-management">

        <!-- ── Summary ── -->
      <div class="summary-card">
        <div class="summary-card-header">
          <div class="summary-label">总市值（人民币）</div>
          <button class="btn btn-ink add-holding-btn" @click="openAddHolding">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:middle;margin-right:4px">
              <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            添加持仓
          </button>
        </div>
        <div class="summary-row">
          <div class="big-num">¥ {{ fmt(summary.totalCNY) }}</div>
          <div class="summary-pnl">
            <PnLTag :val="summary.pnl" :pct="summary.pct" :size="14" />
            <span class="pnl-abs">{{ summary.pnl >= 0 ? '+' : '' }}¥{{ fmt(summary.pnl) }}</span>
          </div>
        </div>
        <div class="ccy-row">
          <div v-for="item in ccyBreakdown" :key="item.ccy" class="ccy-chip">
            <Tag :market="item.label" /> &thinsp;
            <span>{{ SYM[item.ccy] }}{{ fmt(item.val) }}</span>
            <span v-if="item.ccy !== 'CNY'" class="ccy-conv"> ≈ ¥{{ fmt(toCNY(item.val, item.ccy, store.fx)) }}</span>
          </div>
        </div>
        <div class="fx-section">
          <div class="fx-bar">
            <span class="fx-label">汇率</span>
            <div v-for="item in fxList" :key="item.key" class="fx-chip">
              <span>{{ item.label }}</span>
              <span class="fx-value">{{ store.fx[item.key] }}</span>
            </div>
            <!-- Auto refresh toggle -->
            <div class="fx-chip">
              <span>行情自动刷新（60s）</span>
              <label class="toggle-switch">
                <input type="checkbox" v-model="store.autoRefresh" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- ── Import/Export ── -->
        <div class="io-section">
          <div class="io-btns io-btns-right">
            <div class="io-dropdown" @click.stop>
              <button class="btn btn-ghost" style="font-size:11px" @click="showHoldingIOMenu = !showHoldingIOMenu">导入/导出</button>
              <div v-if="showHoldingIOMenu" class="io-dropdown-menu">
                <button class="dropdown-item" @click="handleExportCSV(); showHoldingIOMenu = false;">导出 CSV</button>
                <button class="dropdown-item" @click="handleExportPDF(); showHoldingIOMenu = false;">导出 PDF</button>
                <button class="dropdown-item" @click="triggerImport(); showHoldingIOMenu = false;">导入 CSV</button>
              </div>
            </div>
            <input ref="importInput" type="file" accept=".csv" style="display:none" @change="handleImport" />
          </div>
          <div v-if="store.ioMessage" class="io-message" :class="store.ioMessageClass">{{ store.ioMessage }}</div>
        </div>
      </div>

      <!-- ── Error banner ── -->
      <div v-if="store.quoteError" class="error-banner">
        <span>⚠️ {{ store.quoteError }}</span>
        <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;margin-left:8px" @click="store.quoteError = ''">关闭</button>
      </div>

      <!-- ── Tabs ── -->
      <div class="tabs-row">
        <button v-for="t in TABS" :key="t" :class="['tab', { on: tab === t }]" @click="tab = t">{{ t }}</button>
        <span class="tabs-count">{{ filtered.length }} 只</span>
      </div>

      <!-- ── Table header (desktop) ── -->
      <div class="tbl-hdr">
        <div>持仓</div><div style="text-align:right">成本均价</div>
        <div style="text-align:right">现价</div><div style="text-align:right">市值</div>
        <div style="width:90px"></div>
      </div>

      <!-- ── Holdings ── -->
      <transition-group name="holding-fly" tag="div" class="holding-list">
      <div
        v-for="(h, index) in filtered"
        :key="`${h.market}-${h.code}`"
        :style="{ '--stagger': `${index * 60}ms` }"
        :class="['row', { 'row-updating': h.refreshing, 'row-deleting': deletingHoldings.includes(`${h.market}-${h.code}`) }]"
      >

        <div class="row-head" @click="expanded = expanded === `${h.market}-${h.code}` ? null : `${h.market}-${h.code}`">
          <div>
            <div class="name-row">
              <span class="stock-name">{{ h.name }}</span>
              <Tag :market="h.market" />
              <span class="stock-code">{{ h.code }}</span>
            </div>
            <div class="info-grid">
              <span>均价 <span class="val">{{ SYM[h.ccy] }}{{ fmt(h.cost) }}</span></span>
              <span>现价 <span class="val">{{ SYM[h.ccy] }}{{ fmt(h.price) }}</span></span>
              <span>市值 <span class="val">{{ SYM[h.ccy] }}{{ fmt(h.mv) }}</span></span>
            </div>
          </div>
          <div class="desktop-col">
            <div class="mono">{{ SYM[h.ccy] }}{{ fmt(h.cost) }}</div>
            <div class="col-sub">{{ h.qty }}股</div>
          </div>
          <div class="desktop-col">
            <div class="mono">{{ SYM[h.ccy] }}{{ fmt(h.price) }}</div>
          </div>
          <div class="desktop-col">
            <div class="mono" style="font-weight:600">{{ SYM[h.ccy] }}{{ fmt(h.mv) }}</div>
          </div>
          <div class="pnl-col">
            <div style="text-align:right">
              <PnLTag :val="h.pnl" :pct="h.pct" />
              <div :class="['pnl-abs', h.pnl >= 0 ? 'pnl-green' : 'pnl-red']">
                {{ h.pnl >= 0 ? '+' : '' }}{{ SYM[h.ccy] }}{{ fmt(h.pnl) }}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              :style="{ flexShrink: 0, transition: 'transform .2s', transform: expanded === `${h.market}-${h.code}` ? 'rotate(180deg)' : 'none' }">
              <path d="M4 6l4 4 4-4" stroke="#bbb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <!-- Trade zone -->
        <transition name="expand" mode="out-in">
          <div v-if="expanded === `${h.market}-${h.code}`" key="trade-zone" class="trade-zone">
          <div class="trade-header">
            <span class="trade-title">买入记录</span>
            <div class="trade-actions">
              <button class="btn btn-ghost" style="font-size:11px" @click.stop="openAddTrade({ market: h.market, code: h.code })">+ 新增一笔</button>
              <button class="btn btn-warn" style="font-size:11px" @click.stop="toggleReset({ market: h.market, code: h.code })">
                {{ resetTarget && resetTarget.market === h.market && resetTarget.code === h.code ? '取消' : '一键重置成本' }}
              </button>
              <button class="btn btn-warn" style="font-size:11px;color:#c0392b;border-color:#c0392b" @click.stop="confirmDeleteHolding({ market: h.market, code: h.code })">
                删除持仓
              </button>
            </div>
          </div>

          <!-- Reset confirm -->
          <div v-if="resetTarget && resetTarget.market === h.market && resetTarget.code === h.code" class="confirm-box">
            <div style="margin-bottom:10px">将合并全部 {{ h.trades.length }} 笔记录为单笔，持仓量不变。此操作不可撤销。</div>
            <div class="reset-price-row">
              <span class="reset-label">新成本价：</span>
              <input class="field field-sm" type="number" step="0.01"
                :placeholder="`默认均价 ${SYM[h.ccy]}${fmt(h.cost)}`"
                v-model="resetPrice" />
              <span class="reset-hint">留空则使用均价 {{ SYM[h.ccy] }}{{ fmt(h.cost) }}</span>
            </div>
            <div class="reset-btns">
              <button class="btn btn-warn" @click="resetCost({ market: h.market, code: h.code })">确认重置</button>
              <button class="btn btn-ghost" @click="cancelReset">取消</button>
            </div>
          </div>

          <!-- Trade header -->
          <div class="trade-tbl-hdr">
            <div v-for="s in ['日期','类型','数量（股）','成本价','']" :key="s">{{ s }}</div>
          </div>

          <!-- Trade rows -->
          <div v-for="t in h.trades" :key="t.id" class="trade-row">
            <template v-if="editingTrade && editingTrade.holdingMarket === h.market && editingTrade.holdingCode === h.code && editingTrade.tradeId === t.id">
              <input class="field field-sm" type="date" v-model="editingTrade.date" />
              <span class="trade-type" :class="t.qty >= 0 ? 'type-buy' : 'type-sell'">
                {{ t.qty >= 0 ? '买入' : '卖出' }}
              </span>
              <input class="field field-sm" type="number" v-model="editingTrade.qty" />
              <input class="field field-sm" type="number" v-model="editingTrade.price" />
              <div class="trade-btns">
                <button class="btn btn-save" @click="updateTrade">保存</button>
                <button class="btn btn-ghost" @click="editingTrade = null">取消</button>
              </div>
            </template>
            <template v-else>
              <span class="mono trade-date">{{ t.date }}</span>
              <span class="trade-type" :class="t.qty >= 0 ? 'type-buy' : 'type-sell'">
                {{ t.qty >= 0 ? '买入' : '卖出' }}
              </span>
              <span class="mono trade-qty">{{ Math.abs(t.qty) }}</span>
              <span class="mono trade-price">{{ SYM[h.ccy] }}{{ fmt(t.price) }}</span>
              <div class="trade-btns">
                <span v-if="t.note" class="trade-note" :title="t.note">{{ t.note }}</span>
                <button class="btn btn-ghost" style="font-size:11px"
                  @click="editingTrade = { holdingMarket: h.market, holdingCode: h.code, tradeId: t.id, date: t.date, qty: t.qty, price: t.price }">
                  修改
                </button>
                <div v-if="h.trades.length > 1" class="trade-more-wrap" @click.stop>
                  <button class="btn btn-ghost trade-more-btn" @click.stop="toggleTradeActionMenu(`${h.market}-${h.code}-${t.id}`)">⋯</button>
                  <div v-if="openTradeActionMenuKey === `${h.market}-${h.code}-${t.id}`" class="trade-more-menu">
                    <button class="trade-more-item trade-more-item-danger" @click.stop="deleteTrade({ market: h.market, code: h.code }, t.id); closeTradeActionMenu()">删除记录</button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Price refresh -->
          <div class="price-edit-row">
            <span class="price-label">当前价格</span>
            <span class="mono" style="font-size:13px;font-weight:600">{{ SYM[h.ccy] }}{{ fmt(h.price) }}</span>
            <button class="btn btn-ghost" style="font-size:11px"
              @click="refreshSingleQuote(h)">
              <svg :class="{ 'spin': h.refreshing }" width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:middle;margin-right:3px">
                <path d="M1.5 7a5.5 5.5 0 0 1 9.3-3.95M12.5 7a5.5 5.5 0 0 1-9.3 3.95" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M10.8.5v2.55h-2.55M3.2 13.5v-2.55h2.55" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ h.refreshing ? '刷新中…' : '刷新' }}
            </button>
          </div>
          </div>
        </transition>

        <div v-if="deletingHoldings.includes(`${h.market}-${h.code}`)" class="delete-blessing">
          <span v-for="char in blessingChars" :key="char" class="blessing-char">{{ char }}</span>
        </div>
      </div>
      </transition-group>

      <div v-if="filtered.length === 0" class="empty-hint">
        暂无持仓，点击上方「添加持仓」开始记录
      </div>

        </div>
        </template>
      </transition>
    </div>

    <!-- ── Add Trade Modal ── -->
    <div v-if="addTradeTarget" class="overlay" @click.self="addTradeTarget = null">
      <div class="modal">
        <div class="modal-title">新增交易</div>
        <div class="form-grid">
          <div class="form-row">
            <div class="form-label">交易类型</div>
            <select class="form-control" v-model="addTradeForm.type"
              :style="{ color: addTradeForm.type === '卖出' ? '#c0392b' : '#1a7a4a' }">
              <option value="买入">买入</option>
              <option value="卖出">卖出</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-label">数量（股）</div>
            <input class="form-control" type="number" placeholder="如 100" v-model="addTradeForm.qty" />
          </div>
          <div class="form-row">
            <div class="form-label">价格（{{ addTradeTarget.ccy }}）</div>
            <input class="form-control" type="number" step="0.01"
              :placeholder="`如 ${addTradeTarget.avgCost}`" v-model="addTradeForm.price" />
          </div>
          <div class="form-row">
            <div class="form-label">日期</div>
            <input class="form-control" type="date" v-model="addTradeForm.date" />
          </div>
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">变动笔记（可选）</div>
            <input class="form-control" placeholder="如 加仓、减仓、分红再投..." v-model="addTradeForm.note" />
          </div>
        </div>
        <div class="modal-footer">
          <div v-if="tradeError" style="color:#c0392b;font-size:12px;margin-right:auto">{{ tradeError }}</div>
          <button class="btn btn-ghost" style="padding:9px 18px" @click="tradeError='';addTradeTarget = null">取消</button>
          <button class="btn btn-ink" style="padding:9px 22px" @click="saveAddTrade">确认</button>
        </div>
      </div>
    </div>

    <!-- ── Add Holding Modal ── -->
    <div v-if="addHolding" class="overlay" @click.self="addHolding = false">
      <div class="modal">
        <div class="modal-title">添加持仓</div>
        <div class="form-grid">
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">市场</div>
            <div class="market-toggle-group">
              <button
                v-for="m in MARKET_OPTIONS"
                :key="m"
                type="button"
                :class="['market-toggle', { active: newForm.market === m }]"
                @click="selectNewHoldingMarket(m)"
              >
                {{ m }}
              </button>
            </div>
          </div>
          <div class="form-row">
            <div class="form-label">股票代码</div>
            <input class="form-control" placeholder="如 600519" v-model="newForm.code" @blur="handleCodeBlur" />
          </div>
          <div class="form-row">
            <div class="form-label">股票名称{{ nameLoading ? ' (获取中…)' : '' }}</div>
            <input class="form-control" placeholder="自动获取或手动输入" v-model="newForm.name" />
          </div>
          <div class="form-row">
            <div class="form-label">持仓数量（股）</div>
            <input class="form-control" type="number" placeholder="100" v-model="newForm.qty" />
          </div>
          <div class="form-row">
            <div class="form-label">成本价</div>
            <input class="form-control" type="number" placeholder="0.00" v-model="newForm.price" />
          </div>
          <div class="form-row">
            <div class="form-label">日期</div>
            <input class="form-control" type="date" v-model="newForm.date" />
          </div>
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">板块（可选）</div>
            <input class="form-control" placeholder="如 科技、消费" v-model="newForm.sector" />
          </div>
        </div>
        <div class="modal-footer">
          <div v-if="addError" style="color:#c0392b;font-size:12px;margin-right:auto">{{ addError }}</div>
          <button class="btn btn-ghost" style="padding:9px 18px" @click="addError='';addHolding = false">取消</button>
          <button class="btn btn-ink" style="padding:9px 22px" @click="saveNewHolding">确认添加</button>
        </div>
      </div>
    </div>

    <!-- ── Delete Confirm Modal ── -->
    <div v-if="deleteConfirm !== null" class="overlay" @click.self="cancelDelete">
      <div class="modal">
        <div class="modal-title">确认删除</div>
        <div style="margin: 20px 0; font-size: 14px; line-height: 1.5; text-align: center; color: #666;">
          确定要删除此持仓吗？<br>
          <span style="color: #c0392b; font-weight: 500;">此操作不可撤销</span>
        </div>
        <div class="modal-footer" style="justify-content: center; gap: 20px;">
          <button class="btn btn-ghost" style="padding: 10px 24px; min-width: 100px; font-size: 14px;" @click="cancelDelete">取消</button>
          <button class="btn btn-warn" style="padding: 10px 24px; min-width: 100px; font-size: 14px; color: #c0392b; border-color: #c0392b;" @click="deleteHolding">确认删除</button>
        </div>
      </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PnLTag from '../components/PnLTag.vue'
import Tag from '../components/Tag.vue'
import { useAppStore } from '../store/index.js'
import { fetchQuote } from '../lib/quoteApi.js'
import * as api from '../lib/api.js'
import { exportCSV, exportPDF, importCSV } from '../lib/io.js'
import { avgCost, totalQty, fmt, toCNY, SYM, TABS, MARKET_OPTIONS, today } from '../composables/helpers.js'

export default {
  components: { PnLTag, Tag },
  props: {
    id: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const router = useRouter()
    const route = useRoute()
    const store = useAppStore()
    
    // 状态
    let _id = 100
    const holdings = ref([])
    const tab = ref('全部')
    const expanded = ref(null)
    const editingTrade = ref(null)
    const resetTarget = ref(null)
    const resetPrice = ref('')
    const addTradeTarget = ref(null)
    const addTradeForm = ref({ type: '买入', qty: '', price: '', date: today(), note: '' })
    const addHolding = ref(false)
    const newForm = ref({ market: 'A股', code: '', name: '', sector: '', qty: '100', price: '', date: today() })
    const deletingHoldings = ref([])
    const blessingChars = ['恭', '喜', '发', '财']
    const showBlessingEffect = ref(false)
    const blessingEffectKey = ref(0)
    const openLedgerActionMenuId = ref(null)
    const openTradeActionMenuKey = ref(null)
    const showLedgerList = ref(false)
    const showDropdown = ref(false)
    const createLedgerModal = ref(false)
    const editLedgerModal = ref(false)
    const deleteLedgerConfirm = ref(null)
    const newLedgerName = ref('')
    const newLedgerColor = ref('#1a1814')
    const editingLedger = ref({ id: null, name: '', color: '#1a1814' })
    const showHoldingIOMenu = ref(false)
    const importInput = ref(null)
    const tradeError = ref('')
    const addError = ref('')
    const deleteConfirm = ref(null)
    const nameLoading = ref(false)
    const errorModal = ref({ visible: false, message: '', detail: '', expanded: false })
    const fxList = [
      { label: 'USD/CNY', key: 'USD' },
      { label: 'HKD/CNY', key: 'HKD' },
    ]
    
    // 账本颜色选项
    const ledgerColors = [
      '#1a1814', '#1a7a4a', '#c0392b', '#1a6fa8', '#8e44ad',
      '#f39c12', '#e74c3c', '#3498db', '#27ae60', '#9b59b6'
    ]
    
    // 应用主题样式
    const appThemeStyle = computed(() => {
      const theme = store.currentLedger?.color || '#1a1814'
      return { '--ledger-theme': theme }
    })
    
    // 计算持仓数据
    const enriched = computed(() => store.holdings.map(h => {
      const ccy = h.market === 'A股' ? 'CNY' : h.market === '港股' ? 'HKD' : 'USD'
      const price = store.prices[h.code] || 0
      const qty = totalQty(h.trades || [])
      const cost = avgCost(h.trades || [])
      const mv = price * qty
      const costBasis = cost * qty
      const pnl = mv - costBasis
      const pct = costBasis > 0 ? pnl / costBasis * 100 : 0
      return { ...h, ccy, price, qty, cost, mv, costBasis, pnl, pct }
    }))
    
    // 过滤后的持仓
    const filtered = computed(() =>
      tab.value === '全部' ? enriched.value : enriched.value.filter(h => h.market === tab.value)
    )
    
    // 汇总信息
    const summary = computed(() => {
      const byCcy = { CNY: 0, HKD: 0, USD: 0 }
      const byCcyCost = { CNY: 0, HKD: 0, USD: 0 }
      enriched.value.forEach(h => {
        byCcy[h.ccy] += h.mv
        byCcyCost[h.ccy] += h.costBasis
      })
      const totalCNY = toCNY(byCcy.CNY, 'CNY', store.fx) + toCNY(byCcy.HKD, 'HKD', store.fx) + toCNY(byCcy.USD, 'USD', store.fx)
      const totalCostCNY = toCNY(byCcyCost.CNY, 'CNY', store.fx) + toCNY(byCcyCost.HKD, 'HKD', store.fx) + toCNY(byCcyCost.USD, 'USD', store.fx)
      const pnl = totalCNY - totalCostCNY
      const pct = totalCostCNY > 0 ? pnl / totalCostCNY * 100 : 0
      return { byCcy, totalCNY, pnl, pct }
    })
    
    // 货币分类
    const ccyBreakdown = computed(() => [
      { label: 'A股', ccy: 'CNY', val: summary.value.byCcy.CNY },
      { label: '港股', ccy: 'HKD', val: summary.value.byCcy.HKD },
      { label: '美股', ccy: 'USD', val: summary.value.byCcy.USD },
    ])
    
    // 触发祝福效果
    const triggerBlessingEffect = (duration = 1800) => {
      blessingEffectKey.value += 1
      showBlessingEffect.value = true
      setTimeout(() => {
        showBlessingEffect.value = false
      }, duration)
    }
    
    // 生成交易ID
    const mkTrade = (date, qty, price, note = '') => ({ id: ++_id, date, qty, price, note })
    
    // 打开添加持仓
    const openAddHolding = () => {
      Object.assign(newForm.value, { market: 'A股', code: '', name: '', sector: '', qty: '100', price: '', date: today() })
      addError.value = ''
      addHolding.value = true
    }
    
    // 选择市场
    const selectNewHoldingMarket = (market) => {
      newForm.value.market = market
    }
    
    // 处理代码输入完成
    const handleCodeBlur = async () => {
      if (!newForm.value.code) return
      nameLoading.value = true
      try {
        const result = await fetchQuote(newForm.value.market, newForm.value.code)
        if (result.name) {
          newForm.value.name = result.name
        }
      } catch (err) {
        console.warn('获取股票名称失败:', err)
      } finally {
        nameLoading.value = false
      }
    }
    
    // 保存新持仓
    const saveNewHolding = async () => {
      if (!newForm.value.code || !newForm.value.name || !newForm.value.price || !newForm.value.qty) {
        addError.value = '请填写完整信息'
        return
      }

      const newHolding = {
        id: ++_id,
        market: newForm.value.market,
        code: newForm.value.code,
        name: newForm.value.name,
        sector: newForm.value.sector,
        trades: [mkTrade(newForm.value.date, parseInt(newForm.value.qty), parseFloat(newForm.value.price))]
      }

      const rollback = [...store.holdings]
      store.holdings.push(newHolding)

      try {
        await store.saveHoldings(store.holdings)
        addHolding.value = false
        triggerBlessingEffect()
        store.showMessage('持仓添加成功')
      } catch (err) {
        store.holdings = rollback
        addError.value = '添加失败: ' + err.message
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 打开添加交易
    const openAddTrade = (target) => {
      const holding = store.holdings.find(h => h.market === target.market && h.code === target.code)
      if (!holding) return
      
      const ccy = target.market === 'A股' ? 'CNY' : target.market === '港股' ? 'HKD' : 'USD'
      const avgCostValue = avgCost(holding.trades || [])
      
      addTradeTarget.value = {
        market: target.market,
        code: target.code,
        ccy,
        avgCost: avgCostValue
      }
      addTradeForm.value = { type: '买入', qty: '', price: '', date: today(), note: '' }
      tradeError.value = ''
    }
    
    // 保存添加的交易
    const saveAddTrade = async () => {
      if (!addTradeTarget.value) return
      if (!addTradeForm.value.qty || !addTradeForm.value.price) {
        tradeError.value = '请填写数量和价格'
        return
      }

      const qty = parseInt(addTradeForm.value.qty)
      const price = parseFloat(addTradeForm.value.price)
      const actualQty = addTradeForm.value.type === '买入' ? qty : -qty

      const holding = store.holdings.find(h => h.market === addTradeTarget.value.market && h.code === addTradeTarget.value.code)
      if (!holding) {
        tradeError.value = '持仓不存在'
        return
      }

      const rollback = JSON.parse(JSON.stringify(store.holdings))
      holding.trades.push(mkTrade(addTradeForm.value.date, actualQty, price, addTradeForm.value.note))

      try {
        await store.saveHoldings(store.holdings)
        addTradeTarget.value = null
        triggerBlessingEffect()
        store.showMessage('交易记录添加成功')
      } catch (err) {
        store.holdings = rollback
        tradeError.value = '添加失败: ' + err.message
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 更新交易
    const updateTrade = async () => {
      if (!editingTrade.value) return

      const holding = store.holdings.find(h => h.market === editingTrade.value.holdingMarket && h.code === editingTrade.value.holdingCode)
      if (!holding) return

      const trade = holding.trades.find(t => t.id === editingTrade.value.tradeId)
      if (!trade) return

      const rollback = JSON.parse(JSON.stringify(store.holdings))
      trade.date = editingTrade.value.date
      trade.qty = parseInt(editingTrade.value.qty)
      trade.price = parseFloat(editingTrade.value.price)

      try {
        await store.saveHoldings(store.holdings)
        editingTrade.value = null
        triggerBlessingEffect()
        store.showMessage('交易记录更新成功')
      } catch (err) {
        store.holdings = rollback
        store.showMessage('更新失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 删除交易
    const deleteTrade = async (holdingInfo, tradeId) => {
      const holding = store.holdings.find(h => h.market === holdingInfo.market && h.code === holdingInfo.code)
      if (!holding || holding.trades.length <= 1) return

      const rollback = JSON.parse(JSON.stringify(store.holdings))
      holding.trades = holding.trades.filter(t => t.id !== tradeId)

      try {
        await store.saveHoldings(store.holdings)
        triggerBlessingEffect()
        store.showMessage('交易记录删除成功')
      } catch (err) {
        store.holdings = rollback
        store.showMessage('删除失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 切换交易菜单
    const toggleTradeActionMenu = (tradeKey) => {
      openTradeActionMenuKey.value = openTradeActionMenuKey.value === tradeKey ? null : tradeKey
    }
    
    // 关闭交易菜单
    const closeTradeActionMenu = () => {
      openTradeActionMenuKey.value = null
    }
    
    // 切换重置成本
    const toggleReset = (target) => {
      if (resetTarget.value && resetTarget.value.market === target.market && resetTarget.value.code === target.code) {
        resetTarget.value = null
        resetPrice.value = ''
      } else {
        resetTarget.value = target
        resetPrice.value = ''
      }
    }
    
    // 取消重置
    const cancelReset = () => {
      resetTarget.value = null
      resetPrice.value = ''
    }
    
    // 重置成本
    const resetCost = async (target) => {
      if (!resetTarget.value) return

      const holding = store.holdings.find(h => h.market === target.market && h.code === target.code)
      if (!holding) return

      const totalQtyValue = totalQty(holding.trades)
      const newPrice = resetPrice.value ? parseFloat(resetPrice.value) : avgCost(holding.trades)

      const rollback = JSON.parse(JSON.stringify(store.holdings))
      holding.trades = [mkTrade(today(), totalQtyValue, newPrice, '成本重置')]

      try {
        await store.saveHoldings(store.holdings)
        resetTarget.value = null
        resetPrice.value = ''
        triggerBlessingEffect()
        store.showMessage('成本重置成功')
      } catch (err) {
        store.holdings = rollback
        store.showMessage('重置失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 确认删除持仓
    const confirmDeleteHolding = (target) => {
      deleteConfirm.value = target
    }
    
    // 取消删除
    const cancelDelete = () => {
      deleteConfirm.value = null
    }
    
    // 删除持仓
    const deleteHolding = async () => {
      if (!deleteConfirm.value) return

      const holdingKey = `${deleteConfirm.value.market}-${deleteConfirm.value.code}`
      deletingHoldings.value.push(holdingKey)

      const rollback = JSON.parse(JSON.stringify(store.holdings))
      store.holdings = store.holdings.filter(h => h.market !== deleteConfirm.value.market || h.code !== deleteConfirm.value.code)

      try {
        await store.saveHoldings(store.holdings)
        deleteConfirm.value = null
        setTimeout(() => {
          deletingHoldings.value = deletingHoldings.value.filter(key => key !== holdingKey)
        }, 800)
        triggerBlessingEffect()
        store.showMessage('持仓删除成功')
      } catch (err) {
        store.holdings = rollback
        deletingHoldings.value = deletingHoldings.value.filter(key => key !== holdingKey)
        store.showMessage('删除失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 刷新单个股票行情
    const refreshSingleQuote = async (holding) => {
      holding.refreshing = true
      try {
        const result = await fetchQuote(holding.market, holding.code)
        if (result.price > 0) {
          store.prices[holding.code] = result.price
          await store.calculateAllLedgerSummaries()
        }
      } catch (err) {
        console.warn('刷新行情失败:', err)
      } finally {
        holding.refreshing = false
      }
    }
    
    // 处理导出 CSV
    const handleExportCSV = () => {
      exportCSV(store.holdings, store.prices, store.fx)
    }
    
    // 处理导出 PDF
    const handleExportPDF = () => {
      exportPDF(store.holdings, store.prices, store.fx)
    }
    
    // 触发导入
    const triggerImport = () => {
      if (importInput.value) importInput.value.click()
    }
    
    // 处理导入
    const handleImport = async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const data = await importCSV(file)
        if (!data.isMultiLedger) {
          store.holdings = data.holdings
          await store.saveHoldings(store.holdings)
          store.showMessage(`导入成功，共 ${data.holdings.length} 条持仓`)
        } else {
          store.showMessage('请先选择一个账本再导入', true)
        }
      } catch (err) {
        store.showMessage('导入失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }

      if (importInput.value) importInput.value.value = ''
    }
    
    // 打开创建账本
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
        goHome()
        await store.loadData()
        triggerBlessingEffect()
        store.showMessage('账本删除成功')
      } catch (err) {
        store.showMessage('删除账本失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 切换账本
    const switchLedger = (ledger) => {
      store.setCurrentLedger(ledger)
      router.push(`/ledger/${ledger.id}`)
    }
    
    // 回到首页
    const goHome = () => {
      store.setCurrentLedger(null)
      router.push('/home')
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
    
    // 页面加载时
    onMounted(async () => {
      // 加载账本数据
      await store.loadData()
      
      // 找到当前账本
      const ledger = store.ledgers.find(l => l.id.toString() === props.id)
      if (ledger) {
        store.setCurrentLedger(ledger)
        // 加载当前账本的持仓
        try {
          const savedHoldings = await api.loadHoldings(ledger.id)
          store.holdings = savedHoldings || []
          if (savedHoldings && savedHoldings.length > 0) {
            const maxId = Math.max(...savedHoldings.flatMap(h => (h.trades || []).map(t => t.id)), ...savedHoldings.map(h => h.id), 0)
            _id = maxId + 1
          } else {
            _id = 100
          }
        } catch (err) {
          console.warn('加载持仓失败:', err)
          store.holdings = []
        }
      } else {
        // 账本不存在，回到首页
        goHome()
      }
    })
    
    return {
      store,
      tab,
      expanded,
      editingTrade,
      resetTarget,
      resetPrice,
      addTradeTarget,
      addTradeForm,
      addHolding,
      newForm,
      deletingHoldings,
      blessingChars,
      showBlessingEffect,
      blessingEffectKey,
      openLedgerActionMenuId,
      openTradeActionMenuKey,
      showLedgerList,
      showDropdown,
      createLedgerModal,
      editLedgerModal,
      deleteLedgerConfirm,
      newLedgerName,
      newLedgerColor,
      editingLedger,
      showHoldingIOMenu,
      importInput,
      tradeError,
      addError,
      deleteConfirm,
      nameLoading,
      errorModal,
      fxList,
      ledgerColors,
      TABS,
      MARKET_OPTIONS,
      appThemeStyle,
      filtered,
      summary,
      ccyBreakdown,
      fmt,
      SYM,
      triggerBlessingEffect,
      openAddHolding,
      selectNewHoldingMarket,
      handleCodeBlur,
      saveNewHolding,
      openAddTrade,
      saveAddTrade,
      updateTrade,
      deleteTrade,
      toggleTradeActionMenu,
      closeTradeActionMenu,
      toggleReset,
      cancelReset,
      resetCost,
      confirmDeleteHolding,
      cancelDelete,
      deleteHolding,
      refreshSingleQuote,
      handleExportCSV,
      handleExportPDF,
      triggerImport,
      handleImport,
      openCreateLedger,
      saveNewLedger,
      editLedger,
      saveEditLedger,
      confirmDeleteLedger,
      deleteSelectedLedger,
      switchLedger,
      goHome,
      handleLogout,
      showErrorDetailModal,
      closeErrorModal,
      copyErrorDetail
    }
  }
}
</script>