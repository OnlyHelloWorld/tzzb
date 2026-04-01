"""
holdings.py — 持仓路由
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.models import User, Holding, Trade
from app.core.schemas import (
    HoldingCreate, HoldingResponse, HoldingBulkUpdate,
    TradeCreate, TradeResponse,
)
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/holdings", tags=["持仓"])


@router.get("", response_model=List[HoldingResponse])
async def get_holdings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户所有持仓"""
    result = await db.execute(
        select(Holding)
        .options(selectinload(Holding.trades))
        .where(Holding.user_id == user.id)
        .order_by(Holding.market, Holding.code)
    )
    return result.scalars().all()


@router.post("", response_model=HoldingResponse)
async def create_holding(
    req: HoldingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """添加单个持仓"""
    holding = Holding(
        user_id=user.id,
        market=req.market,
        code=req.code,
        name=req.name,
        sector=req.sector,
    )
    db.add(holding)
    await db.flush()

    for t in req.trades:
        trade = Trade(
            user_id=user.id,
            market=holding.market,
            code=holding.code,
            date=t.date, qty=t.qty, price=t.price, note=t.note
        )
        db.add(trade)

    await db.commit()
    await db.refresh(holding, ["trades"])
    logger.info(f"用户 {user.username} 添加持仓: {req.code}")
    return holding


@router.put("/bulk")
async def bulk_save_holdings(
    req: HoldingBulkUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量保存持仓（全量覆盖，与前端逻辑一致）"""
    # 删除旧数据
    result = await db.execute(select(Holding).where(Holding.user_id == user.id))
    old_holdings = result.scalars().all()
    for h in old_holdings:
        # 删除关联的 trades
        t_result = await db.execute(
            select(Trade)
            .where(Trade.user_id == user.id, Trade.market == h.market, Trade.code == h.code)
        )
        for t in t_result.scalars().all():
            await db.delete(t)
        await db.delete(h)

    # 写入新数据
    for h in req.holdings:
        # 检查持仓是否已存在
        existing = await db.execute(
            select(Holding)
            .where(Holding.user_id == user.id, Holding.market == h.market, Holding.code == h.code)
        )
        holding = existing.scalar_one_or_none()
        
        if not holding:
            # 创建新持仓
            holding = Holding(
                user_id=user.id,
                market=h.market,
                code=h.code,
                name=h.name,
                sector=h.sector,
            )
            db.add(holding)
            await db.flush()
        else:
            # 更新现有持仓
            holding.name = h.name
            holding.sector = h.sector
            # 删除旧的交易记录
            old_trades = await db.execute(
                select(Trade)
                .where(Trade.user_id == user.id, Trade.market == h.market, Trade.code == h.code)
            )
            for t in old_trades.scalars().all():
                await db.delete(t)
            await db.flush()

        for t in h.trades:
            trade = Trade(
                user_id=user.id,
                market=h.market,
                code=h.code,
                date=t.date,
                qty=t.qty,
                price=t.price,
                note=t.note
            )
            db.add(trade)

    await db.commit()
    # 重新查询保存后的持仓
    result = await db.execute(
        select(Holding)
        .options(selectinload(Holding.trades))
        .where(Holding.user_id == user.id)
        .order_by(Holding.market, Holding.code)
    )
    saved_holdings = result.scalars().all()
    logger.info(f"用户 {user.username} 批量保存 {len(saved_holdings)} 个持仓")
    return {"ok": True, "count": len(saved_holdings), "holdings": saved_holdings}


@router.delete("/{market}/{code}")
async def delete_holding(
    market: str,
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除持仓"""
    result = await db.execute(
        select(Holding)
        .where(Holding.user_id == user.id, Holding.market == market, Holding.code == code)
    )
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="持仓不存在")

    # 删除关联 trades
    t_result = await db.execute(
        select(Trade)
        .where(Trade.user_id == user.id, Trade.market == market, Trade.code == code)
    )
    for t in t_result.scalars().all():
        await db.delete(t)
    await db.delete(holding)

    await db.commit()
    logger.info(f"用户 {user.username} 删除持仓 {market}/{code}")
    return {"ok": True}
