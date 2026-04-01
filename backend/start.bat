@echo off
chcp 65001 >nul 2>&1
title 投资账本后端服务

echo =========================================
echo   投资账本后端服务
echo =========================================

:: 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到 python，请先安装 Python 3.9+
    pause
    exit /b 1
)

:: 创建虚拟环境
if not exist "venv" (
    echo [1/3] 创建虚拟环境...
    python -m venv venv
)

:: 激活虚拟环境
echo [2/3] 激活虚拟环境...
call venv\Scripts\activate.bat

:: 安装依赖
echo [3/3] 检查依赖...
pip install -q -r requirements.txt 2>nul

:: 启动
echo.
echo 启动服务...
echo =========================================
python main.py
pause
