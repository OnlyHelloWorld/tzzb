"""
settings.py — 设置路由
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.models import User, UserSetting
from app.core.schemas import SettingsResponse, SettingsUpdate
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["设置"])


@router.get("", response_model=SettingsResponse)
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户设置"""
    logger.info(f"用户 {user.username} 获取设置")
    try:
        result = await db.execute(select(UserSetting).where(UserSetting.user_id == user.id))
        setting = result.scalar_one_or_none()
        if not setting:
            logger.debug(f"用户 {user.username} 暂无设置，返回默认值")
            return SettingsResponse()
        logger.debug(f"用户 {user.username} 获取设置成功")
        return SettingsResponse(
            fx_usd=setting.fx_usd,
            fx_hkd=setting.fx_hkd,
            auto_refresh=setting.auto_refresh,
            ledger_view_mode=setting.ledger_view_mode,
            ledger_sort_by=setting.ledger_sort_by,
            ledger_sort_asc=setting.ledger_sort_asc,
        )
    except Exception as e:
        logger.error(f"用户 {user.username} 获取设置失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"message": "获取设置失败", "error": str(e)})


@router.put("")
async def update_settings(
    req: SettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新用户设置"""
    logger.info(f"用户 {user.username} 开始更新设置")
    try:
        result = await db.execute(select(UserSetting).where(UserSetting.user_id == user.id))
        setting = result.scalar_one_or_none()

        is_new = False
        if not setting:
            setting = UserSetting(user_id=user.id)
            db.add(setting)
            is_new = True

        if req.fx_usd is not None:
            setting.fx_usd = req.fx_usd
        if req.fx_hkd is not None:
            setting.fx_hkd = req.fx_hkd
        if req.auto_refresh is not None:
            setting.auto_refresh = req.auto_refresh
        if req.ledger_view_mode is not None:
            setting.ledger_view_mode = req.ledger_view_mode
        if req.ledger_sort_by is not None:
            setting.ledger_sort_by = req.ledger_sort_by
        if req.ledger_sort_asc is not None:
            setting.ledger_sort_asc = req.ledger_sort_asc

        await db.commit()
        logger.info(f"用户 {user.username} 更新设置成功: 新建={is_new}")
        return {"ok": True}
    except Exception as e:
        logger.error(f"用户 {user.username} 更新设置失败: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail={"message": "更新设置失败", "error": str(e)})
