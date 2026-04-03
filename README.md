# 投资账本 (TZZB)

个人投资组合管理工具，支持多账本、多市场持仓记录与交易追踪。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite |
| 后端 | FastAPI + Uvicorn |
| 数据库 | SQLite（通过 SQLAlchemy 异步 ORM） |
| 认证 | JWT（永久有效令牌） |
| 容器化 | Docker + Docker Compose |

## 项目结构

```
tzzb/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── api/      # 路由：auth、holdings、ledgers、settings
│   │   └── core/     # 配置、数据库、模型、安全
│   ├── main.py
│   └── requirements.txt
├── frontend/         # Vue 3 前端
│   ├── web/          # 源码（App.vue、lib/）
│   └── package.json
├── docker-compose.yml
└── deploy.sh
```

## 快速开始

### 使用 Docker Compose（推荐）

```bash
cp .env.example .env   # 按需修改 JWT_SECRET、SMTP 配置
docker compose up -d
```

前端访问 `http://localhost`，后端 API 文档：`http://localhost:8000/docs`

### 本地开发

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 前端（另开终端）
cd frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:5173`

## 默认账号

| 用户名 | 密码 |
|--------|------|
| admin  | admin |

> ⚠️ 生产环境请及时修改密码和 `JWT_SECRET`

## 主要功能

- 多账本管理，账本间数据完全隔离
- 支持 A 股、港股、美股持仓记录
- 交易记录增删改查
- JSON / CSV / PDF 三种格式导入导出
- 汇率配置（USD、HKD）
- JWT 认证，支持多用户
