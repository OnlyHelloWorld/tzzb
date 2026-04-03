<template>
  <transition name="page" mode="out-in">
    <LoginPage v-if="!isLoggedIn" key="login" @login="handleLogin" :loginError="loginError" />
    <div v-else key="app" class="app-root">
    <!-- ── Header ── -->
    <div class="header">
      <div class="header-left" :style="{ cursor: currentLedger ? 'pointer' : 'default' }" @click="currentLedger && goHome()">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="#1a1814"/>
          <path d="M7 9h14M7 14h10M7 19h12" stroke="#f9f7f3" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="21" cy="19" r="3.5" fill="#c4a050"/>
        </svg>
        <span class="app-title">投资账本</span>
      </div>
      <div v-if="!currentLedger" class="header-right">
        <button class="btn btn-ink" @click="openCreateLedger">+ 新建账本</button>
      </div>
      <div v-else class="header-right">
        <div class="header-actions-group">
          <span class="ledger-badge" :style="{ backgroundColor: currentLedger.color, color: '#fff' }">
            {{ currentLedger.name }}
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
              <button class="dropdown-item" @click="refreshQuotes(); showDropdown = false;" :disabled="quoteStatus === 'loading'">
                <svg :class="{ 'spin': quoteStatus === 'loading' }" width="12" height="12" viewBox="0 0 14 14" fill="none" style="vertical-align:middle;margin-right:6px">
                  <path d="M1.5 7a5.5 5.5 0 0 1 9.3-3.95M12.5 7a5.5 5.5 0 0 1-9.3 3.95" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M10.8.5v2.55h-2.55M3.2 13.5v-2.55h2.55" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ quoteStatus === 'loading' ? '获取中…' : '刷新行情' }}
              </button>
              <div v-if="quoteStatus" class="quote-status-inline">
                <span :class="['quote-status', quoteStatus]">
                  {{ quoteStatus === 'loading' ? '加载中...' : quoteStatus === 'error' ? '行情异常' : lastQuoteTime }}
                </span>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="handleLogout(); showDropdown = false;" style="color: #c0392b;">退出</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ledger dropdown -->
      <div v-if="showLedgerList" class="ledger-dropdown">
        <div v-for="ledger in ledgers" :key="ledger.id" class="ledger-item" @click="switchLedger(ledger)">
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
      <div v-if="isLoading" class="section-loading">
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
        <template v-if="!isLoading">
        <!-- Ledger management page -->
        <div v-if="!currentLedger" key="ledger-management" class="ledger-management">
        <!-- 所有账本汇总卡片 -->
        <div class="summary-card" v-if="ledgers.length > 0">
          <div class="summary-row" style="justify-content: space-between; align-items: center;">
            <div>
              <div class="summary-label">所有账本总市值（人民币）</div>
              <div class="big-num" style="font-size: 28px;">¥ {{ fmt(allLedgersSummary.totalCNY) }}</div>
            </div>
            <div style="text-align: right; margin-left: 20px;">
              <div class="summary-label">账本数量</div>
              <div style="font-size: 32px; font-weight: 600; color: #1a1814;">{{ ledgers.length }}</div>
            </div>
          </div>
          <div class="summary-row">
            <div class="summary-pnl">
              <PnLTag :val="allLedgersSummary.pnl" :pct="allLedgersSummary.pct" :size="14" />
              <span class="pnl-abs">{{ allLedgersSummary.pnl >= 0 ? '+' : '' }}¥{{ fmt(allLedgersSummary.pnl) }}</span>
            </div>
          </div>
          <div class="ccy-row">
            <div v-for="item in allLedgersCcyBreakdown" :key="item.ccy" class="ccy-chip">
              <Tag :market="item.label" /> &thinsp;
              <span>{{ SYM[item.ccy] }}{{ fmt(item.val) }}</span>
              <span v-if="item.ccy !== 'CNY'" class="ccy-conv"> ≈ ¥{{ fmt(toCNY(item.val, item.ccy, fx)) }}</span>
            </div>
          </div>
          <!-- ── Import/Export for all ledgers ── -->
          <div class="ledger-io-section">
            <div class="io-btns">
              <button class="btn btn-ghost" style="font-size:11px" @click="handleExportAllLedgersCSV">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="vertical-align:middle;margin-right:4px">
                  <path d="M6 1v6m0 0l-2.5-2.5M6 7l2.5-2.5M2 11h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                导出所有账本 CSV
              </button>
              <button class="btn btn-ink" style="font-size:11px" @click="triggerAllLedgersImport">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="vertical-align:middle;margin-right:4px">
                  <path d="M6 11V5m0 0l-2.5 2.5M6 5l2.5 2.5M2 1h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                导入账本 CSV
              </button>
              <input ref="allLedgersImportInput" type="file" accept=".csv" style="display:none" @change="handleAllLedgersImport" />
            </div>
            <div v-if="ioMessage" class="io-message" :class="ioMessageClass">{{ ioMessage }}</div>
          </div>
        </div>

        <div class="ledgers-grid">
          <div
            v-for="summary in ledgerSummaries"
            :key="summary.id"
            :class="['ledger-card', { 'ledger-celebrating': celebratingLedgers.includes(summary.id) }]"
            @click="switchLedger(summary)"
          >
            <div class="ledger-card-header" :style="{ backgroundColor: summary.color }"></div>
            <div class="ledger-card-body">
              <h3>{{ summary.name }}</h3>
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
            <div v-if="celebratingLedgers.includes(summary.id)" class="delete-blessing">
              <span v-for="char in blessingChars" :key="char" class="blessing-char">{{ char }}</span>
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
      
        <!-- Holding management (existing content) -->
        <div v-else key="holding-management">

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
            <span v-if="item.ccy !== 'CNY'" class="ccy-conv"> ≈ ¥{{ fmt(toCNY(item.val, item.ccy, fx)) }}</span>
          </div>
        </div>
        <div class="fx-section">
          <div class="fx-bar">
            <span class="fx-label">汇率</span>
            <div v-for="item in fxList" :key="item.key" class="fx-chip">
              <span>{{ item.label }}</span>
              <span class="fx-value">{{ fx[item.key] }}</span>
            </div>
            <!-- Auto refresh toggle -->
            <div class="fx-chip">
              <span>行情自动刷新（60s）</span>
              <label class="toggle-switch">
                <input type="checkbox" v-model="autoRefresh" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- ── Import/Export ── -->
        <div class="io-section">
          <div class="io-label">导入导出</div>
          <div class="io-btns">
            <button class="btn btn-ghost" style="font-size:11px" @click="handleExportCSV">导出 CSV</button>
            <button class="btn btn-ghost" style="font-size:11px" @click="handleExportPDF">导出 PDF</button>
            <button class="btn btn-ghost" style="font-size:11px" @click="triggerImport">导入 CSV</button>
            <input ref="importInput" type="file" accept=".csv" style="display:none" @change="handleImport" />
          </div>
          <div v-if="ioMessage" class="io-message" :class="ioMessageClass">{{ ioMessage }}</div>
        </div>
      </div>

      <!-- ── Error banner ── -->
      <div v-if="quoteError" class="error-banner">
        <span>⚠️ {{ quoteError }}</span>
        <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;margin-left:8px" @click="quoteError=''">关闭</button>
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
        :class="['row', {
          'row-updating': h.refreshing,
          'row-deleting': deletingHoldings.includes(`${h.market}-${h.code}`),
          'row-celebrating': celebratingHoldings.includes(`${h.market}-${h.code}`)
        }]"
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
                <button v-if="h.trades.length > 1" class="btn btn-warn" style="font-size:11px"
                  @click="deleteTrade({ market: h.market, code: h.code }, t.id)">删除</button>
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

        <div v-if="deletingHoldings.includes(`${h.market}-${h.code}`) || celebratingHoldings.includes(`${h.market}-${h.code}`)" class="delete-blessing">
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
            <select class="form-control" v-model="newForm.market">
              <option v-for="m in ['A股','港股','美股']" :key="m">{{ m }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-label">股票代码</div>
            <input class="form-control" placeholder="如 600519" v-model="newForm.code" @blur="newForm.code = newForm.code.toUpperCase().trim(); onCodeChange(newForm.code)" />
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
  </div>
  </transition>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import PnLTag from './components/PnLTag.vue'
import Tag from './components/Tag.vue'
import LoginPage from './components/LoginPage.vue'
import { fetchQuotes, fetchQuote, fetchFxRates } from './lib/quoteApi.js'
import * as api from './lib/api.js'
import { exportCSV, exportPDF, importCSV, exportAllLedgersCSV } from './lib/io.js'

// ─── Constants ──────────────────────────────────────────────────
const SYM = { CNY: '¥', HKD: 'HK$', USD: '$' }
const MARKET_CCY = { 'A股': 'CNY', '港股': 'HKD', '美股': 'USD' }
const MARKET_COLOR = { 'A股': '#c0392b', '港股': '#1a6fa8', '美股': '#1a7a4a' }
const MARKET_BG = { 'A股': '#fdf0ef', '港股': '#eef4fb', '美股': '#edf7f1' }
const TABS = ['全部', 'A股', '港股', '美股']

// ─── Initial data ───────────────────────────────────────────────
let _id = 100
const mkTrade = (date, qty, price) => ({ id: ++_id, date, qty, price })

const INITIAL_HOLDINGS = [
  { id: 1, market: 'A股',  code: '600519', name: '贵州茅台', sector: '消费', trades: [mkTrade('2023-06-01', 5, 1650), mkTrade('2024-01-15', 5, 1710)] },
  { id: 2, market: 'A股',  code: '300750', name: '宁德时代', sector: '新能源', trades: [mkTrade('2023-09-20', 50, 198)] },
  { id: 3, market: '港股', code: '00700',  name: '腾讯控股', sector: '科技',  trades: [mkTrade('2023-04-10', 100, 312), mkTrade('2024-03-01', 50, 298)] },
  { id: 4, market: '港股', code: '09988',  name: '阿里巴巴', sector: '电商',  trades: [mkTrade('2024-02-28', 200, 85)] },
  { id: 5, market: '美股', code: 'AAPL',   name: '苹果',     sector: '科技',  trades: [mkTrade('2022-11-01', 10, 148), mkTrade('2023-07-20', 10, 192)] },
  { id: 6, market: '美股', code: 'NVDA',   name: '英伟达',   sector: '半导体', trades: [mkTrade('2023-01-05', 15, 160), mkTrade('2023-10-30', 5, 430)] },
]

const INITIAL_PRICES = { '600519': 1732.5, '300750': 185.2, '00700': 381.6, '09988': 92.3, AAPL: 189.4, NVDA: 875.4 }

// ─── Helpers ────────────────────────────────────────────────────
const avgCost = (trades) => {
  const totQty = trades.reduce((s, t) => s + t.qty, 0)
  return totQty > 0 ? trades.reduce((s, t) => s + t.qty * t.price, 0) / totQty : 0
}
const totalQty = (trades) => trades.reduce((s, t) => s + t.qty, 0)
const fmt = (n, d = 2) => Number(n).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d })
const toCNY = (val, ccy, fx) => ccy === 'CNY' ? val : val * (fx[ccy] || 1)
const today = () => new Date().toISOString().slice(0, 10)

// ─── Sub-components ─────────────────────────────────────────────

// ─── Main App ───────────────────────────────────────────────────
export default {
  components: { PnLTag, Tag, LoginPage },
  setup() {
    // State
    const holdings = ref([])
    const prices = reactive({})
    const fx = reactive({ USD: 7.28, HKD: 0.925 })
    const autoRefresh = ref(true)
    const tab = ref('全部')
    const expanded = ref(null)
    const editingTrade = ref(null)
    const resetTarget = ref(null)
    const resetPrice = ref('')
    const addTradeTarget = ref(null)
    const addTradeForm = reactive({ type: '买入', qty: '', price: '', date: '', note: '' })
    const addHolding = ref(false)
    const newForm = reactive({ market: 'A股', code: '', name: '', sector: '', qty: '100', price: '', date: today() })
    const deletingHoldings = ref([])
    const celebratingHoldings = ref([])
    const celebratingLedgers = ref([])
    const blessingChars = ['恭', '喜', '发', '财']

    // Ledger state
    const ledgers = ref([])
    const ledgerSummaries = ref([])
    const currentLedger = ref(null)
    const allLedgersHoldings = ref([])
    const showLedgerList = ref(false)
    const showDropdown = ref(false)
    const createLedgerModal = ref(false)
    const editLedgerModal = ref(false)
    const deleteLedgerConfirm = ref(null)
    const newLedgerName = ref('')
    const newLedgerColor = ref('#1a1814')
    const editingLedger = ref({ id: null, name: '', color: '#1a1814' })
    
    // 更新页面标题的函数
    const updatePageTitle = () => {
      if (currentLedger.value) {
        document.title = `投资账本_${currentLedger.value.name}`
      } else {
        document.title = '投资账本_首页'
      }
    }
    
    // Available ledger colors
    const ledgerColors = [
      '#1a1814', '#1a7a4a', '#c0392b', '#1a6fa8', '#8e44ad',
      '#f39c12', '#e74c3c', '#3498db', '#27ae60', '#9b59b6'
    ]

    const openAddHolding = () => {
      Object.assign(newForm, { market: 'A股', code: '', name: '', sector: '', qty: '100', price: '', date: today() })
      addError.value = ''
      addHolding.value = true
    }

    // Quote state
    const quoteStatus = ref('idle') // idle | loading | ok | error
    const quoteError = ref('')
    const lastQuoteTime = ref('')
    let refreshTimer = null
    
    // Global loading state
    const isLoading = ref(false)

    // IO state
    const importInput = ref(null)
    const allLedgersImportInput = ref(null)
    const ioMessage = ref('')
    const loginError = ref('')
    const isLoggedIn = ref(api.isLoggedIn())
    // 计算单个账本的汇总信息
    const calculateLedgerSummary = async (ledger) => {
      try {
        const holdings = await api.loadHoldings(ledger.id)
        if (!holdings || holdings.length === 0) {
          return { ...ledger, totalCNY: 0, pnl: 0, pct: 0, holdingCount: 0 }
        }

        let totalCostCNY = 0
        let totalMVCNY = 0

        for (const h of holdings) {
          const ccy = MARKET_CCY[h.market]
          const cost = avgCost(h.trades || [])
          const qty = totalQty(h.trades)
          const price = prices[h.code] || cost || 0
          const costBasis = cost * qty
          const mv = price * qty
          
          totalCostCNY += toCNY(costBasis, ccy, fx)
          totalMVCNY += toCNY(mv, ccy, fx)
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
    }

    // 加载数据的函数
    const loadData = async () => {
      isLoading.value = true
      try {
        try {
          // 首先加载账本数据
          const savedLedgers = await api.loadLedgers()
          ledgers.value = savedLedgers || []
          console.log('加载到账本数据:', savedLedgers)
          
          // 从localStorage恢复currentLedger
          const savedCurrentLedgerId = localStorage.getItem('investment-current-ledger-id')
          if (savedCurrentLedgerId && ledgers.value.length > 0) {
            const savedLedger = ledgers.value.find(l => l.id === parseInt(savedCurrentLedgerId))
            if (savedLedger) {
              currentLedger.value = savedLedger
            }
          }
          
          // 加载所有持仓数据（用于所有账本汇总）
          try {
            const allHoldings = await api.loadHoldings()
            allLedgersHoldings.value = allHoldings || []
            console.log('加载到所有持仓数据:', allHoldings)
            
            // 为所有持仓设置价格
            for (const h of allLedgersHoldings.value) {
              if (!(h.code in prices)) {
                const cost = avgCost(h.trades || [])
                prices[h.code] = cost || 0
              }
            }
          } catch (err) {
            console.warn('加载所有持仓失败:', err)
            allLedgersHoldings.value = []
          }
          
          // 加载所有账本的汇总信息
          const summaries = []
          for (const ledger of ledgers.value) {
            const summary = await calculateLedgerSummary(ledger)
            summaries.push(summary)
          }
          ledgerSummaries.value = summaries
        } catch (err) {
          console.warn('加载账本失败:', err)
          showIOMessage('加载账本失败: ' + err.message, true)
          ledgers.value = []
          ledgerSummaries.value = []
          allLedgersHoldings.value = []
        }

        if (currentLedger.value) {
          try {
            const savedHoldings = await api.loadHoldings(currentLedger.value.id)
            // 无论是否有数据，都更新 holdings
            holdings.value = savedHoldings || []
            if (savedHoldings && savedHoldings.length > 0) {
              const maxId = Math.max(...savedHoldings.flatMap(h => (h.trades || []).map(t => t.id)), ...savedHoldings.map(h => h.id), 0)
              _id = maxId + 1
            } else {
              _id = 100 // 重置 ID 计数器
            }
            console.log('加载到持仓数据:', savedHoldings)
          } catch (err) {
            console.warn('加载持仓失败:', err)
            showIOMessage('加载持仓失败: ' + err.message, true)
            // 加载失败时保持为空数组，避免显示已删除的持仓
            holdings.value = []
            _id = 100
          }
        } else {
          holdings.value = []
        }

        try {
          const savedSettings = await api.loadSettings()
          if (savedSettings) {
            fx.USD = savedSettings.fx_usd || fx.USD
            fx.HKD = savedSettings.fx_hkd || fx.HKD
            autoRefresh.value = savedSettings.auto_refresh !== false
          }
        } catch (err) {
          console.warn('加载设置失败:', err)
          showIOMessage('加载设置失败: ' + err.message, true)
        }

        // 为当前账本持仓设置价格（如果还没有设置）
        for (const h of holdings.value) {
          if (!(h.code in prices)) {
            const cost = avgCost(h.trades || [])
            prices[h.code] = cost || 0
          }
        }

        refreshQuotes()
      } finally {
        isLoading.value = false
      }
    }

    const handleLogin = async () => {
      loginError.value = ''
      try {
        isLoggedIn.value = true
        // 登录成功后加载数据
        await loadData()
        showIOMessage('登录成功，数据加载完成')
      } catch (err) {
        loginError.value = err.message
        showIOMessage('登录后数据加载失败: ' + err.message, true)
      }
    }
    const handleLogout = () => {
      api.logout()
      isLoggedIn.value = false
    }
    const ioMessageClass = ref('')

    // Derived
    const enriched = computed(() => holdings.value.map(h => {
      const ccy = MARKET_CCY[h.market]
      const price = prices[h.code] || 0
      const qty = totalQty(h.trades)
      const cost = avgCost(h.trades)
      const mv = price * qty
      const costBasis = cost * qty
      const pnl = mv - costBasis
      const pct = costBasis > 0 ? pnl / costBasis * 100 : 0
      return { ...h, ccy, price, qty, cost, mv, costBasis, pnl, pct }
    }))

    const summary = computed(() => {
      const byCcy = { CNY: 0, HKD: 0, USD: 0 }
      const byCcyCost = { CNY: 0, HKD: 0, USD: 0 }
      enriched.value.forEach(h => {
        byCcy[h.ccy] += h.mv
        byCcyCost[h.ccy] += h.costBasis
      })
      const totalCNY = toCNY(byCcy.CNY, 'CNY', fx) + toCNY(byCcy.HKD, 'HKD', fx) + toCNY(byCcy.USD, 'USD', fx)
      const totalCostCNY = toCNY(byCcyCost.CNY, 'CNY', fx) + toCNY(byCcyCost.HKD, 'HKD', fx) + toCNY(byCcyCost.USD, 'USD', fx)
      const pnl = totalCNY - totalCostCNY
      const pct = totalCostCNY > 0 ? pnl / totalCostCNY * 100 : 0
      return { byCcy, totalCNY, pnl, pct }
    })

    const filtered = computed(() =>
      tab.value === '全部' ? enriched.value : enriched.value.filter(h => h.market === tab.value)
    )

    const ccyBreakdown = computed(() => [
      { label: 'A股', ccy: 'CNY', val: summary.value.byCcy.CNY },
      { label: '港股', ccy: 'HKD', val: summary.value.byCcy.HKD },
      { label: '美股', ccy: 'USD', val: summary.value.byCcy.USD },
    ])

    // 所有账本的持仓enriched数据
    const allLedgersEnriched = computed(() => allLedgersHoldings.value.map(h => {
      const ccy = MARKET_CCY[h.market]
      const price = prices[h.code] || 0
      const qty = totalQty(h.trades)
      const cost = avgCost(h.trades)
      const mv = price * qty
      const costBasis = cost * qty
      const pnl = mv - costBasis
      const pct = costBasis > 0 ? pnl / costBasis * 100 : 0
      return { ...h, ccy, price, qty, cost, mv, costBasis, pnl, pct }
    }))

    // 所有账本的汇总信息
    const allLedgersSummary = computed(() => {
      const byCcy = { CNY: 0, HKD: 0, USD: 0 }
      const byCcyCost = { CNY: 0, HKD: 0, USD: 0 }
      allLedgersEnriched.value.forEach(h => {
        byCcy[h.ccy] += h.mv
        byCcyCost[h.ccy] += h.costBasis
      })
      const totalCNY = toCNY(byCcy.CNY, 'CNY', fx) + toCNY(byCcy.HKD, 'HKD', fx) + toCNY(byCcy.USD, 'USD', fx)
      const totalCostCNY = toCNY(byCcyCost.CNY, 'CNY', fx) + toCNY(byCcyCost.HKD, 'HKD', fx) + toCNY(byCcyCost.USD, 'USD', fx)
      const pnl = totalCNY - totalCostCNY
      const pct = totalCostCNY > 0 ? pnl / totalCostCNY * 100 : 0
      return { byCcy, totalCNY, pnl, pct }
    })

    // 所有账本的货币分类
    const allLedgersCcyBreakdown = computed(() => [
      { label: 'A股', ccy: 'CNY', val: allLedgersSummary.value.byCcy.CNY },
      { label: '港股', ccy: 'HKD', val: allLedgersSummary.value.byCcy.HKD },
      { label: '美股', ccy: 'USD', val: allLedgersSummary.value.byCcy.USD },
    ])

    const fxList = [
      { label: 'USD/CNY', key: 'USD' },
      { label: 'HKD/CNY', key: 'HKD' },
    ]

    // ─── Data persistence (watch) ────────────────────────────────
    let saveDebounce = null
    const debounceSave = () => {
      if (!currentLedger.value) return
      
      clearTimeout(saveDebounce)
      saveDebounce = setTimeout(async () => {
        try {
          // 保存持仓并更新本地数据（包含新的 ID）
          if (currentLedger.value) {
            const savedHoldings = await api.saveHoldings(holdings.value, currentLedger.value.id)
            if (savedHoldings && savedHoldings.length > 0) {
              holdings.value = savedHoldings
              const maxId = Math.max(...savedHoldings.flatMap(h => (h.trades || []).map(t => t.id)), ...savedHoldings.map(h => h.id), 0)
              _id = maxId + 1
            }
          }
          await api.saveSettings({ fx_usd: fx.USD, fx_hkd: fx.HKD, auto_refresh: autoRefresh.value })
        } catch (err) {
          console.warn('保存失败:', err)
          showIOMessage('保存失败: ' + err.message, true)
        }
      }, 500)
    }

    watch(holdings, debounceSave, { deep: true })
    watch(() => ({ USD: fx.USD, HKD: fx.HKD }), debounceSave, { deep: true })
    watch(autoRefresh, debounceSave)

    // ─── Ledger management ────────────────────────────────────────
    const openCreateLedger = () => {
      newLedgerName.value = ''
      newLedgerColor.value = '#1a1814'
      createLedgerModal.value = true
    }

    const saveNewLedger = async () => {
      if (!newLedgerName.value.trim()) {
        showIOMessage('请输入账本名称', true)
        return
      }

      try {
        const newLedger = await api.createLedger(newLedgerName.value.trim(), newLedgerColor.value)
        ledgers.value.push(newLedger)
        
        // 计算新账本的汇总信息并添加到 ledgerSummaries
        const summary = await calculateLedgerSummary(newLedger)
        ledgerSummaries.value.push(summary)
        celebratingLedgers.value.push(newLedger.id)
        setTimeout(() => {
          celebratingLedgers.value = celebratingLedgers.value.filter(id => id !== newLedger.id)
        }, 900)
        
        createLedgerModal.value = false
        showIOMessage('账本创建成功')
      } catch (err) {
        showIOMessage('创建账本失败: ' + err.message, true)
      }
    }

    const editLedger = (ledger) => {
      editingLedger.value = { ...ledger }
      editLedgerModal.value = true
    }

    const saveEditLedger = async () => {
      if (!editingLedger.value.name.trim()) {
        showIOMessage('请输入账本名称', true)
        return
      }

      try {
        const updatedLedger = await api.updateLedger(editingLedger.value.id, {
          name: editingLedger.value.name.trim(),
          color: editingLedger.value.color
        })
        const index = ledgers.value.findIndex(l => l.id === updatedLedger.id)
        if (index !== -1) {
          ledgers.value[index] = updatedLedger
          
          // 更新 ledgerSummaries 中对应的账本信息
          const summaryIndex = ledgerSummaries.value.findIndex(s => s.id === updatedLedger.id)
          if (summaryIndex !== -1) {
            // 重新计算汇总信息
            const summary = await calculateLedgerSummary(updatedLedger)
            ledgerSummaries.value[summaryIndex] = summary
          }
        }
        if (currentLedger.value && currentLedger.value.id === updatedLedger.id) {
          currentLedger.value = updatedLedger
        }
        editLedgerModal.value = false
        showIOMessage('账本更新成功')
      } catch (err) {
        showIOMessage('更新账本失败: ' + err.message, true)
      }
    }

    const confirmDeleteLedger = (ledger) => {
      deleteLedgerConfirm.value = ledger
    }

    const deleteSelectedLedger = async () => {
      if (!deleteLedgerConfirm.value) return

      try {
        const deletedId = deleteLedgerConfirm.value.id
        await api.deleteLedger(deletedId)
        ledgers.value = ledgers.value.filter(l => l.id !== deletedId)
        
        // 从 ledgerSummaries 中删除对应的账本
        ledgerSummaries.value = ledgerSummaries.value.filter(s => s.id !== deletedId)
        
        // 如果删除的是当前账本，返回账本列表页面
        if (currentLedger.value && currentLedger.value.id === deletedId) {
          currentLedger.value = null
          holdings.value = []
          await loadData()
        }
        deleteLedgerConfirm.value = null
        showIOMessage('账本删除成功')
      } catch (err) {
        showIOMessage('删除账本失败: ' + err.message, true)
      }
    }

    const switchLedger = async (ledger) => {
      currentLedger.value = ledger
      showLedgerList.value = false
      showDropdown.value = false
      await loadData()
    }

    const goHome = async () => {
      if (currentLedger.value) {
        currentLedger.value = null
        showLedgerList.value = false
        showDropdown.value = false
        holdings.value = []
        await loadData()
      }
    }
    
    // 监听currentLedger变化，保存到localStorage并更新页面标题
    watch(currentLedger, (newLedger) => {
      if (newLedger) {
        localStorage.setItem('investment-current-ledger-id', newLedger.id.toString())
      } else {
        localStorage.removeItem('investment-current-ledger-id')
      }
      updatePageTitle()
    }, { deep: true })

    // ─── Update export functions ─────────────────────────────────
    function handleExportCSV() {
      try {
        exportCSV(holdings.value, prices, fx)
        showIOMessage('CSV 导出成功')
      } catch (err) {
        showIOMessage('导出失败: ' + err.message, true)
      }
    }

    async function handleExportPDF() {
      try {
        await exportPDF(holdings.value, prices, fx)
        showIOMessage('PDF 导出成功')
      } catch (err) {
        showIOMessage('导出失败: ' + err.message, true)
      }
    }

    // ─── All ledgers export/import ─────────────────────────────────
    function handleExportAllLedgersCSV() {
      try {
        const ledgerHoldings = {}
        for (const ledger of ledgers.value) {
          ledgerHoldings[ledger.id] = []
        }
        exportAllLedgersCSV(ledgers.value, ledgerHoldings, prices, fx)
        showIOMessage('所有账本 CSV 导出成功')
      } catch (err) {
        showIOMessage('导出失败: ' + err.message, true)
      }
    }

    function triggerAllLedgersImport() {
      if (allLedgersImportInput.value) allLedgersImportInput.value.click()
    }

    async function handleAllLedgersImport(event) {
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
          currentLedger.value = null
          await loadData()
          showIOMessage(`导入成功，共 ${data.ledgers.length} 个账本`)
        } else {
          if (currentLedger.value) {
            holdings.value = data.holdings
            await api.saveHoldings(holdings.value, currentLedger.value.id)
            showIOMessage(`导入成功，共 ${data.holdings.length} 条持仓`)
          } else {
            showIOMessage('请先选择一个账本再导入', true)
          }
        }
        refreshQuotes()
      } catch (err) {
        showIOMessage('导入失败: ' + err.message, true)
      }

      if (allLedgersImportInput.value) allLedgersImportInput.value.value = ''
    }

    // ─── Quote & FX refresh ───────────────────────────────────────
    async function refreshQuotes() {
      quoteStatus.value = 'loading'
      quoteError.value = ''

      try {
        // 并行获取汇率和行情
        const [fxResult, quoteResult] = await Promise.allSettled([
          fetchFxRates(),
          holdings.value.length > 0 ? fetchQuotes(holdings.value) : Promise.resolve({ prices: {}, errors: [] })
        ])

        // 更新汇率（保留两位小数）
        if (fxResult.status === 'fulfilled' && fxResult.value) {
          fx.USD = Math.round(fxResult.value.USD * 100) / 100
          fx.HKD = Math.round(fxResult.value.HKD * 100) / 100
        }

        // 更新行情
        const quoteData = quoteResult.status === 'fulfilled' ? quoteResult.value : { prices: {}, errors: [] }
        if (quoteData.prices && Object.keys(quoteData.prices).length > 0) {
          Object.assign(prices, quoteData.prices)
        }

        // 收集错误信息
        const failedList = (quoteData.errors || []).map(e => `${e.name || e.code}(${e.market})`)
        if (failedList.length > 0) {
          quoteError.value = `以下标的行情获取失败：${failedList.join('、')}`
        }

        const hasFx = fxResult.status === 'fulfilled' && fxResult.value
        const hasQuotes = holdings.value.length === 0 || (quoteData.prices && Object.keys(quoteData.prices).length > 0)

        if (hasFx || hasQuotes) {
          quoteStatus.value = (holdings.value.length > 0 && failedList.length === holdings.value.length) ? 'error' : 'ok'
          const now = new Date()
          lastQuoteTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        } else {
          quoteStatus.value = 'error'
          quoteError.value = '所有数据源均无有效数据'
        }
      } catch (err) {
        quoteStatus.value = 'error'
        quoteError.value = err.message
        console.warn('[App] refresh failed:', err)
      }
    }

    function startAutoRefresh() {
      stopAutoRefresh()
      if (autoRefresh.value) {
        refreshTimer = setInterval(() => {
          refreshQuotes()
        }, 60000)
      }
    }

    function stopAutoRefresh() {
      if (refreshTimer) {
        clearInterval(refreshTimer)
        refreshTimer = null
      }
    }

    watch(autoRefresh, (val) => {
      if (val) startAutoRefresh()
      else stopAutoRefresh()
    })

    // ─── Import/Export ───────────────────────────────────────────
    function showIOMessage(msg, isError = false) {
      ioMessage.value = msg
      ioMessageClass.value = isError ? 'error' : 'success'
      setTimeout(() => { ioMessage.value = '' }, 3000)
    }

    function triggerImport() {
      if (importInput.value) importInput.value.click()
    }

    async function handleImport(event) {
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
          currentLedger.value = null
          await loadData()
          showIOMessage(`导入成功，共 ${data.ledgers.length} 个账本`)
        } else {
          holdings.value = data.holdings
          await api.saveHoldings(holdings.value, currentLedger?.value?.id)
          showIOMessage(`导入成功，共 ${data.holdings.length} 条持仓`)
        }
        refreshQuotes()
      } catch (err) {
        showIOMessage('导入失败: ' + err.message, true)
      }

      if (importInput.value) importInput.value.value = ''
    }

    // ─── Trade actions ───────────────────────────────────────────
    const updateTrade = () => {
      if (!editingTrade.value) return
      const { holdingMarket, holdingCode, tradeId, qty, price } = editingTrade.value
      holdings.value = holdings.value.map(h => 
        !(h.market === holdingMarket && h.code === holdingCode) ? h : {
          ...h, trades: h.trades.map(t => t.id !== tradeId ? t : { ...t, qty: +qty, price: +price })
        }
      )
      editingTrade.value = null
      if (currentLedger.value) {
        api.saveHoldings(holdings.value, currentLedger.value.id)
      }
    }

    const deleteTrade = (holding, tradeId) => {
      const { market, code } = holding
      holdings.value = holdings.value.map(h => {
        if (!(h.market === market && h.code === code)) return h
        const trades = h.trades.filter(t => t.id !== tradeId)
        return trades.length > 0 ? { ...h, trades } : h
      })
      if (currentLedger.value) {
        api.saveHoldings(holdings.value, currentLedger.value.id)
      }
    }

    const confirmDeleteHolding = (holdingId) => {
      deleteConfirm.value = holdingId
    }

    const deleteHolding = async () => {
      if (deleteConfirm.value === null || !currentLedger.value) return
      const { market, code } = deleteConfirm.value
      const holdingKey = `${market}-${code}`
      deleteConfirm.value = null
      
      try {
        await api.deleteHolding(market, code, currentLedger.value.id)
        if (!deletingHoldings.value.includes(holdingKey)) {
          deletingHoldings.value.push(holdingKey)
        }
        setTimeout(() => {
          holdings.value = holdings.value.filter(h => !(h.market === market && h.code === code))
          deletingHoldings.value = deletingHoldings.value.filter(key => key !== holdingKey)
        }, 820)
        showIOMessage('持仓删除成功')
      } catch (err) {
        showIOMessage('删除失败: ' + err.message, true)
      }
    }

    const cancelDelete = () => {
      deleteConfirm.value = null
    }

    const toggleReset = (holdingId) => {
      if (resetTarget.value === holdingId) {
        resetTarget.value = null
        resetPrice.value = ''
      } else {
        resetTarget.value = holdingId
        resetPrice.value = ''
      }
    }

    const refreshSingleQuote = async (holding) => {
      try {
        holding.refreshing = true
        const quote = await fetchQuote(holding.market, holding.code)
        if (quote && quote.price > 0) {
          prices[holding.code] = quote.price
        }
      } catch (err) {
        console.warn(`刷新 ${holding.name} 行情失败:`, err)
        showIOMessage(`刷新 ${holding.name} 行情失败`, true)
      } finally {
        holding.refreshing = false
      }
    }

    const cancelReset = () => {
      resetTarget.value = null
      resetPrice.value = ''
      if (currentLedger.value) {
        api.saveHoldings(holdings.value, currentLedger.value.id)
      }
    }
    const resetCost = (holding) => {
      const { market, code } = holding
      const enrichedH = enriched.value.find(e => e.market === market && e.code === code)
      if (!enrichedH) return
      const price = resetPrice.value !== '' ? +resetPrice.value : enrichedH.cost
      holdings.value = holdings.value.map(h => 
        !(h.market === market && h.code === code) ? h : {
          ...h, trades: [{ id: ++_id, date: today(), qty: enrichedH.qty, price }]
        }
      )
      resetTarget.value = null
      resetPrice.value = ''
      if (currentLedger.value) {
        api.saveHoldings(holdings.value, currentLedger.value.id)
      }
    }

    const openAddTrade = (holding) => {
      const { market, code } = holding
      const h = enriched.value.find(e => e.market === market && e.code === code)
      if (!h) return
      addTradeTarget.value = { holdingMarket: market, holdingCode: code, market: h.market, ccy: h.ccy, avgCost: h.cost }
      Object.assign(addTradeForm, { type: '买入', qty: '', price: '', date: today(), note: '' })
    }

    const tradeError = ref('')

    const saveAddTrade = () => {
      if (!addTradeTarget.value || !addTradeForm.qty || !addTradeForm.price) {
        tradeError.value = '请填写数量和价格'
        return
      }
      tradeError.value = ''
      const { holdingMarket, holdingCode } = addTradeTarget.value
      const { type, qty, price, date, note } = addTradeForm
      const signedQty = type === '卖出' ? -Math.abs(+qty) : Math.abs(+qty)
      holdings.value = holdings.value.map(h => 
        !(h.market === holdingMarket && h.code === holdingCode) ? h : {
          ...h, trades: [...h.trades, { id: ++_id, date: date || today(), qty: signedQty, price: +price, note: note || '' }]
        }
      )
      addTradeTarget.value = null
      Object.assign(addTradeForm, { type: '买入', qty: '', price: '', date: '', note: '' })
      if (currentLedger.value) {
        api.saveHoldings(holdings.value, currentLedger.value.id)
      }
    }
    const addError = ref('')
    const nameLoading = ref(false)
    // 删除确认
    const deleteConfirm = ref(null) // 存储要删除的持仓ID

    // Auto-fetch stock name when code changes
    const onCodeChange = async (code) => {
      if (!code || code.length < 3) {
        newForm.name = ''
        return
      }
      nameLoading.value = true
      try {
        const quote = await fetchQuote(newForm.market, code)
        if (quote.name) newForm.name = quote.name
        if (quote.price > 0) newForm.price = String(quote.price)
      } catch (e) {
        // silently fail, user can type name manually
      }
      nameLoading.value = false
    }

    const saveNewHolding = () => {
      const { market, code, name, sector, qty, price, date } = newForm
      if (!code || !name || !qty || !price) {
        addError.value = '请填写股票代码、名称、数量和成本价'
        return
      }
      addError.value = ''
      // 规范化股票代码：统一大写，港股补0
      let normalizedCode = code.toUpperCase().trim()
      if (market === '港股' && /^\d+$/.test(normalizedCode)) {
        while (normalizedCode.length < 5) {
          normalizedCode = '0' + normalizedCode
        }
      }
      holdings.value = [...holdings.value, {
        id: ++_id, market, code: normalizedCode, name, sector,
        trades: [{ id: ++_id, date: date || today(), qty: +qty, price: +price }]
      }]
      const holdingKey = `${market}-${normalizedCode}`
      celebratingHoldings.value.push(holdingKey)
      setTimeout(() => {
        celebratingHoldings.value = celebratingHoldings.value.filter(key => key !== holdingKey)
      }, 900)
      // 新增后切换到对应市场标签，避免用户在其他标签下看不到新持仓
      tab.value = market
      prices[normalizedCode] = +price
      addHolding.value = false
      Object.assign(newForm, { market: 'A股', code: '', name: '', sector: '', qty: '', price: '', date: today() })
      // 立即持久化
      if (currentLedger.value) {
        api.saveHoldings(holdings.value, currentLedger.value.id).then(() => {
          ioMessage.value = '✅ 保存成功'
          setTimeout(() => { if (ioMessage.value === '✅ 保存成功') ioMessage.value = '' }, 3000)
        })
      }
    }

    // 点击外部关闭下拉菜单
    const handleDocumentClick = (e) => {
      if (showDropdown.value) {
        showDropdown.value = false
      }
    }

    // ─── Lifecycle ───────────────────────────────────────────────
    onMounted(async () => {
      if (isLoggedIn.value) {
        await loadData()
        // 数据加载完成后更新页面标题
        updatePageTitle()
      }
      startAutoRefresh()
      
      // 点击外部关闭下拉菜单
      document.addEventListener('click', handleDocumentClick)
    })

    onUnmounted(() => {
      stopAutoRefresh()
      document.removeEventListener('click', handleDocumentClick)
    })

    return {
      SYM, TABS, fxList,
      holdings, prices, fx, autoRefresh, tab, expanded, editingTrade,
      resetTarget, resetPrice, addTradeTarget, addTradeForm,
      addHolding, newForm, openAddHolding,
      enriched, summary, filtered, ccyBreakdown,
      allLedgersHoldings, allLedgersSummary, allLedgersCcyBreakdown,
      fmt, toCNY,
      // Quote
      quoteStatus, quoteError, lastQuoteTime, refreshQuotes, refreshSingleQuote,
      // IO
      importInput, allLedgersImportInput, ioMessage, ioMessageClass,
      handleExportCSV, handleExportPDF, triggerImport, handleImport,
      handleExportAllLedgersCSV, triggerAllLedgersImport, handleAllLedgersImport,
      // Trade actions
      updateTrade, deleteTrade, deleteHolding, confirmDeleteHolding, cancelDelete, toggleReset, cancelReset, resetCost,
      openAddTrade, saveAddTrade, saveNewHolding,
      // Form helpers
      addError, tradeError, nameLoading, onCodeChange,
      isLoggedIn, handleLogin, handleLogout, loginError,
      // Delete confirm
      deleteConfirm, deletingHoldings, celebratingHoldings, celebratingLedgers, blessingChars,
      // Ledger management
      ledgers, ledgerSummaries, currentLedger, showLedgerList, showDropdown,
      createLedgerModal, editLedgerModal, deleteLedgerConfirm,
      newLedgerName, newLedgerColor, editingLedger, ledgerColors,
      openCreateLedger, saveNewLedger, editLedger, saveEditLedger,
      confirmDeleteLedger, deleteSelectedLedger, switchLedger, goHome,
      // Global state
      isLoading
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,400&family=Playfair+Display:wght@400;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f9f7f3; }
.mono { font-family: 'SF Mono', 'Fira Code', monospace; }
input, select, button { font-family: inherit; }
input:focus, select:focus { outline: none; }

.app-root {
  min-height: 100vh;
  background: #f9f7f3;
  font-family: 'Source Serif 4', Georgia, serif;
  color: #1a1814;
}

/* Header */
.header {
  border-bottom: 1px solid #ede9e2;
  padding: 14px 20px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  transition: all 0.2s;
  padding: 4px 8px;
  border-radius: 6px;
  margin: -4px -8px;
}
.header-left:hover {
  background-color: #f9f7f3;
}
.header-left:active {
  transform: scale(0.98);
}
.header-right { display: flex; align-items: center; gap: 8px; }
.app-title { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 600; letter-spacing: .2px; }

/* Ledger badge */
.ledger-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
}
.ledger-badge-action {
  font-size: 10px;
  opacity: 0.8;
  transition: transform 0.2s;
}
.ledger-badge:hover .ledger-badge-action {
  transform: rotate(180deg);
}

/* Ledger dropdown */
.ledger-dropdown {
  position: absolute;
  top: 100%;
  right: 20px;
  margin-top: 8px;
  background: #fff;
  border: 1px solid #ede9e2;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  min-width: 280px;
  z-index: 200;
  max-height: 400px;
  overflow-y: auto;
}
.ledger-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.ledger-item:hover {
  background-color: #f9f7f3;
}
.ledger-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 12px;
}
.ledger-info {
  flex: 1;
}
.ledger-name {
  font-size: 14px;
  font-weight: 500;
}
.ledger-actions {
  display: flex;
  gap: 6px;
}
.btn-sm {
  font-size: 11px;
  padding: 4px 8px;
}

/* Ledger management */
.ledger-management {
  max-width: 600px;
  margin: 0 auto;
}
.ledger-welcome {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 0;
}
.ledger-welcome h2 {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  margin-bottom: 12px;
  color: #1a1814;
}
.ledger-welcome p {
  color: #666;
  font-size: 16px;
}
.ledgers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}
.ledger-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}
.ledger-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.ledger-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  transition: transform 0.1s, box-shadow 0.1s;
}
.ledger-card-header {
  height: 4px;
}
.ledger-card-body {
  padding: 18px 14px;
  text-align: center;
}
.ledger-card h3 {
  font-size: 14px;
  margin-bottom: 6px;
  color: #1a1814;
}
.ledger-summary {
  margin: 12px 0;
  padding: 10px;
  background: #f9f7f3;
  border-radius: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}

.summary-item:not(:last-child) {
  border-bottom: 1px solid #ede9e2;
}

.summary-label {
  font-size: 11px;
  color: #888;
}

.summary-value {
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
}

.ledger-summary .pnl-green .summary-value {
  color: #1a7a4a;
}

.ledger-summary .pnl-red .summary-value {
  color: #c0392b;
}

.ledger-card-hint {
  font-size: 12px;
  color: #999;
}
.ledger-card-empty {
  border: 2px dashed #ddd;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}
.ledger-card-empty-content {
  text-align: center;
  color: #999;
}
.ledger-card-empty-content svg {
  margin-bottom: 12px;
}
.ledger-card-empty-content p {
  font-size: 14px;
}

/* Color picker */
.color-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.color-option:hover {
  transform: scale(1.1);
}
.color-option.active {
  border-color: #1a1814;
  transform: scale(1.1);
  box-shadow: 0 0 0 2px rgba(26, 24, 20, 0.1);
}

/* Quote status */
.quote-status { font-size: 11px; font-family: monospace; white-space: nowrap; }
.quote-status.ok { color: #1a7a4a; }
.quote-status.error { color: #c0392b; }
.quote-status.loading { color: #b8a882; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

/* Main */
.main-content { max-width: 780px; margin: 0 auto; padding: 20px 14px 60px; }
.section-loading {
  min-height: 360px;
  border: 1px solid #ede9e2;
  border-radius: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Summary */
.summary-card {
  background: #fff; border-radius: 14px; border: 1px solid #ede9e2;
  padding: 22px 22px 18px; margin-bottom: 20px;
}
.summary-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.add-holding-btn {
  font-size: 13px;
  padding: 8px 14px;
}
.summary-label { font-size: 11px; color: #aaa; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
.summary-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.big-num { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(28px, 7vw, 46px); font-weight: 600; line-height: 1; letter-spacing: -1px; }
.summary-pnl { padding-bottom: 4px; display: flex; align-items: center; gap: 8px; }
.pnl-abs { font-size: 12px; color: #aaa; font-family: monospace; }
.pnl-green { color: #1a7a4a; }
.pnl-red { color: #c0392b; }

.ccy-row { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
.ccy-chip { font-size: 12px; font-family: monospace; color: #888; display: flex; align-items: center; gap: 4px; }
.ccy-chip span { color: #1a1814; font-weight: 600; }
.ccy-conv { color: #bbb !important; font-weight: 400 !important; }

.fx-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f0ece5; }
.fx-bar { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.fx-label { font-size: 11px; color: #bbb; letter-spacing: .5px; }
.fx-chip { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #888; }
.fx-value { font-family: monospace; font-weight: 600; color: #444; min-width: 50px; display: inline-block; text-align: center; }

/* Toggle switch */
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; inset: 0; background: #d4cfc6; border-radius: 20px;
  transition: background .2s;
}
.toggle-slider::before {
  content: ''; position: absolute; width: 16px; height: 16px; left: 2px; bottom: 2px;
  background: #fff; border-radius: 50%; transition: transform .2s;
}
.toggle-switch input:checked + .toggle-slider { background: #1a7a4a; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); }

/* Import/Export */
.io-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f0ece5; }
.io-label { font-size: 11px; color: #bbb; letter-spacing: .5px; margin-bottom: 8px; }
.io-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.io-message { font-size: 12px; margin-top: 8px; font-family: monospace; animation: slideDown .3s ease-out; }
.io-message.success { color: #1a7a4a; background: #edf7f1; padding: 8px 12px; border-radius: 6px; border: 1px solid #d4e8d4; box-shadow: 0 2px 8px rgba(26, 122, 74, .15); animation: slideDown .3s ease-out, celebrateGlow 1.6s ease-in-out; }
.io-message.error { color: #c0392b; background: #fdf0ef; padding: 8px 12px; border-radius: 6px; border: 1px solid #f5c6c0; box-shadow: 0 2px 8px rgba(192, 57, 43, .15); }

/* Ledger IO section inside summary card */
.ledger-io-section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f0ece5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ledger-io-section .io-btns {
  gap: 10px;
}
.ledger-io-section .io-message {
  margin-top: 0;
}

.loading-wave {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.loading-bar {
  width: 6px;
  height: 40px;
  background: linear-gradient(180deg, #b8a882 0%, #1a1814 100%);
  border-radius: 3px;
  animation: loadingWave 1.2s ease-in-out infinite;
}

.loading-bar:nth-child(1) { animation-delay: 0s; }
.loading-bar:nth-child(2) { animation-delay: 0.1s; }
.loading-bar:nth-child(3) { animation-delay: 0.2s; }
.loading-bar:nth-child(4) { animation-delay: 0.3s; }
.loading-bar:nth-child(5) { animation-delay: 0.4s; }

@keyframes loadingWave {
  0%, 100% {
    transform: scaleY(0.5);
    opacity: 0.5;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.loading-text {
  font-size: 14px;
  color: #666;
  letter-spacing: 1px;
}

/* Header actions group */
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Dropdown menu */
.dropdown-container {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  background: #fff;
  border: 1px solid #ede9e2;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  min-width: 180px;
  z-index: 300;
  animation: dropdownFadeIn 0.2s ease-out;
}
@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.dropdown-item {
  width: 100%;
  background: none;
  border: none;
  padding: 10px 16px;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: #1a1814;
  transition: background-color 0.15s;
  font-family: inherit;
}
.dropdown-item:first-child {
  border-radius: 10px 10px 0 0;
}
.dropdown-item:last-child {
  border-radius: 0 0 10px 10px;
}
.dropdown-item:hover {
  background-color: #f9f7f3;
}
.dropdown-item:disabled {
  color: #aaa;
  cursor: not-allowed;
}
.dropdown-divider {
  height: 1px;
  background: #ede9e2;
  margin: 4px 0;
}

.quote-status-inline {
  padding: 8px 16px;
}
.quote-status-inline .quote-status {
  font-size: 12px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes celebrateGlow {
  0%, 100% { box-shadow: 0 2px 8px rgba(26, 122, 74, .15); }
  50% { box-shadow: 0 4px 14px rgba(212, 175, 55, .35); }
}

/* Tabs */
.tabs-row { display: flex; gap: 4px; margin-bottom: 14px; }
.tab { background: none; border: none; cursor: pointer; font-size: 13px; padding: 6px 14px; border-radius: 20px; color: #888; transition: all .2s cubic-bezier(0.4, 0, 0.2, 1); font-family: inherit; position: relative; overflow: hidden; }
.tab.on { background: #1a1814; color: #f9f7f3; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.tab:not(.on):hover { background: rgba(26,24,20,.07); color: #1a1814; transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,.1); }
.tab:active { transform: translateY(0); box-shadow: none; }
.tabs-count { margin-left: auto; font-size: 12px; color: #bbb; align-self: center; }

/* Table header */
.tbl-hdr { display: none; }
@media(min-width:640px) {
  .tbl-hdr { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; padding: 0 16px 8px; font-size: 11px; color: #aaa; letter-spacing: .5px; text-transform: uppercase; }
}

/* Row */
.row {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 10px;
  border: 1px solid #ede9e2;
  transition: all .2s;
  overflow: hidden;
  position: relative;
}
.holding-list {
  display: flex;
  flex-direction: column;
}
.holding-fly-enter-active {
  animation: holdingFlyIn .55s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  animation-delay: var(--stagger, 0ms);
}
.holding-fly-leave-active {
  transition: all .28s ease;
  position: absolute;
  width: calc(100% - 2px);
}
.holding-fly-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.97);
}
@keyframes holdingFlyIn {
  0% {
    opacity: 0;
    transform: translateX(-28px) translateY(6px) scale(0.97);
  }
  70% {
    opacity: 1;
    transform: translateX(2px) translateY(0) scale(1.005);
  }
  100% {
    opacity: 1;
    transform: translateX(0) translateY(0) scale(1);
  }
}
.row:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
  transform: translateY(-1px);
}
.row-updating {
  animation: pulse 1.5s ease-in-out infinite;
}
.row-deleting {
  animation: explodeOut .82s ease forwards;
  pointer-events: none;
}
.row-celebrating,
.ledger-celebrating {
  animation: celebratePop .9s ease;
}
.delete-blessing {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: radial-gradient(circle, rgba(253, 248, 233, 0.92), rgba(255, 255, 255, 0.12));
  pointer-events: none;
}
.blessing-char {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #d13d2c, #b5271e);
  box-shadow: 0 4px 12px rgba(192, 57, 43, 0.32);
  font-size: 16px;
  font-weight: 700;
  animation: blessingBurst .82s ease forwards;
}
.blessing-char:nth-child(1) { --dx: -70px; --dy: -36px; }
.blessing-char:nth-child(2) { --dx: -20px; --dy: -64px; }
.blessing-char:nth-child(3) { --dx: 24px; --dy: -62px; }
.blessing-char:nth-child(4) { --dx: 76px; --dy: -34px; }

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(184, 168, 130, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(184, 168, 130, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(184, 168, 130, 0);
  }
}
@keyframes explodeOut {
  0% { transform: scale(1); opacity: 1; filter: saturate(1); }
  55% { transform: scale(1.02); opacity: .9; }
  100% { transform: scale(.88); opacity: 0; filter: saturate(1.45); }
}
@keyframes blessingBurst {
  0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
  25% { opacity: 1; }
  70% { transform: translate(var(--dx), var(--dy)) scale(1.06); opacity: 1; }
  100% { transform: translate(calc(var(--dx) * 1.25), calc(var(--dy) * 1.4)) scale(0.8); opacity: 0; }
}
@keyframes celebratePop {
  0% { transform: scale(0.98); }
  40% { transform: scale(1.015); }
  100% { transform: scale(1); }
}

.row-head {
  display: grid; padding: 14px 16px; cursor: pointer; user-select: none;
  align-items: center; gap: 8px; grid-template-columns: 1fr auto;
  transition: background-color .2s;
}

.row-head:hover {
  background-color: #faf9f7;
}

.row-head:active {
  background-color: #f5f3ef;
  transform: scale(0.98);
}
@media(min-width:640px) { .row-head { grid-template-columns: 2fr 1fr 1fr 1fr auto; } }

.name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.stock-name { font-weight: 600; font-size: 15px; }
.stock-code { font-size: 11px; font-family: monospace; color: #bbb; }

.info-grid { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #888; margin-top: 3px; }
.info-grid span.val { color: #1a1814; font-family: monospace; }

.desktop-col { text-align: right; display: none; }
.col-sub { font-size: 11px; color: #bbb; font-family: monospace; }
@media(min-width:640px) { .desktop-col { display: block; } .info-grid { display: none; } }

.pnl-col { display: flex; align-items: center; gap: 10px; }
.pnl-abs { font-family: monospace; font-size: 11px; margin-top: 1px; }

/* Trade zone */
.trade-zone { border-top: 1px solid #f0ece5; padding: 12px 16px; background: #fdfcfa; }
.trade-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.trade-title { font-size: 12px; color: #aaa; letter-spacing: .5px; text-transform: uppercase; }
.trade-actions { display: flex; gap: 6px; }

.trade-tbl-hdr {
  display: grid; grid-template-columns: 90px 70px 90px 90px 1fr; gap: 8px;
  padding: 0 0 6px; border-bottom: 1px solid #f0ece5; margin-bottom: 4px;
  font-size: 11px; color: #bbb; letter-spacing: .3px;
}

.trade-row { display: flex; gap: 8px; align-items: center; padding: 7px 0; border-bottom: 1px solid #f0ece5; }
.trade-row:last-of-type { border-bottom: none; }
.trade-date { font-size: 12px; color: #888; width: 90px; }
.trade-type { font-size: 12px; width: 70px; font-weight: 600; }
.type-buy { color: #1a7a4a; }
.type-sell { color: #c0392b; }
.trade-qty { font-size: 13px; width: 90px; }
.trade-price { font-size: 13px; width: 90px; }
.trade-note { font-size: 11px; color: #aaa; margin-right: 4px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trade-btns { display: flex; gap: 5px; margin-left: auto; align-items: center; }

/* Confirm box */
.confirm-box {
  background: #fff9f8; border: 1px solid #f5c6c0; border-radius: 10px;
  padding: 14px 16px; margin-bottom: 12px; font-size: 13px; color: #7a2020; line-height: 1.5;
}
.reset-price-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.reset-label { font-size: 12px; color: #888; white-space: nowrap; }
.reset-hint { font-size: 11px; color: #bbb; }
.reset-btns { display: flex; gap: 8px; }

/* Price edit */
.price-edit-row {
  margin-top: 14px; padding-top: 12px; border-top: 1px solid #f0ece5;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.price-label { font-size: 12px; color: #aaa; }

/* Buttons */
.btn { border: none; border-radius: 6px; cursor: pointer; font-size: 12px; padding: 5px 11px; transition: all .15s; font-family: inherit; position: relative; overflow: hidden; }
.btn-ink { background: #1a1814; color: #f9f7f3; } .btn-ink:hover { background: #333; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.btn-ink:active { transform: translateY(0); box-shadow: none; }
.btn-ghost { background: transparent; border: 1px solid #d4cfc6; color: #666; } .btn-ghost:hover { border-color: #aaa; color: #333; transform: translateY(-1px); }
.btn-ghost:active { transform: translateY(0); }
.btn-ghost.loading { color: #b8a882; border-color: #d4cfc6; cursor: not-allowed; }
.btn-ghost.loading:hover { transform: none; box-shadow: none; }
.btn-warn { background: transparent; border: 1px solid #f0c0bb; color: #c0392b; } .btn-warn:hover { background: #fdf0ef; transform: translateY(-1px); }
.btn-warn:active { transform: translateY(0); }
.btn-save { background: #1a7a4a; color: #fff; } .btn-save:hover { background: #15643d; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(26, 122, 74, .2); }
.btn-save:active { transform: translateY(0); box-shadow: none; }
.btn-add-pos {
  background: none; border: 1.5px dashed #c8c0b0; color: #888; border-radius: 10px;
  padding: 12px; width: 100%; text-align: center; cursor: pointer; font-size: 13px; transition: all .2s;
  position: relative;
}
.btn-add-pos:hover { border-color: #9a9080; color: #444; background: rgba(0,0,0,.02); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.btn-add-pos:active { transform: translateY(0); box-shadow: none; }

/* Inputs */
.field { background: #f5f3ef; border: 1px solid transparent; border-radius: 6px; padding: 5px 9px; font-size: 13px; color: #1a1814; transition: all .2s; }
.field:focus { border-color: #b8a882; background: #fff; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(184, 168, 130, .2); }
.field-sm { width: 80px; }

.form-control { transition: all .2s; }
.form-control:focus { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(184, 168, 130, .2); }

/* Modal */
.overlay {
  position: fixed; inset: 0; background: rgba(20,18,14,.45); z-index: 200;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(3px);
  animation: fadeIn .2s ease-out;
}

.modal {
  background: #fff; border-radius: 14px; padding: 28px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,.18);
  animation: slideIn .3s ease-out;
  transform-origin: center;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Page transition */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 500px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
  overflow: hidden;
}
.modal-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; margin-bottom: 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-row { margin-bottom: 14px; }
.form-label { font-size: 11px; color: #888; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 5px; }
.form-control {
  width: 100%; background: #f5f3ef; border: 1px solid transparent; border-radius: 7px;
  padding: 9px 12px; font-size: 14px; color: #1a1814; transition: border .15s;
}
.form-control:focus { border-color: #b8a882; background: #fff; outline: none; }
select.form-control { cursor: pointer; }
.modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }

/* Empty */
.empty-hint { text-align: center; padding: 60px 0; color: #ccc; font-size: 14px; }

.error-banner {
  background: #fff8f0; border: 1px solid #f5c6c0; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #c0392b;
  display: flex; align-items: center; line-height: 1.4;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #d4cfc6; border-radius: 2px; }
</style>
