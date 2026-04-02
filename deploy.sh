#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

COMPOSE_CMD=""

get_compose_cmd() {
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        return 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        log_info "安装 Docker: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    if ! get_compose_cmd; then
        log_error "Docker Compose 未安装"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行或当前用户无权限"
        log_info "请运行: sudo systemctl start docker"
        log_info "或将当前用户加入 docker 组: sudo usermod -aG docker \$USER"
        exit 1
    fi
}

check_env() {
    if [ ! -f .env ]; then
        log_warn ".env 文件不存在，使用默认配置"
        cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-me-in-production")
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
EOF
        log_info "已创建 .env 文件"
    fi
}

deploy() {
    log_info "=========================================="
    log_info "   投资账本 - 一键部署"
    log_info "=========================================="

    check_docker
    check_env

    log_info "停止旧容器..."
    $COMPOSE_CMD down 2>/dev/null || true

    log_info "构建镜像..."
    $COMPOSE_CMD build --no-cache

    log_info "启动服务..."
    $COMPOSE_CMD up -d

    log_info "等待服务启动..."
    sleep 5

    if $COMPOSE_CMD ps | grep -q "Up"; then
        log_info "=========================================="
        log_info "   部署成功！"
        log_info "=========================================="
        log_info "访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')"
        log_info "默认账号: admin / admin"
        log_info ""
        log_info "常用命令:"
        log_info "  查看日志: $COMPOSE_CMD logs -f"
        log_info "  停止服务: $COMPOSE_CMD down"
        log_info "  重启服务: $COMPOSE_CMD restart"
    else
        log_error "部署失败，请检查日志: $COMPOSE_CMD logs"
        exit 1
    fi
}

stop() {
    log_info "停止服务..."
    $COMPOSE_CMD down
    log_info "服务已停止"
}

logs() {
    $COMPOSE_CMD logs -f
}

case "${1:-deploy}" in
    deploy|start)
        deploy
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        deploy
        ;;
    logs)
        logs
        ;;
    *)
        echo "用法: $0 {deploy|start|stop|restart|logs}"
        exit 1
        ;;
esac
