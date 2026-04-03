# 账本数据隔离分析报告

## 问题描述

用户反映一个账本创建的数据会出现在另外一个账本，需要确保账本之间的数据隔离。

## 数据库结构分析

### 核心表结构

#### 1. User 表

- **主键**: `id`（自增整数）
- **核心字段**: `username`, `email`, `password_hash`
- **关系**: 一对多关联到 Ledger、Holding、UserSetting

#### 2. Ledger 表

- **主键**: `id`（自增整数）
- **外键**: `user_id`（关联到 User.id）
- **核心字段**: `name`, `color`
- **关系**: 一对多关联到 Holding

#### 3. Holding 表

- **主键**: `id`（自增整数）
- **唯一约束**: `(user_id, ledger_id, market, code)`，确保同一用户下同一账本内股票代码唯一
- **外键**: `user_id`（关联到 User.id），`ledger_id`（关联到 Ledger.id）
- **核心字段**: `market`, `code`, `name`, `sector`
- **关系**: 一对多关联到 Trade

#### 4. Trade 表

- **主键**: `id`（自增整数）
- **外键**: `holding_id`（关联到 Holding.id）
- **冗余字段**: `user_id`, `ledger_id`, `market`, `code`（便于查询过滤）
- **核心字段**: `date`, `qty`, `price`, `note`
- **关系**: 多对一关联到 Holding

### 数据隔离机制

1. **数据库层面隔离**：
   - **Holding 表**：`(user_id, ledger_id, market, code)` 唯一约束，确保不同账本的同一股票代码不冲突
   - **Trade 表**：通过 `holding_id` 外键绑定到具体持仓，天然隔离
   - **所有查询**：均通过 `user_id` 和 `ledger_id` 双重过滤

2. **API 层面隔离**：
   - 所有持仓 endpoints 均接受 `ledger_id` 参数并在查询中使用
   - 交易记录创建时自动关联到指定账本的持仓
   - 账本操作确保只处理当前登录用户的数据

3. **前端层面隔离**：
   - 所有持仓相关 API 调用均传递当前账本的 `ledger_id`
   - 切换账本时重新加载对应账本的数据
   - 界面只展示当前账本的数据

## 问题修复

### 已修复的问题

1. **Trade 表关联方式**：
   - **问题**: 原设计使用 `(user_id, market, code)` 联合外键，缺少 `ledger_id`，导致不同账本的相同股票交易记录混用
   - **解决方案**: Trade 表改用 `holding_id` 作为外键直接关联到 Holding.id，Holding 表通过 `(user_id, ledger_id, market, code)` 唯一约束保证账本隔离

2. **API 端点参数**：
   - **问题**: 部分 API 端点缺少 `ledger_id` 参数
   - **解决方案**: 所有持仓相关 API 均添加 `ledger_id` 参数，并在查询条件中使用

3. **前端 API 调用**：
   - **问题**: 前端调用 API 时未传递 `ledger_id` 参数
   - **解决方案**: 更新前端 API 调用，确保所有操作传递正确的 `ledger_id`

## 确保数据隔离的措施

1. **数据库设计**：
   - Holding 表的唯一约束 `(user_id, ledger_id, market, code)` 保证账本级别的股票唯一性
   - Trade 表通过 `holding_id` 外键与具体持仓绑定，隔离在账本维度
   - 所有表均包含 `user_id`，保证用户级别的数据隔离

2. **API 实现**：
   - 所有持仓和交易相关 API 要求传递 `ledger_id`
   - 查询时使用 `user_id` + `ledger_id` 双重过滤
   - 批量操作只处理指定账本的数据

3. **前端实现**：
   - 切换账本时重新加载对应账本数据
   - 所有 API 调用传递当前账本的 `ledger_id`
   - 界面只展示当前账本的数据

4. **测试验证**：
   - 创建多个账本，在不同账本中添加相同股票代码的持仓
   - 验证每个账本只显示自己的持仓数据
   - 测试删除账本时只删除对应账本的数据

## 结论

通过以上措施，确保了账本之间的数据隔离：

- **数据库层面**：Holding 唯一约束 + Trade 通过 `holding_id` 绑定，保证数据关联正确性
- **API 层面**：所有操作通过 `ledger_id` 过滤
- **前端层面**：只展示和操作当前账本的数据

一个账本创建的数据不会出现在另外一个账本中。
