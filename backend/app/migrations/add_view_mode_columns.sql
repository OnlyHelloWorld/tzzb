-- 迁移脚本：为 user_settings 表添加视图偏好字段
-- 执行方式：mysql -u root -p tzzb < add_view_mode_columns.sql
-- 或直接在 MySQL 客户端中执行

ALTER TABLE user_settings 
ADD COLUMN ledger_view_mode VARCHAR(20) DEFAULT 'card',
ADD COLUMN ledger_sort_by VARCHAR(10) DEFAULT 'mv',
ADD COLUMN ledger_sort_asc BOOLEAN DEFAULT FALSE;
