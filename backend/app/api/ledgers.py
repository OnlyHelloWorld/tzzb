"""
ledgers.py — 账本路由
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.models import User, Ledger, Holding, Trade
from app.core.schemas import LedgerCreate, LedgerResponse, LedgerUpdate, LedgerSortOrderUpdate
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ledgers", tags=["账本"])


@router.get("", response_model=List[LedgerResponse])
async def get_ledgers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户所有账本"""
    logger.info(f"用户 {user.username} 获取账本列表")
    try:
        result = await db.execute(
            select(Ledger)
            .where(Ledger.user_id == user.id)
            .order_by(Ledger.sort_order, Ledger.created_at)
        )
        ledgers = result.scalars().all()
        logger.info(f"用户 {user.username} 获取到 {len(ledgers)} 个账本")
        return ledgers
    except Exception as e:
        logger.error(f"用户 {user.username} 获取账本列表失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail={"message": "获取账本列表失败", "error": str(e)})


@router.post("", response_model=LedgerResponse)
async def create_ledger(
    req: LedgerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新账本"""
    logger.info(f"用户 {user.username} 开始创建账本: {req.name}")
    try:
        result = await db.execute(
            select(Ledger)
            .where(Ledger.user_id == user.id, Ledger.name == req.name)
        )
        existing_ledger = result.scalar_one_or_none()
        if existing_ledger:
            logger.warning(f"用户 {user.username} 创建账本失败: 名称已存在 {req.name}")
            raise HTTPException(status_code=400, detail="账本名称已存在")
        
        ledger = Ledger(
            user_id=user.id,
            name=req.name,
            color=req.color,
        )
        db.add(ledger)
        await db.commit()
        await db.refresh(ledger)
        logger.info(f"用户 {user.username} 创建账本成功: {req.name}, ID: {ledger.id}")
        return ledger
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户 {user.username} 创建账本失败: {req.name}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail={"message": "创建账本失败", "error": str(e)})


@router.put("/sort-order")
async def update_ledger_sort_order(
    req: LedgerSortOrderUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量更新账本排序"""
    logger.info(f"用户 {user.username} 开始更新账本排序")
    try:
        result = await db.execute(
            select(Ledger).where(Ledger.user_id == user.id)
        )
        ledgers = {ledger.id: ledger for ledger in result.scalars().all()}
        
        for item in req.ledgers:
            if item.id in ledgers:
                ledgers[item.id].sort_order = item.sort_order
        
        await db.commit()
        logger.info(f"用户 {user.username} 更新账本排序成功")
        return {"ok": True}
    except Exception as e:
        logger.error(f"用户 {user.username} 更新账本排序失败: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail={"message": "更新账本排序失败", "error": str(e)})


@router.put("/{ledger_id}", response_model=LedgerResponse)
async def update_ledger(
    ledger_id: int,
    req: LedgerUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新账本信息"""
    logger.info(f"用户 {user.username} 开始更新账本: ID={ledger_id}")
    try:
        result = await db.execute(
            select(Ledger)
            .where(Ledger.id == ledger_id, Ledger.user_id == user.id)
        )
        ledger = result.scalar_one_or_none()
        if not ledger:
            logger.warning(f"用户 {user.username} 更新账本失败: 账本不存在 ID={ledger_id}")
            raise HTTPException(status_code=404, detail="账本不存在")

        old_name = ledger.name
        if req.name is not None and req.name != ledger.name:
            name_check = await db.execute(
                select(Ledger)
                .where(Ledger.user_id == user.id, Ledger.name == req.name)
            )
            if name_check.scalar_one_or_none():
                logger.warning(f"用户 {user.username} 更新账本失败: 名称已存在 {req.name}")
                raise HTTPException(status_code=400, detail="账本名称已存在")
            ledger.name = req.name
        
        if req.color is not None:
            ledger.color = req.color

        await db.commit()
        await db.refresh(ledger)
        logger.info(f"用户 {user.username} 更新账本成功: {old_name} -> {ledger.name}")
        return ledger
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户 {user.username} 更新账本失败: ID={ledger_id}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail={"message": "更新账本失败", "error": str(e)})


@router.delete("/{ledger_id}")
async def delete_ledger(
    ledger_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除账本（同时删除该账本中的所有数据）"""
    logger.info(f"用户 {user.username} 开始删除账本: ID={ledger_id}")
    try:
        result = await db.execute(
            select(Ledger)
            .where(Ledger.id == ledger_id, Ledger.user_id == user.id)
        )
        ledger = result.scalar_one_or_none()
        if not ledger:
            logger.warning(f"用户 {user.username} 删除账本失败: 账本不存在 ID={ledger_id}")
            raise HTTPException(status_code=404, detail="账本不存在")

        ledger_name = ledger.name

        t_result = await db.execute(
            select(Trade)
            .where(Trade.user_id == user.id, Trade.ledger_id == ledger_id)
        )
        trades = t_result.scalars().all()
        for trade in trades:
            await db.delete(trade)
        logger.debug(f"删除 {len(trades)} 条交易记录")

        h_result = await db.execute(
            select(Holding)
            .where(
                Holding.user_id == user.id,
                Holding.ledger_id == ledger_id
            )
        )
        holdings = h_result.scalars().all()
        for holding in holdings:
            await db.delete(holding)
        logger.debug(f"删除 {len(holdings)} 个持仓")

        await db.delete(ledger)
        await db.commit()
        logger.info(f"用户 {user.username} 删除账本成功: {ledger_name}")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户 {user.username} 删除账本失败: ID={ledger_id}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail={"message": "删除账本失败", "error": str(e)})
