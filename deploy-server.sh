#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

PROJECT_DIR="/opt/tzzb"
WEB_DIR="/var/www/tzzb"

log_info "=========================================="
log_info "   tzzb - 服务器部署脚本"
log_info "=========================================="

log_step "1/7 创建项目目录..."
mkdir -p ${PROJECT_DIR}
mkdir -p ${WEB_DIR}

log_step "2/7 配置后端..."
cd ${PROJECT_DIR}/backend

if [ ! -d "venv" ]; then
    log_info "创建 Python 虚拟环境..."
    python3.12 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    log_info "创建 .env 文件..."
    cat > .env << EOF
DB_DRIVER=sqlite
JWT_SECRET=$(openssl rand -hex 32)
HOST=127.0.0.1
PORT=8000
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
EOF
fi

# 数据库初始化/更新
log_info "初始化/更新数据库..."

# 清空数据库（删除SQLite文件）
if [ -f "database.db" ]; then
    log_info "删除现有数据库文件..."
    rm -f database.db
fi

cat > init_db.py << 'EOF'
"""
数据库初始化脚本 - 确保表结构与模型一致
"""
import asyncio
from app.core.database import init_db

async def main():
    print("正在初始化数据库...")
    await init_db()
    print("数据库初始化完成")

if __name__ == "__main__":
    asyncio.run(main())
EOF

python init_db.py
rm init_db.py

log_step "3/7 创建 Systemd 服务..."
cat > /etc/systemd/system/tzzb-backend.service << EOF
[Unit]
Description=tzzb Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}/backend
EnvironmentFile=${PROJECT_DIR}/backend/.env
ExecStart=${PROJECT_DIR}/backend/venv/bin/python main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tzzb-backend
systemctl restart tzzb-backend

log_step "4/7 构建前端..."
cd ${PROJECT_DIR}/frontend
npm install
npm run build

log_step "5/7 部署前端..."
cp -r dist/* ${WEB_DIR}/

log_step "6/7 配置 Nginx..."
cat > /etc/nginx/sites-available/tzzb << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/tzzb;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/tzzb /etc/nginx/sites-enabled/

nginx -t
systemctl reload nginx

log_step "7/7 验证服务状态..."
sleep 3

echo ""
log_info "=========================================="
log_info "   部署完成！"
log_info "=========================================="
echo ""
log_info "访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')"
log_info "默认账号: admin / admin"
echo ""
log_info "常用命令:"
log_info "  后端状态: systemctl status tzzb-backend"
log_info "  后端日志: journalctl -u tzzb-backend -f"
log_info "  Nginx 状态: systemctl status nginx"
log_info "  Nginx 日志: tail -f /var/log/nginx/access.log"
