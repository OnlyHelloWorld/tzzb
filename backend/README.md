# 投资账本后端

## 项目结构

后端使用 FastAPI 框架构建，主要依赖包括：

- FastAPI 0.110.0
- Uvicorn 0.29.0（ASGI 服务器）
- SQLAlchemy 2.0.30（异步 ORM）
- aiosqlite 0.22.1（异步 SQLite 驱动）
- passlib 1.7.4（密码哈希，使用 pbkdf2_sha256 算法）
- PyJWT 2.9.0（JWT 认证，令牌永久有效）
- python-dotenv 1.0.1（环境变量管理）
- pydantic 2.5.0（数据验证）
- pydantic-settings 2.1.0（配置管理）

## 环境配置

### 安装依赖

在后端目录下执行：

```bash
pip install -r requirements.txt
```

### 环境变量配置

复制 `.env.example` 文件为 `.env` 并根据实际情况修改：

```bash
cp .env.example .env
```

完整环境变量说明：

```
# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRE_HOURS=87600            # 默认 10 年（永久有效）

# 服务
HOST=0.0.0.0
PORT=8000

# CORS（额外允许的源，逗号分隔）
CORS_EXTRA_ORIGINS=

# SMTP 邮件（QQ 邮箱）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=                    # QQ 邮箱授权码

# 日志
LOG_DIR=logs
LOG_MAX_BYTES=10485760            # 单文件最大 10MB
LOG_BACKUP_COUNT=10
LOG_RETENTION_DAYS=10
```

> **注意**：数据库固定使用 SQLite，数据文件位于 `app/tzzb.db`，无需配置数据库连接。

## 开发环境启动

### 直接启动

在后端目录下执行：

```bash
python main.py
```

### 使用 Uvicorn 启动（推荐）

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- `--reload`：启用热重载，方便开发
- `--host 0.0.0.0`：允许网络访问
- `--port 8000`：指定端口

## 生产环境部署

### 使用启动脚本

#### Linux/Mac

```bash
chmod +x start.sh
./start.sh
```

#### Windows

```bash
start.bat
```

### 使用 Systemd 服务

后端目录中提供了 `tzzb-backend.service` 文件，可用于 Systemd 服务管理：

1. 复制服务文件到 Systemd 目录：

```bash
sudo cp tzzb-backend.service /etc/systemd/system/
```

2. 编辑服务文件，修改 `WorkingDirectory` 和 `ExecStart` 路径：

```bash
sudo nano /etc/systemd/system/tzzb-backend.service
```

3. 启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable tzzb-backend
sudo systemctl start tzzb-backend
```

4. 查看服务状态：

```bash
sudo systemctl status tzzb-backend
```

## 技术栈

- **框架**: FastAPI
- **服务器**: Uvicorn
- **数据库**: SQLite（固定，无需配置）
- **ORM**: SQLAlchemy（异步）
- **认证**: JWT（永久有效令牌，不验证过期时间）
- **密码哈希**: passlib pbkdf2_sha256
- **数据验证**: Pydantic

## 开发指南

1. 配置 `.env` 文件（最少只需设置 `JWT_SECRET`）
2. 执行 `pip install -r requirements.txt` 安装依赖
3. 执行 `uvicorn main:app --reload` 启动开发服务器
4. 在浏览器中访问 `http://localhost:8000/docs` 查看 API 文档
5. 开始开发和调试

## 注意事项

- 服务启动时会自动初始化数据库表结构，并创建默认用户 `admin/admin`
- 生产环境中请修改 `JWT_SECRET` 并及时更改 admin 密码
- 数据库文件默认存储在 `app/tzzb.db`，使用 Docker 时已挂载到持久卷

## API 文档

启动服务后，可通过以下地址访问 API 文档：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 日志系统

后端配置了完善的日志系统：

- 控制台输出
- 按大小滚动的应用日志（`logs/app.log`，单文件最大 10MB，保留 10 个）
- 按天滚动的错误日志（`logs/error.log`，保留 10 天）
