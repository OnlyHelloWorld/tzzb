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

upsert_env_var() {
    local key="$1"
    local value="$2"
    local env_file="$3"
    if grep -q "^${key}=" "${env_file}"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "${env_file}"
    else
        echo "${key}=${value}" >> "${env_file}"
    fi
}

if [ ! -d "venv" ]; then
    log_info "创建 Python 虚拟环境..."
    python3.12 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    log_info "创建 .env 文件..."
    cat > .env << EOF
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=11110000aaa!
DB_NAME=tzzb
JWT_SECRET=$(openssl rand -hex 32)
HOST=127.0.0.1
PORT=8000
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
EOF
fi

# 优先使用 SMTP_*，兼容 QQ_* 旧变量
SMTP_USER_VAL="${SMTP_USER:-${QQ_EMAIL:-}}"
SMTP_PASSWORD_VAL="${SMTP_PASSWORD:-${QQ_AUTH_CODE:-}}"

if [ -n "${SMTP_USER_VAL}" ]; then
    upsert_env_var "SMTP_USER" "${SMTP_USER_VAL}" ".env"
fi

if [ -n "${SMTP_PASSWORD_VAL}" ]; then
    upsert_env_var "SMTP_PASSWORD" "${SMTP_PASSWORD_VAL}" ".env"
fi

set -a
source .env
set +a

if [ -z "${DB_NAME}" ]; then
    log_warn "检测到 DB_NAME 为空，自动回退为默认值 tzzb"
    DB_NAME="tzzb"
    if grep -q '^DB_NAME=' .env; then
        sed -i 's/^DB_NAME=.*/DB_NAME=tzzb/' .env
    else
        echo "DB_NAME=tzzb" >> .env
    fi
fi

# 数据库初始化/更新
log_info "初始化/更新数据库（保留现有数据）..."

log_info "检查并安装 MySQL..."
if ! command -v mysql >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y mysql-server
fi

MYSQL_SERVICE_NAMES=("mysql" "mysqld" "mariadb")
MYSQL_SERVICE_FOUND=""

for service_name in "${MYSQL_SERVICE_NAMES[@]}"; do
    if systemctl list-unit-files | grep -q "^${service_name}\.service"; then
        MYSQL_SERVICE_FOUND="${service_name}"
        break
    fi
done

if [ -n "${MYSQL_SERVICE_FOUND}" ]; then
    log_info "找到 MySQL/MariaDB 服务: ${MYSQL_SERVICE_FOUND}"
    systemctl enable "${MYSQL_SERVICE_FOUND}" || true
    systemctl restart "${MYSQL_SERVICE_FOUND}" || true
    sleep 5
else
    log_warn "未找到标准的 MySQL/MariaDB 服务，尝试继续..."
fi

log_info "确保数据库存在（不删除现有数据）..."
if mysql --protocol=socket -uroot -e "SELECT 1;" >/dev/null 2>&1; then
    log_info "通过 socket 连接 MySQL root，设置 root 密码..."
    mysql --protocol=socket -uroot <<EOF
CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';
ALTER USER 'root'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EOF
else
    log_info "通过密码连接 MySQL root，更新 root 密码..."
    mysql -h127.0.0.1 -uroot -p"${DB_PASSWORD}" <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';
ALTER USER 'root'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';
FLUSH PRIVILEGES;
EOF
fi

MYSQL_PWD_OPT=()
if [ -n "${DB_PASSWORD}" ]; then
    MYSQL_PWD_OPT=(-p"${DB_PASSWORD}")
fi

MYSQL_HOST="${DB_HOST:-127.0.0.1}"
MYSQL_PORT="${DB_PORT:-3306}"
MYSQL_USER="${DB_USER:-root}"
if [ -z "${MYSQL_HOST}" ]; then MYSQL_HOST="127.0.0.1"; fi
if [ -z "${MYSQL_PORT}" ]; then MYSQL_PORT="3306"; fi
if [ -z "${MYSQL_USER}" ]; then MYSQL_USER="root"; fi

mysql --host="${MYSQL_HOST}" --port="${MYSQL_PORT}" --user="${MYSQL_USER}" "${MYSQL_PWD_OPT[@]}" \
  -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

cat > init_db.py << 'EOF'
"""
数据库初始化脚本 - 使用 create_all 确保表存在，不删除现有数据
"""
import asyncio
from app.core.database import init_db

async def main():
    print("正在检查/更新数据库表结构...")
    await init_db()
    print("数据库表结构检查完成")

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
