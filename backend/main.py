"""
main.py — FastAPI 应用入口
"""
import os
import sys
import logging
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.core.models import User
from app.core.security import hash_password


# ─── 日志系统 ─────────────────────────────────────────────────
def setup_logging():
    """配置日志：控制台 + 滚动文件（按大小10MB） + 按天保留10天"""
    log_dir = Path(settings.LOG_DIR)
    log_dir.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    if root_logger.handlers:
        return

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(fmt)
    root_logger.addHandler(console)

    size_handler = RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=settings.LOG_MAX_BYTES,
        backupCount=settings.LOG_BACKUP_COUNT,
        encoding="utf-8",
    )
    size_handler.setLevel(logging.INFO)
    size_handler.setFormatter(fmt)
    root_logger.addHandler(size_handler)

    day_handler = TimedRotatingFileHandler(
        log_dir / "error.log",
        when="midnight",
        interval=1,
        backupCount=settings.LOG_RETENTION_DAYS,
        encoding="utf-8",
    )
    day_handler.setLevel(logging.ERROR)
    day_handler.setFormatter(fmt)
    root_logger.addHandler(day_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


# ─── 应用生命周期 ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动
    logger = logging.getLogger(__name__)
    logger.info("=" * 50)
    logger.info("投资账本后端服务启动中...")
    logger.info(f"数据库: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")

    await init_db()
    await _ensure_default_user()

    logger.info(f"服务地址: http://{settings.HOST}:{settings.PORT}")
    logger.info("启动完成")
    yield
    # 关闭
    logger.info("服务关闭")


async def _ensure_default_user():
    """确保默认 admin 用户存在"""
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(username="admin", email="admin@local", password_hash=hash_password("admin"))
            db.add(user)
            await db.commit()
            logging.getLogger(__name__).info("已创建默认用户: admin/admin")


# ─── 创建 FastAPI 应用 ───────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title="投资账本 API",
        description="个人投资组合管理后端",
        version="1.0.0",
        lifespan=lifespan,
    )

    # 请求日志中间件
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        logger = logging.getLogger(__name__)
        logger.info(f"请求开始: {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            logger.info(f"请求完成: {request.method} {request.url.path} - 状态码: {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"请求异常: {request.method} {request.url.path} - 错误: {str(e)}", exc_info=True)
            raise

    # 全局异常处理器
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger = logging.getLogger(__name__)
        logger.error(f"未捕获的异常: {request.method} {request.url.path}", exc_info=True)
        
        if isinstance(exc, HTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )
        
        return JSONResponse(
            status_code=500,
            content={"detail": "服务器内部错误"}
        )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册路由
    from app.api.auth import router as auth_router
    from app.api.holdings import router as holdings_router
    from app.api.ledgers import router as ledgers_router
    from app.api.settings import router as settings_router

    app.include_router(auth_router, prefix="/api")
    app.include_router(holdings_router, prefix="/api")
    app.include_router(ledgers_router, prefix="/api")
    app.include_router(settings_router, prefix="/api")

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


# ─── 入口 ─────────────────────────────────────────────────────
setup_logging()
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
    )
