"""
config.py — 配置管理
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# 加载.env文件
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    # 数据库
    DB_DRIVER: str = "mysql"
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "tzzb")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "87600"))  # 10年 = 永久有效

    # 服务
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS
    @property
    def CORS_ORIGINS(self) -> list:
        default_origins = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:4173",
        ]
        # 从环境变量读取额外的 CORS 源
        extra_origins = os.getenv("CORS_EXTRA_ORIGINS", "")
        if extra_origins:
            default_origins.extend(
                [origin.strip() for origin in extra_origins.split(",") if origin.strip()]
            )
        return default_origins

    # 日志
    LOG_DIR: str = os.getenv("LOG_DIR", str(BASE_DIR / "logs"))
    LOG_MAX_BYTES: int = int(os.getenv("LOG_MAX_BYTES", "10485760"))  # 10MB
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "10"))
    LOG_RETENTION_DAYS: int = int(os.getenv("LOG_RETENTION_DAYS", "10"))

    # SMTP 邮件（QQ 邮箱）
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.qq.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "465"))
    # 兼容变量名：
    # - SMTP_USER / SMTP_PASSWORD（推荐）
    # - QQ_EMAIL / QQ_AUTH_CODE（兼容旧配置）
    SMTP_USER: str = os.getenv("SMTP_USER") or os.getenv("QQ_EMAIL", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD") or os.getenv("QQ_AUTH_CODE", "")  # QQ 邮箱授权码


settings = Settings()
