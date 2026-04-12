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
            <span class="ledger-badge-action" @click="toggleLedgerList">▼</span>
          </span>
          
          <div class="dropdown-container" @click.stop>
            <button class="btn btn-ghost" style="padding: 6px 10px;" @click="toggleDropdown">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:middle">
                <circle cx="7" cy="7" r="1" fill="currentColor"/>
                <circle cx="7" cy="4" r="1" fill="currentColor"/>
                <circle cx="7" cy="10" r="1" fill="currentColor"/>
              </svg>
            </button>
            <div v-if="showDropdown" class="dropdown-menu" @click.stop>
              <button class="dropdown-item" @click="handleGoHome">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="vertical-align:middle;margin-right:6px">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                返回主页
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="handleOpenCreateLedger">+ 新建账本</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="handleRefreshQuotes" :disabled="store.quoteStatus === 'loading'">
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
              <button class="dropdown-item" @click="handleEditCurrentLedger">编辑当前账本</button>
              <button class="dropdown-item" @click="handleDeleteCurrentLedger" style="color: #c0392b;">删除当前账本</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="handleLogout" style="color: #c0392b;">退出</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ledger dropdown -->
      <transition name="dropdown">
        <div v-if="store.currentLedger && showLedgerList" class="ledger-dropdown">
          <div v-for="ledger in store.ledgers" :key="ledger.id" 
               :class="['ledger-item', { 'ledger-item-active': store.currentLedger && store.currentLedger.id === ledger.id }]" 
               @click="handleSwitchLedger(ledger)">
            <div class="ledger-color" :style="{ backgroundColor: ledger.color }"></div>
            <div class="ledger-info">
              <div class="ledger-name">{{ ledger.name }}</div>
            </div>
            <div class="ledger-actions" @click.stop>
              <button class="btn btn-ghost btn-sm" @click="handleEditLedger(ledger)">编辑</button>
              <button class="btn btn-warn btn-sm" @click="handleDeleteLedger(ledger)">删除</button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <div class="main-content">
      <div v-show="showBlessingEffect" :class="['blessing-overlay']">
        <span
          v-for="(char, index) in blessingChars"
          :key="`${blessingEffectKey}-${index}`"
          :class="['blessing-char', 'blessing-char-pop']"
        >{{ char }}</span>
      </div>
      <transition name="page" mode="out-in">
        <!-- 加载中状态 - 骨架屏 -->
        <div v-if="ledgerLoading" key="loading" class="ledger-loading-skeleton">
          <!-- 汇总卡片骨架屏 -->
          <div class="summary-card">
            <div class="summary-card-header">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-button"></div>
            </div>
            <div class="summary-row">
              <div class="skeleton-line skeleton-big-num"></div>
              <div class="skeleton-line skeleton-pnl"></div>
            </div>
            <div class="ccy-row">
              <div class="skeleton-line skeleton-ccy-item"></div>
              <div class="skeleton-line skeleton-ccy-item"></div>
              <div class="skeleton-line skeleton-ccy-item"></div>
            </div>
            <div class="fx-section">
              <div class="fx-bar">
                <div class="skeleton-line skeleton-fx-label"></div>
                <div class="skeleton-line skeleton-fx-chip"></div>
                <div class="skeleton-line skeleton-fx-chip"></div>
                <div class="skeleton-line skeleton-toggle"></div>
                <div class="skeleton-line skeleton-button"></div>
              </div>
            </div>
          </div>

          <!-- 标签栏骨架屏 -->
          <div class="tabs-row">
            <div class="skeleton-line skeleton-tab"></div>
            <div class="skeleton-line skeleton-tab"></div>
            <div class="skeleton-line skeleton-tab"></div>
            <div class="skeleton-line skeleton-tab"></div>
            <div class="skeleton-line skeleton-tabs-count"></div>
          </div>

          <!-- 持仓列表骨架屏 -->
          <div class="holding-list">
            <div v-for="i in 3" :key="`skeleton-holding-${i}`" class="row">
              <div class="row-head">
                <div>
                  <div class="name-row">
                    <div class="skeleton-line skeleton-stock-name"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                    <div class="skeleton-line skeleton-tag"></div>
                  </div>
                  <div class="info-grid">
                    <div class="skeleton-line skeleton-info-item"></div>
                    <div class="skeleton-line skeleton-info-item"></div>
                    <div class="skeleton-line skeleton-info-item"></div>
                  </div>
                </div>
                <div class="desktop-col">
                  <div class="skeleton-line skeleton-desktop-col"></div>
                  <div class="skeleton-line skeleton-col-sub"></div>
                </div>
                <div class="desktop-col">
                  <div class="skeleton-line skeleton-desktop-col"></div>
                </div>
                <div class="desktop-col">
                  <div class="skeleton-line skeleton-desktop-col"></div>
                </div>
                <div class="pnl-col">
                  <div class="skeleton-line skeleton-pnl-col"></div>
                  <div class="skeleton-line skeleton-arrow"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 账本内容 -->
        <template v-else-if="store.currentLedger">
        <!-- Holding management -->
        <div key="holding-management">

        <!-- ── Summary ── -->
      <div class="summary-card">
        <div class="summary-card-header">
          <div class="summary-label">总市值（人民币）</div>
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
        <div class="holding-actions-row">
          <div class="io-btns">
            <div class="io-dropdown" @click.stop>
              <button class="btn btn-ghost" style="font-size:11px" @click="toggleHoldingIOMenu">导入/导出</button>
              <div v-if="showHoldingIOMenu" class="io-dropdown-menu">
                <button class="dropdown-item" @click="handleExportCSV">导出 CSV</button>
                <button class="dropdown-item" @click="handleExportPDF">导出 PDF</button>
                <button class="dropdown-item" @click="triggerImport">导入 CSV</button>
              </div>
            </div>
            <input ref="importInput" type="file" accept=".csv" style="display:none" @change="handleImport" />
          </div>
          <button class="btn btn-ink add-holding-btn" @click="openAddHolding">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:middle;margin-right:4px">
              <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            添加持仓
          </button>
          </div>
        <div v-if="store.ioMessage" class="io-message" :class="store.ioMessageClass">{{ store.ioMessage }}</div>
      </div>

      <!-- ── Error banner ── -->
      <div v-if="store.quoteError" class="error-banner">
        <span>⚠️ {{ store.quoteError }}</span>
        <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;margin-left:8px" @click="store.quoteError = ''">关闭</button>
      </div>

      <!-- ── Tabs ── -->
      <div class="tabs-row">
        <button v-for="t in TABS" :key="t" :class="['tab', { on: tab === t }]" @click="tab = t">{{ t }}</button>
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
        <!-- 持仓操作菜单 -->
        <div class="holding-more-wrap" @click.stop>
          <button class="btn btn-ghost holding-more-btn" @click="handleHoldingMenuClick(h)">⋯</button>
          <div v-if="isHoldingMenuOpen(h)" class="holding-more-menu">
            <button class="holding-more-item holding-more-item-danger" @click="handleDeleteHoldingClick(h)">删除持仓</button>
          </div>
        </div>

        <!-- 持仓标题行 -->
        <div class="row-head" @click="handleHoldingClick(h)">
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
              :style="{ flexShrink: 0, transition: 'transform .2s', transform: isHoldingExpanded(h) ? 'rotate(180deg)' : 'none' }">
              <path d="M4 6l4 4 4-4" stroke="#bbb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <!-- 交易记录区域 -->
        <div v-show="isHoldingExpanded(h)" class="trade-zone">
          <div class="trade-header">
            <span class="trade-title">买入记录</span>
            <div class="trade-actions">
              <button class="btn btn-ghost" style="font-size:11px" @click.stop="openAddTrade({ market: h.market, code: h.code })">+ 新增一笔</button>
              <button class="btn btn-warn" style="font-size:11px" @click.stop="toggleReset({ market: h.market, code: h.code })">
                {{ resetTarget && resetTarget.market === h.market && resetTarget.code === h.code ? '取消' : '一键重置成本' }}
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
          <div v-for="t in h.trades" :key="t.id" :class="['trade-row', { 'trade-row-deleting': t.deleting }]">
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
                <div class="trade-more-wrap" @click.stop>
                  <button class="btn btn-ghost trade-more-btn" @click.stop="toggleTradeActionMenu(`${h.market}-${h.code}-${t.id}`)">⋯</button>
                  <div v-if="openTradeActionMenuKey === `${h.market}-${h.code}-${t.id}`" class="trade-more-menu">
                    <button class="trade-more-item trade-more-item-danger" @click.stop="handleDeleteTrade({ market: h.market, code: h.code }, t.id)">删除记录</button>
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
        <!-- 兜底显示，确保页面永远不会完全空白 -->
        <div v-else key="fallback" class="ledger-fallback">
          <div class="fallback-message">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="16" fill="#1a1814"/>
              <path d="M16 20h32M16 32h24M16 44h28" stroke="#f9f7f3" stroke-width="3" stroke-linecap="round"/>
              <circle cx="48" cy="44" r="5" fill="#c4a050"/>
            </svg>
            <p class="fallback-title">加载账本</p>
            <p class="fallback-subtitle">正在加载账本数据，请稍候...</p>
            <button class="btn btn-ink" @click="window.location.reload()">刷新页面</button>
          </div>
        </div>
      </transition>
    </div>

    <!-- ── Add Trade Modal ── -->
    <div v-if="addTradeTarget" class="overlay" @click.self="addTradeTarget = null">
      <div class="modal">
        <div class="modal-title">新增交易</div>
        <div class="form-grid">
          <div class="form-row">
            <div class="form-label">交易类型</div>
            <select id="trade-type" name="trade-type" class="form-control" v-model="addTradeForm.type"
              :style="{ color: addTradeForm.type === '卖出' ? '#c0392b' : '#1a7a4a' }">
              <option value="买入">买入</option>
              <option value="卖出">卖出</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-label">数量（股）</div>
            <input id="trade-qty" name="trade-qty" class="form-control" type="number" placeholder="如 100" v-model="addTradeForm.qty" />
          </div>
          <div class="form-row">
            <div class="form-label">价格（{{ addTradeTarget.ccy }}）</div>
            <input id="trade-price" name="trade-price" class="form-control" type="number" step="0.01"
              :placeholder="`如 ${addTradeTarget.avgCost}`" v-model="addTradeForm.price" />
          </div>
          <div class="form-row">
            <div class="form-label">日期</div>
            <input id="trade-date" name="trade-date" class="form-control" type="date" v-model="addTradeForm.date" />
          </div>
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">笔记（可选）</div>
            <input id="trade-note" name="trade-note" class="form-control" placeholder="如 加仓、减仓、分红再投..." v-model="addTradeForm.note" />
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
            <input id="stock-code" name="stock-code" class="form-control" placeholder="如 600519" v-model="newForm.code" @blur="handleCodeBlur" />
          </div>
          <div class="form-row">
            <div class="form-label">股票名称{{ nameLoading ? ' (获取中…)' : '' }}</div>
            <input id="stock-name" name="stock-name" class="form-control" placeholder="自动获取或手动输入" v-model="newForm.name" />
          </div>
          <div class="form-row">
            <div class="form-label">持仓数量（股）</div>
            <input id="stock-qty" name="stock-qty" class="form-control" type="number" placeholder="100" v-model="newForm.qty" />
          </div>
          <div class="form-row">
            <div class="form-label">成本价</div>
            <input id="stock-price" name="stock-price" class="form-control" type="number" placeholder="0.00" v-model="newForm.price" />
          </div>
          <div class="form-row">
            <div class="form-label">日期</div>
            <input id="stock-date" name="stock-date" class="form-control" type="date" v-model="newForm.date" />
          </div>
          <div class="form-row" style="grid-column:1/-1">
            <div class="form-label">笔记（可选）</div>
            <input id="stock-sector" name="stock-sector" class="form-control" placeholder="如 科技、消费" v-model="newForm.sector" />
          </div>
        </div>
        <div class="modal-footer">
          <div v-if="addError" style="color:#c0392b;font-size:12px;margin-right:auto">{{ addError }}</div>
          <button class="btn btn-ghost" style="padding:9px 18px" @click="addError='';addHolding = false" :disabled="isAddingHolding">取消</button>
          <button class="btn btn-ink" style="padding:9px 22px" @click="saveNewHolding" :disabled="isAddingHolding">
            <span v-if="isAddingHolding">
              <svg class="spin" width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:middle;margin-right:4px">
                <path d="M1.5 7a5.5 5.5 0 0 1 9.3-3.95M12.5 7a5.5 5.5 0 0 1-9.3 3.95" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M10.8.5v2.55h-2.55M3.2 13.5v-2.55h2.55" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              添加中...
            </span>
            <span v-else>确认添加</span>
          </button>
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

    <!-- ── Holding Exists Confirm Modal ── -->
    <div v-if="holdingExistsConfirm" class="overlay" @click.self="holdingExistsConfirm = null">
      <div class="modal">
        <div class="modal-title">持仓已存在</div>
        <div style="margin: 20px 0; font-size: 14px; line-height: 1.5; text-align: center; color: #666;">
          {{ holdingExistsConfirm.name }} ({{ holdingExistsConfirm.code }}) 已存在于当前账本中<br>
          是否作为新一笔交易添加？
        </div>
        <div class="modal-footer" style="justify-content: center; gap: 20px;">
          <button class="btn btn-ghost" style="padding: 10px 24px; min-width: 100px; font-size: 14px;" @click="holdingExistsConfirm = null">取消</button>
          <button class="btn btn-ink" style="padding: 10px 24px; min-width: 100px; font-size: 14px;" @click="addAsNewTrade">确认添加</button>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
    const expanded = ref({})
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
    const loadingEffectKey = ref(0)
    
    let loadingEffectInterval = null
    loadingEffectInterval = setInterval(() => {
      if (store.isLoading) {
        loadingEffectKey.value += 1
      }
    }, 1800)
    
    onUnmounted(() => {
      if (loadingEffectInterval) clearInterval(loadingEffectInterval)
    })
    
    const openLedgerActionMenuId = ref(null)
    const openTradeActionMenuKey = ref(null)
    const showLedgerList = ref(false)
    const showDropdown = ref(false)
    const showHoldingIOMenu = ref(false)
    const createLedgerModal = ref(false)
    const editLedgerModal = ref(false)
    const deleteLedgerConfirm = ref(null)
    const newLedgerName = ref('')
    const newLedgerColor = ref('#1a1814')
    const editingLedger = ref({ id: null, name: '', color: '#1a1814' })
    const importInput = ref(null)
    const tradeError = ref('')
    const addError = ref('')
    const deleteConfirm = ref(null)
    const nameLoading = ref(false)
    const errorModal = ref({ visible: false, message: '', detail: '', expanded: false })
    const openHoldingActionMenuKey = ref(null)
    const isAddingHolding = ref(false)
    const holdingExistsConfirm = ref(null)
    const ledgerLoading = ref(true)
    const holdingSortBy = ref('mv')
    const holdingSortAsc = ref(false)
    
    const ledgerColors = [
      '#1a1814', '#1a7a4a', '#c0392b', '#1a6fa8', '#8e44ad',
      '#f39c12', '#e74c3c', '#3498db', '#27ae60', '#9b59b6'
    ]
    
    // 应用主题样式
    const appThemeStyle = computed(() => {
      const theme = store.currentLedger?.color || '#1a1814'
      return { '--ledger-theme': theme }
    })
    
    // 计算持仓数据（使用后端计算结果）
    const enriched = computed(function() {
      return store.calculatedHoldings || []
    })
    
    // 过滤后的持仓
    const filtered = computed(function() {
      let result = tab.value === '全部' 
        ? enriched.value 
        : enriched.value.filter(function(h) { return h.market === tab.value })
      
      // 根据排序方式排序
      if (holdingSortBy.value === 'pnl') {
        result = result.slice().sort((a, b) => b.pnl - a.pnl)
      } else {
        result = result.slice().sort((a, b) => b.mv - a.mv)
      }
      
      // 根据排序方向调整（使用 slice 创建新数组避免修改原数组）
      if (holdingSortAsc.value) {
        result = result.slice().reverse()
      }
      
      return result
    })
    
    // 汇总信息（使用后端计算结果）
    const summary = computed(function() {
      return store.summary || { byCcy: { CNY: 0, HKD: 0, USD: 0 }, totalCNY: 0, pnl: 0, pct: 0 }
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
        // 规范化股票代码（转大写）
        let normalizedCode = newForm.value.code.toString().toUpperCase().trim()
        
        // 港股代码：如果全是数字且长度小于5，自动补0
        if (newForm.value.market === '港股' && /^\d+$/.test(normalizedCode)) {
          // 港股代码通常是5位，如果不足5位前面补0
          while (normalizedCode.length < 5) {
            normalizedCode = '0' + normalizedCode
          }
        }
        
        newForm.value.code = normalizedCode
        
        const result = await fetchQuote(newForm.value.market, normalizedCode)
        if (result.name) {
          newForm.value.name = result.name
        }
        // 如果获取到价格且成本价为空，自动填充成本价
        if (result.price > 0 && !newForm.value.price) {
          newForm.value.price = result.price.toString()
        }
      } catch (err) {
        console.warn('获取股票信息失败:', err)
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

      // 检查持仓是否已存在
      const existingHolding = store.holdings.find(h => h.market === newForm.value.market && h.code === newForm.value.code)
      
      if (existingHolding) {
        // 显示确认模态框
        holdingExistsConfirm.value = {
          market: newForm.value.market,
          code: newForm.value.code,
          name: newForm.value.name,
          qty: parseInt(newForm.value.qty),
          price: parseFloat(newForm.value.price),
          date: newForm.value.date
        }
        return
      }

      // 开始添加持仓，设置加载状态
      isAddingHolding.value = true

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
      } finally {
        // 无论成功失败，都关闭加载状态
        isAddingHolding.value = false
      }
    }

    // 作为新交易添加
    const addAsNewTrade = async () => {
      if (!holdingExistsConfirm.value) return

      // 开始添加交易，设置加载状态
      isAddingHolding.value = true

      const { market, code, qty, price, date } = holdingExistsConfirm.value
      const holding = store.holdings.find(h => h.market === market && h.code === code)

      if (!holding) {
        isAddingHolding.value = false
        holdingExistsConfirm.value = null
        store.showMessage('持仓不存在', true)
        return
      }

      const rollback = JSON.parse(JSON.stringify(store.holdings))
      holding.trades.push(mkTrade(date, qty, price))

      try {
        await store.saveHoldings(store.holdings)
        addHolding.value = false
        holdingExistsConfirm.value = null
        triggerBlessingEffect()
        store.showMessage('交易添加成功')
      } catch (err) {
        store.holdings = rollback
        addError.value = '添加失败: ' + err.message
        showErrorDetailModal('操作失败', err)
        holdingExistsConfirm.value = null
      } finally {
        // 无论成功失败，都关闭加载状态
        isAddingHolding.value = false
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
      if (!holding) return

      // 标记要删除的交易记录，用于动画效果
      const trade = holding.trades.find(t => t.id === tradeId)
      if (trade) {
        trade.deleting = true
      }

      const rollback = JSON.parse(JSON.stringify(store.holdings))

      // 延迟删除，让动画有时间播放
      setTimeout(async () => {
        try {
          // 从trades数组中过滤掉该交易记录
          holding.trades = holding.trades.filter(t => t.id !== tradeId)
          
          // 如果删除所有交易后没有记录了，也删除整个持仓
          if (holding.trades.length === 0) {
            store.holdings = store.holdings.filter(h => h.market !== holding.market || h.code !== holding.code)
          }
          
          await store.saveHoldings(store.holdings)
          triggerBlessingEffect()
          store.showMessage('交易记录删除成功')
        } catch (err) {
          store.holdings = rollback
          store.showMessage('删除失败: ' + err.message, true)
          showErrorDetailModal('操作失败', err)
        }
      }, 800)
    }
    
    // 切换交易菜单
    const toggleTradeActionMenu = (tradeKey) => {
      openTradeActionMenuKey.value = openTradeActionMenuKey.value === tradeKey ? null : tradeKey
    }
    
    // 关闭交易菜单
    const closeTradeActionMenu = () => {
      openTradeActionMenuKey.value = null
    }
    
    // 切换持仓菜单
    const toggleHoldingActionMenu = (holdingKey) => {
      openHoldingActionMenuKey.value = openHoldingActionMenuKey.value === holdingKey ? null : holdingKey
    }
    
    // 关闭持仓菜单
    const closeHoldingActionMenu = () => {
      openHoldingActionMenuKey.value = null
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
      closeHoldingActionMenu()
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
      
      try {
        // 使用 API 直接删除持仓
        await api.deleteHolding(
          deleteConfirm.value.market, 
          deleteConfirm.value.code, 
          store.currentLedger?.id
        )
        
        // 使用 store 方法更新数据
        await store.updateAfterDeleteHolding(
          deleteConfirm.value.market, 
          deleteConfirm.value.code, 
          store.currentLedger?.id
        )
        
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
      triggerBlessingEffect()
      store.showMessage('CSV 导出成功')
      showHoldingIOMenu.value = false
    }
    
    // 处理导出 PDF
    const handleExportPDF = () => {
      exportPDF(store.holdings, store.prices, store.fx)
      triggerBlessingEffect()
      store.showMessage('PDF 导出成功')
      showHoldingIOMenu.value = false
    }
    
    // 触发导入
    const triggerImport = () => {
      if (importInput.value) importInput.value.click()
      showHoldingIOMenu.value = false
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
          triggerBlessingEffect()
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
        // 只更新账本列表，不重新加载所有数据
        store.ledgers.push(newLedger)
        // 更新账本汇总（新账本没有持仓，汇总为0）
        store.ledgerSummaries.push({ ...newLedger, totalCNY: 0, pnl: 0, pct: 0, holdingCount: 0 })
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
        // 只更新本地账本数据，不重新加载所有数据
        const ledgerIndex = store.ledgers.findIndex(l => l.id === editingLedger.value.id)
        if (ledgerIndex !== -1) {
          store.ledgers[ledgerIndex] = { ...store.ledgers[ledgerIndex], ...editingLedger.value }
        }
        const summaryIndex = store.ledgerSummaries.findIndex(s => s.id === editingLedger.value.id)
        if (summaryIndex !== -1) {
          store.ledgerSummaries[summaryIndex] = { ...store.ledgerSummaries[summaryIndex], ...editingLedger.value }
        }
        // 如果编辑的是当前账本，也更新 currentLedger
        if (store.currentLedger && store.currentLedger.id === editingLedger.value.id) {
          store.currentLedger = { ...store.currentLedger, ...editingLedger.value }
        }
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
        
        // 局部更新：从ledgers数组中移除已删除的账本
        store.ledgers = store.ledgers.filter(ledger => ledger.id !== deletedId)
        
        // 使用 store 方法更新数据
        await store.updateAfterDeleteLedger(deletedId)
        
        // 如果删除的是当前账本，回到首页
        if (store.currentLedger && store.currentLedger.id === deletedId) {
          goHome()
        }
        
        triggerBlessingEffect()
        store.showMessage('账本删除成功')
      } catch (err) {
        store.showMessage('删除账本失败: ' + err.message, true)
        showErrorDetailModal('操作失败', err)
      }
    }
    
    // 切换账本
    const switchLedger = async (ledger) => {
      // 如果是当前账本，不做任何操作
      if (store.currentLedger && store.currentLedger.id === ledger.id) {
        return
      }
      
      store.isLoading = true
      store.setCurrentLedger(ledger)
      
      // 更新 URL（不触发页面重新加载）
      router.replace('/ledger/' + ledger.id)
      
      try {
        // 直接加载新账本的数据
        const calculatedData = await api.loadCalculatedHoldings(ledger.id)
        store.calculatedHoldings = calculatedData.holdings || []
        store.summary = calculatedData.summary || { byCcy: { CNY: 0, HKD: 0, USD: 0 }, totalCNY: 0, pnl: 0, pct: 0 }
        store.fx = calculatedData.fx || { USD: 7.28, HKD: 0.925 }
        
        // 更新原始持仓数据（用于编辑）
        store.holdings = (calculatedData.holdings || []).map(function(h) {
          return {
            id: h.id,
            market: h.market,
            code: h.code,
            name: h.name,
            sector: h.sector,
            trades: h.trades
          }
        })
        
        // 重置展开状态
        expanded.value = {}
        tab.value = '全部'
      } catch (err) {
        console.warn('加载账本数据失败:', err)
        store.calculatedHoldings = []
        store.holdings = []
      } finally {
        store.isLoading = false
      }
    }
    
    // 回到首页
    const goHome = () => {
      store.setCurrentLedger(null)
      router.push('/home')
    }
    
    // 处理登出
    const handleLogout = () => {
      api.logout()
      router.push('/login')
    }
    
    // 格式化错误详情
    const formatErrorDetail = (err) => {
      const detail = err && err.detail
      if (typeof detail === 'string') return detail
      if (detail && typeof detail === 'object') return JSON.stringify(detail, null, 2)
      return (err && err.stack) || (err && err.message) || String(err)
    }
    
    // 显示错误详情模态框
    const showErrorDetailModal = (fallbackMessage, err) => {
      errorModal.value = {
        visible: true,
        message: (err && err.message) || fallbackMessage,
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
    
    // 切换账本列表
    const toggleLedgerList = () => {
      showLedgerList.value = !showLedgerList.value
    }
    
    // 切换下拉菜单
    const toggleDropdown = () => {
      showDropdown.value = !showDropdown.value
    }
    
    // 切换持仓导入导出菜单
    const toggleHoldingIOMenu = () => {
      showHoldingIOMenu.value = !showHoldingIOMenu.value
    }
    
    // 处理回到首页
    const handleGoHome = () => {
      goHome()
      showDropdown.value = false
    }
    
    // 处理打开创建账本
    const handleOpenCreateLedger = () => {
      openCreateLedger()
      showDropdown.value = false
    }
    
    // 处理刷新行情
    const handleRefreshQuotes = async function() {
      if (!store.currentLedger) return
      store.isLoading = true
      try {
        const calculatedData = await api.loadCalculatedHoldings(store.currentLedger.id)
        store.calculatedHoldings = calculatedData.holdings || []
        store.summary = calculatedData.summary || { byCcy: { CNY: 0, HKD: 0, USD: 0 }, totalCNY: 0, pnl: 0, pct: 0 }
        store.fx = calculatedData.fx || store.fx
        triggerBlessingEffect()
        store.showMessage('行情刷新成功')
      } catch (err) {
        console.warn('刷新行情失败:', err)
        store.showMessage('刷新失败: ' + err.message, true)
      } finally {
        store.isLoading = false
      }
      showDropdown.value = false
    }
    
    // 处理编辑当前账本
    const handleEditCurrentLedger = () => {
      if (store.currentLedger) {
        editLedger(store.currentLedger)
        showDropdown.value = false
      }
    }
    
    // 处理删除当前账本
    const handleDeleteCurrentLedger = () => {
      if (store.currentLedger) {
        confirmDeleteLedger(store.currentLedger)
        showDropdown.value = false
      }
    }
    
    // 处理切换账本
    const handleSwitchLedger = (ledger) => {
      switchLedger(ledger)
      showLedgerList.value = false
    }
    
    // 处理编辑账本
    const handleEditLedger = (ledger) => {
      editLedger(ledger)
      showLedgerList.value = false
    }
    
    // 处理删除账本
    const handleDeleteLedger = (ledger) => {
      confirmDeleteLedger(ledger)
      showLedgerList.value = false
    }
    
    // 处理确认删除持仓
    const handleConfirmDeleteHolding = (target) => {
      confirmDeleteHolding(target)
    }
    
    // 处理删除交易
    const handleDeleteTrade = (holdingInfo, tradeId) => {
      deleteTrade(holdingInfo, tradeId)
      closeTradeActionMenu()
    }
    
    // 处理持仓菜单点击
    const handleHoldingMenuClick = (holding) => {
      const holdingKey = `${holding.market}-${holding.code}`
      openHoldingActionMenuKey.value = openHoldingActionMenuKey.value === holdingKey ? null : holdingKey
    }
    
    // 检查持仓菜单是否打开
    const isHoldingMenuOpen = (holding) => {
      const holdingKey = `${holding.market}-${holding.code}`
      return openHoldingActionMenuKey.value === holdingKey
    }
    
    // 处理删除持仓点击
    const handleDeleteHoldingClick = (holding) => {
      confirmDeleteHolding({ market: holding.market, code: holding.code })
      openHoldingActionMenuKey.value = null
    }
    
    // 处理持仓点击
    const handleHoldingClick = (holding) => {
      const holdingKey = `${holding.market}-${holding.code}`
      expanded.value[holdingKey] = !expanded.value[holdingKey]
    }
    
    // 检查持仓是否展开
    const isHoldingExpanded = (holding) => {
      const holdingKey = `${holding.market}-${holding.code}`
      return expanded.value[holdingKey] || false
    }
    
    // 页面加载时
    onMounted(async () => {
      store.isLoading = true
      ledgerLoading.value = true
      
      let foundLedger = null
      
      try {
        // 只加载账本列表（轻量级操作）
        const savedLedgers = await api.loadLedgers()
        store.ledgers = savedLedgers || []
        
        // 如果没有任何账本，跳转到主页
        if (!store.ledgers || store.ledgers.length === 0) {
          console.warn('没有任何账本，跳转到主页')
          store.isLoading = false
          ledgerLoading.value = false
          router.push('/')
          return
        }
        
        // 使用更健壮的 ID 比较方式（支持多种类型）
        const targetId = props.id || (route.params && route.params.id)
        if (targetId && store.ledgers && store.ledgers.length > 0) {
          foundLedger = store.ledgers.find(l => {
            const ledgerId = String(l.id)
            const paramId = String(targetId)
            return ledgerId === paramId
          })
        }
        
        // 如果找不到指定账本，使用第一个账本并更新 URL
        if (!foundLedger && store.ledgers && store.ledgers.length > 0) {
          foundLedger = store.ledgers[0]
          console.warn('未找到指定 ID 的账本，使用第一个账本')
          // 更新 URL 为正确的账本 ID
          router.replace('/ledger/' + foundLedger.id)
        }
        
        if (foundLedger) {
          store.setCurrentLedger(foundLedger)
          
          // 使用后端计算 API 获取持仓数据（包含价格、市值、盈亏等）
          try {
            const calculatedData = await api.loadCalculatedHoldings(foundLedger.id)
            // 存储计算后的持仓数据
            store.calculatedHoldings = calculatedData.holdings || []
            store.summary = calculatedData.summary || { byCcy: { CNY: 0, HKD: 0, USD: 0 }, totalCNY: 0, pnl: 0, pct: 0 }
            store.fx = calculatedData.fx || { USD: 7.28, HKD: 0.925 }
            
            // 更新原始持仓数据（用于编辑）
            store.holdings = (calculatedData.holdings || []).map(h => ({
              id: h.id,
              market: h.market,
              code: h.code,
              name: h.name,
              sector: h.sector,
              trades: h.trades
            }))
            
            // 计算 _id
            if (calculatedData.holdings && calculatedData.holdings.length > 0) {
              const allTradeIds = []
              calculatedData.holdings.forEach(function(h) {
                if (h.trades && h.trades.length > 0) {
                  h.trades.forEach(function(t) { allTradeIds.push(t.id) })
                }
              })
              const maxTradeId = allTradeIds.length > 0 ? Math.max.apply(null, allTradeIds) : 0
              const holdingIds = calculatedData.holdings.map(function(h) { return h.id })
              const maxHoldingId = holdingIds.length > 0 ? Math.max.apply(null, holdingIds) : 0
              _id = Math.max(maxTradeId, maxHoldingId, 0) + 1
            } else {
              _id = 100
            }
          } catch (err) {
            console.warn('加载持仓数据失败:', err)
            store.calculatedHoldings = []
            store.holdings = []
          }
        } else {
          console.error('没有找到任何账本')
        }
      } catch (err) {
        console.error('加载账本数据时出错:', err)
      } finally {
        store.isLoading = false
        ledgerLoading.value = false
      }
    })
    
    onUnmounted(() => {
      // 清理定时器等
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
      loadingEffectKey,
      openLedgerActionMenuId,
      openTradeActionMenuKey,
      showLedgerList,
      showDropdown,
      showHoldingIOMenu,
      createLedgerModal,
      editLedgerModal,
      deleteLedgerConfirm,
      newLedgerName,
      newLedgerColor,
      editingLedger,
      importInput,
      tradeError,
      addError,
      deleteConfirm,
      nameLoading,
      errorModal,
      isAddingHolding,
      holdingExistsConfirm,
      ledgerLoading,
      holdingSortBy,
      holdingSortAsc,
      ledgerColors,
      TABS,
      MARKET_OPTIONS,
      appThemeStyle,
      filtered,
      summary,
      ccyBreakdown,
      fmt,
      toCNY,
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
      toggleHoldingActionMenu,
      closeHoldingActionMenu,
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
      addAsNewTrade,
      editLedger,
      saveEditLedger,
      confirmDeleteLedger,
      deleteSelectedLedger,
      switchLedger,
      goHome,
      handleLogout,
      showErrorDetailModal,
      closeErrorModal,
      copyErrorDetail,
      toggleLedgerList,
      toggleDropdown,
      toggleHoldingIOMenu,
      handleGoHome,
      handleOpenCreateLedger,
      handleRefreshQuotes,
      handleEditCurrentLedger,
      handleDeleteCurrentLedger,
      handleSwitchLedger,
      handleEditLedger,
      handleDeleteLedger,
      handleConfirmDeleteHolding,
      handleDeleteTrade,
      handleHoldingMenuClick,
      isHoldingMenuOpen,
      handleDeleteHoldingClick,
      handleHoldingClick,
      isHoldingExpanded
    }
  }
}
</script>
