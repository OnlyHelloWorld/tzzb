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

SERVER_IP=${1:-"34.21.169.1"}
SERVER_USER=${2:-"root"}
SERVER_PASS=${3:-"11110000aaa!"}
PROJECT_DIR="/opt/tzzb"

log_info "=========================================="
log_info "   tzzb - 部署到谷歌云"
log_info "=========================================="
log_info "服务器: ${SERVER_USER}@${SERVER_IP}"
echo ""

log_step "1/6 检查 SSH 工具..."
if ! command -v sshpass &> /dev/null; then
    log_warn "sshpass 未安装，正在安装..."
    apt-get update && apt-get install -y sshpass || brew install sshpass 2>/dev/null || true
fi

log_step "2/6 上传代码到服务器..."
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "mkdir -p ${PROJECT_DIR}"

log_info "上传后端代码..."
sshpass -p "${SERVER_PASS}" scp -o StrictHostKeyChecking=no -r /workspace/backend ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

log_info "上传前端代码..."
sshpass -p "${SERVER_PASS}" scp -o StrictHostKeyChecking=no -r /workspace/frontend ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

log_info "上传部署脚本..."
sshpass -p "${SERVER_PASS}" scp -o StrictHostKeyChecking=no /workspace/deploy-server.sh ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/

log_step "3/6 在服务器上执行部署脚本..."
sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << EOF
cd ${PROJECT_DIR}
chmod +x deploy-server.sh
./deploy-server.sh
EOF

echo ""
log_info "=========================================="
log_info "   部署成功！"
log_info "=========================================="
echo ""
log_info "访问地址: http://${SERVER_IP}"
log_info "默认账号: admin / admin"
echo ""
log_info "您可以通过 SSH 登录服务器进行后续管理:"
log_info "ssh ${SERVER_USER}@${SERVER_IP}"
