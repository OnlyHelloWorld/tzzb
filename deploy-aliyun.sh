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

REGISTRY=${REGISTRY:-"registry.cn-hangzhou.aliyuncs.com"}
NAMESPACE=${NAMESPACE:-"tzzb"}
IMAGE_NAME=${IMAGE_NAME:-"app"}
VERSION=${VERSION:-"latest"}

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${VERSION}"

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
}

login_aliyun() {
    log_step "登录阿里云容器镜像服务..."
    if [ -z "$ALIYUN_USERNAME" ] || [ -z "$ALIYUN_PASSWORD" ]; then
        log_warn "请设置阿里云镜像服务凭证:"
        log_info "  export ALIYUN_USERNAME=your-username"
        log_info "  export ALIYUN_PASSWORD=your-password"
        log_info ""
        log_info "阿里云容器镜像服务地址: https://cr.console.aliyun.com/"
        echo -n "请输入用户名: "
        read -r ALIYUN_USERNAME
        echo -n "请输入密码: "
        read -rs ALIYUN_PASSWORD
        echo
    fi

    echo "$ALIYUN_PASSWORD" | docker login "$REGISTRY" -u "$ALIYUN_USERNAME" --password-stdin
    log_info "登录成功"
}

build_and_push() {
    log_step "构建并推送镜像到阿里云..."

    log_info "构建后端镜像..."
    docker build -t "${FULL_IMAGE}-backend" ./backend

    log_info "构建前端镜像..."
    docker build -t "${FULL_IMAGE}-frontend" ./frontend

    log_info "推送后端镜像..."
    docker push "${FULL_IMAGE}-backend"

    log_info "推送前端镜像..."
    docker push "${FULL_IMAGE}-frontend"

    log_info "镜像推送完成"
}

generate_compose() {
    log_step "生成阿里云部署配置..."

    cat > docker-compose.aliyun.yml << EOF
services:
  backend:
    image: ${FULL_IMAGE}-backend
    container_name: investment-backend
    restart: always
    environment:
      - DB_DRIVER=mysql
      - DB_HOST=\${DB_HOST:-localhost}
      - DB_PORT=\${DB_PORT:-3306}
      - DB_USER=\${DB_USER:-root}
      - DB_PASSWORD=\${DB_PASSWORD:-}
      - DB_NAME=\${DB_NAME:-tzzb}
      - JWT_SECRET=\${JWT_SECRET:-change-me-in-production}
      - HOST=0.0.0.0
      - PORT=8000
      - SMTP_HOST=\${SMTP_HOST:-smtp.qq.com}
      - SMTP_PORT=\${SMTP_PORT:-465}
      - SMTP_USER=\${SMTP_USER:-}
      - SMTP_PASSWORD=\${SMTP_PASSWORD:-}
    volumes:
      - backend-data:/app/data
      - backend-logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: ${FULL_IMAGE}-frontend
    container_name: investment-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy

volumes:
  backend-data:
  backend-logs:
EOF

    log_info "已生成 docker-compose.aliyun.yml"
}

show_deploy_guide() {
    echo ""
    log_info "=========================================="
    log_info "   阿里云部署指南"
    log_info "=========================================="
    echo ""
    log_step "方式一: 在阿里云 ECS 服务器上部署"
    echo ""
    echo "1. 登录阿里云 ECS 服务器"
    echo ""
    echo "2. 安装 Docker:"
    echo "   curl -fsSL https://get.docker.com | sh"
    echo "   sudo usermod -aG docker \$USER"
    echo ""
    echo "3. 登录阿里云镜像仓库:"
    echo "   docker login ${REGISTRY}"
    echo ""
    echo "4. 下载部署配置:"
    echo "   curl -O https://your-repo/docker-compose.aliyun.yml"
    echo ""
    echo "5. 创建环境变量文件:"
    cat << 'EOF'
   cat > .env << ENVEOF
JWT_SECRET=$(openssl rand -hex 32)
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=tzzb
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your-email@qq.com
SMTP_PASSWORD=your-smtp-password
ENVEOF
EOF
    echo ""
    echo "6. 启动服务:"
    echo "   docker compose -f docker-compose.aliyun.yml up -d"
    echo ""
    log_step "方式二: 使用阿里云容器服务 ACK"
    echo ""
    echo "1. 创建 Kubernetes 集群"
    echo "2. 配置镜像拉取凭证"
    echo "3. 使用 helm 或 kubectl 部署"
    echo ""
    log_info "镜像地址:"
    echo "  后端: ${FULL_IMAGE}-backend"
    echo "  前端: ${FULL_IMAGE}-frontend"
    echo ""
    log_info "访问地址: http://<服务器IP>"
    log_info "默认账号: admin / admin"
}

push() {
    check_docker
    login_aliyun
    build_and_push
    generate_compose
    show_deploy_guide
}

case "${1:-push}" in
    push)
        push
        ;;
    login)
        check_docker
        login_aliyun
        ;;
    build)
        check_docker
        build_and_push
        ;;
    *)
        echo "用法: $0 {push|login|build}"
        echo ""
        echo "环境变量:"
        echo "  ALIYUN_USERNAME - 阿里云账号"
        echo "  ALIYUN_PASSWORD - 阿里云密码"
        echo "  REGISTRY       - 镜像仓库地址 (默认: registry.cn-hangzhou.aliyuncs.com)"
        echo "  NAMESPACE      - 命名空间 (默认: investment-ledger)"
        echo "  IMAGE_NAME     - 镜像名称 (默认: app)"
        echo "  VERSION        - 版本标签 (默认: latest)"
        exit 1
        ;;
esac
