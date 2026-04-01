"""
settings.py — 设置路由
"""
import logging
from fastapi import APIRouter, Depends
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
    result = await db.execute(select(UserSetting).where(UserSetting.user_id == user.id))
    setting = result.scalar_one_or_none()
    if not setting:
        return SettingsResponse()
    return SettingsResponse(
        fx_usd=setting.fx_usd,
        fx_hkd=setting.fx_hkd,
        auto_refresh=setting.auto_refresh,
    )


@router.put("")
async def update_settings(
    req: SettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新用户设置"""
    result = await db.execute(select(UserSetting).where(UserSetting.user_id == user.id))
    setting = result.scalar_one_or_none()

    if not setting:
        setting = UserSetting(user_id=user.id)
        db.add(setting)

    if req.fx_usd is not None:
        setting.fx_usd = req.fx_usd
    if req.fx_hkd is not None:
        setting.fx_hkd = req.fx_hkd
    if req.auto_refresh is not None:
        setting.auto_refresh = req.auto_refresh

    await db.commit()
    logger.info(f"用户 {user.username} 更新设置")
    return {"ok": True}
