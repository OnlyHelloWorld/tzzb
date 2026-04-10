"""
迁移脚本：为 user_settings 表添加视图偏好字段

运行方式：
    python -m app.migrations.add_view_mode_columns

或在 MySQL 中直接执行：
    ALTER TABLE user_settings 
    ADD COLUMN ledger_view_mode VARCHAR(20) DEFAULT 'card',
    ADD COLUMN ledger_sort_by VARCHAR(10) DEFAULT 'mv',
    ADD COLUMN ledger_sort_asc BOOLEAN DEFAULT FALSE;
"""
import asyncio
import logging
from sqlalchemy import text
from app.core.database import engine

logger = logging.getLogger(__name__)


async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("""
                ALTER TABLE user_settings 
                ADD COLUMN ledger_view_mode VARCHAR(20) DEFAULT 'card',
                ADD COLUMN ledger_sort_by VARCHAR(10) DEFAULT 'mv',
                ADD COLUMN ledger_sort_asc BOOLEAN DEFAULT FALSE
            """))
            logger.info("迁移成功：已添加 ledger_view_mode, ledger_sort_by, ledger_sort_asc 列")
        except Exception as e:
            if "Duplicate column" in str(e) or "already exists" in str(e).lower():
                logger.info("列已存在，跳过迁移")
            else:
                logger.error(f"迁移失败: {e}")
                raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(migrate())
