# 投资账本后端

## 项目结构

后端使用 FastAPI 框架构建，主要依赖包括：
- FastAPI 0.110.0
- Uvicorn 0.29.0 (ASGI 服务器)
- SQLAlchemy 2.0.30 (ORM)
- aiomysql 0.2.0 (异步 MySQL 驱动)
- aiosqlite 0.22.1 (异步 SQLite 驱动)
- passlib 1.7.4 (密码哈希)
- PyJWT 2.9.0 (JWT 认证)
- python-dotenv 1.0.1 (环境变量管理)
- pydantic 2.5.0 (数据验证)
- pydantic-settings 2.1.0 (配置管理)

## 环境配置

### 安装依赖

在后端目录下执行：

```bash
pip install -r requirements.txt
```

### 环境变量配置

复制 `.env.example` 文件为 `.env` 并根据实际情况修改配置：

```bash
cp .env.example .env
```

默认配置如下：

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=investment_ledger
JWT_SECRET=your-secret-key
```

## 开发环境启动

### 直接启动

在后端目录下执行：

```bash
python main.py
```

此命令会启动 FastAPI 应用，默认运行在 http://localhost:8000。

### 使用 Uvicorn 启动（推荐）

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- `--reload`：启用热重载，方便开发
- `--host 0.0.0.0`：允许网络访问
- `--port 8000`：指定端口

## 生产环境部署

### 使用启动脚本

后端提供了启动脚本，可用于生产环境：

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

后端目录中提供了 `investment-ledger.service` 文件，可用于 Systemd 服务管理：

1. 复制服务文件到 Systemd 目录：

```bash
sudo cp investment-ledger.service /etc/systemd/system/
```

2. 编辑服务文件，修改 `WorkingDirectory` 和 `ExecStart` 路径：

```bash
sudo nano /etc/systemd/system/investment-ledger.service
```

3. 启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable investment-ledger
sudo systemctl start investment-ledger
```

4. 查看服务状态：

```bash
sudo systemctl status investment-ledger
```

## 技术栈

- **框架**: FastAPI
- **服务器**: Uvicorn
- **数据库**: MySQL / SQLite
- **ORM**: SQLAlchemy (异步)
- **认证**: JWT
- **数据验证**: Pydantic

## 开发指南

1. 确保数据库服务已启动（MySQL 或 SQLite）
2. 配置 `.env` 文件中的数据库连接信息
3. 执行 `pip install -r requirements.txt` 安装依赖
4. 执行 `uvicorn main:app --reload` 启动开发服务器
5. 在浏览器中访问 http://localhost:8000/docs 查看 API 文档
6. 开始开发和调试

## 注意事项

- 默认会创建一个管理员用户：admin/admin
- 生产环境中请修改 JWT_SECRET 和数据库密码
- 生产环境建议使用 MySQL 数据库，开发环境可使用 SQLite
- 服务启动时会自动初始化数据库表结构

## API 文档

启动服务后，可通过以下地址访问 API 文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 日志系统

后端配置了完善的日志系统：
- 控制台输出
- 按大小滚动的应用日志（app.log）
- 按天滚动的错误日志（error.log）

日志文件存储在 `logs` 目录中。