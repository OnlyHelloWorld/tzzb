"""
config.py — 配置管理
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# 加载.env文件
print(f"Loading .env from: {BASE_DIR / '.env'}")
print(f"File exists: {(BASE_DIR / '.env').exists()}")
load_dotenv(dotenv_path=BASE_DIR / ".env")
print(f"SMTP_USER: {os.getenv('SMTP_USER')}")
print(f"SMTP_PASSWORD: {os.getenv('SMTP_PASSWORD')}")

class Settings:
    # 数据库
    DB_DRIVER: str = "sqlite"  # mysql | sqlite
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = "investment_ledger"

    @property
    def DATABASE_URL(self) -> str:
        if self.DB_DRIVER == "sqlite":
            db_path = Path(__file__).resolve().parent.parent / f"{self.DB_NAME}.db"
            return f"sqlite+aiosqlite:///{db_path}"
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "72"))

    # 服务
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ]

    # 日志
    LOG_DIR: str = os.getenv("LOG_DIR", str(BASE_DIR / "logs"))
    LOG_MAX_BYTES: int = int(os.getenv("LOG_MAX_BYTES", "10485760"))  # 10MB
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "10"))
    LOG_RETENTION_DAYS: int = int(os.getenv("LOG_RETENTION_DAYS", "10"))

    # SMTP 邮件（QQ 邮箱）
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.qq.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "465"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")  # QQ 邮箱授权码


settings = Settings()
