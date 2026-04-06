此次合并主要修改了 LedgerPage.vue 文件中的持仓展开/折叠功能，将单一展开状态改为支持多个持仓项同时展开的状态管理。这一变更提升了用户体验，允许用户同时查看多个持仓的详细信息。
| 文件 | 变更 |
|------|---------|
| frontend/web/views/LedgerPage.vue | - 将 expanded 状态从 ref(null) 改为 ref({})，支持存储多个持仓的展开状态<br>- 修改 handleHoldingClick 函数，实现单个持仓展开/折叠状态的独立切换<br>- 修改 isHoldingExpanded 函数，适配新的对象存储方式检查持仓展开状态 |