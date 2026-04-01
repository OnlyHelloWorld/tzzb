# 投资账本 - 后端部署指南

## 环境要求

- Python 3.9+
- MySQL 5.7+ / 8.0+

## 快速启动

### Windows
```
双击 start.bat
```

### Linux / macOS
```bash
chmod +x start.sh
./start.sh
```

## 配置

编辑 `.env` 文件：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=investment_ledger
JWT_SECRET=your-secret-key
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 登录 |
| GET | /api/auth/me | 获取当前用户 |
| GET | /api/holdings | 获取持仓列表 |
| POST | /api/holdings | 添加持仓 |
| PUT | /api/holdings/bulk | 批量保存持仓 |
| DELETE | /api/holdings/{id} | 删除持仓 |
| GET | /api/settings | 获取设置 |
| PUT | /api/settings | 更新设置 |

## Linux 系统服务（可选）

```bash
# 复制到系统目录
sudo cp investment-ledger.service /etc/systemd/system/

# 修改路径
sudo vim /etc/systemd/system/investment-ledger.service

# 启用并启动
sudo systemctl daemon-reload
sudo systemctl enable investment-ledger
sudo systemctl start investment-ledger

# 查看状态
sudo systemctl status investment-ledger

# 查看日志
sudo journalctl -u investment-ledger -f
```

## 日志

- `logs/app.log` — 所有日志（按大小滚动，单文件最大 10MB，保留 10 个备份）
- `logs/error.log` — 错误日志（按天滚动，保留 10 天）
