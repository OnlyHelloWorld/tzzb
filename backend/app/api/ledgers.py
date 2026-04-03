"""
ledgers.py — 账本路由
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.models import User, Ledger
from app.core.schemas import LedgerCreate, LedgerResponse, LedgerUpdate
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ledgers", tags=["账本"])


@router.get("", response_model=List[LedgerResponse])
async def get_ledgers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户所有账本"""
    result = await db.execute(
        select(Ledger)
        .where(Ledger.user_id == user.id)
        .order_by(Ledger.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=LedgerResponse)
async def create_ledger(
    req: LedgerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新账本"""
    # 检查账本名称是否已存在
    result = await db.execute(
        select(Ledger)
        .where(Ledger.user_id == user.id, Ledger.name == req.name)
    )
    existing_ledger = result.scalar_one_or_none()
    if existing_ledger:
        raise HTTPException(status_code=400, detail="账本名称已存在")
    
    ledger = Ledger(
        user_id=user.id,
        name=req.name,
        color=req.color,
    )
    db.add(ledger)
    await db.commit()
    await db.refresh(ledger)
    logger.info(f"用户 {user.username} 创建账本: {req.name}")
    return ledger


@router.put("/{ledger_id}", response_model=LedgerResponse)
async def update_ledger(
    ledger_id: int,
    req: LedgerUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新账本信息"""
    result = await db.execute(
        select(Ledger)
        .where(Ledger.id == ledger_id, Ledger.user_id == user.id)
    )
    ledger = result.scalar_one_or_none()
    if not ledger:
        raise HTTPException(status_code=404, detail="账本不存在")

    if req.name is not None and req.name != ledger.name:
        # 检查新名称是否已存在
        name_check = await db.execute(
            select(Ledger)
            .where(Ledger.user_id == user.id, Ledger.name == req.name)
        )
        if name_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="账本名称已存在")
        ledger.name = req.name
    
    if req.color is not None:
        ledger.color = req.color

    await db.commit()
    await db.refresh(ledger)
    logger.info(f"用户 {user.username} 更新账本: {ledger.name}")
    return ledger


@router.delete("/{ledger_id}")
async def delete_ledger(
    ledger_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除账本"""
    result = await db.execute(
        select(Ledger)
        .where(Ledger.id == ledger_id, Ledger.user_id == user.id)
    )
    ledger = result.scalar_one_or_none()
    if not ledger:
        raise HTTPException(status_code=404, detail="账本不存在")

    await db.delete(ledger)
    await db.commit()
    logger.info(f"用户 {user.username} 删除账本: {ledger.name}")
    return {"ok": True}
