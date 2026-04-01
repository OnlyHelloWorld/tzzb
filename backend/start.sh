#!/bin/bash
# ─── 投资账本后端 - Linux/macOS 启动脚本 ─────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================="
echo "  投资账本后端服务"
echo "========================================="

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3，请先安装 Python 3.9+"
    exit 1
fi

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "[1/3] 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "[2/3] 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "[3/3] 检查依赖..."
pip install -q -r requirements.txt 2>/dev/null

# 加载 .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# 启动
echo ""
echo "启动服务..."
echo "========================================="
exec python main.py
