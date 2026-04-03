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
    ledger_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取指定账本的所有持仓"""
    logger.info(f"用户 {user.username} 获取账本 {ledger_id} 的持仓数据")
    try:
        result = await db.execute(
            select(Holding)
            .options(selectinload(Holding.trades))
            .where(Holding.user_id == user.id, Holding.ledger_id == ledger_id)
            .order_by(Holding.market, Holding.code)
        )
        holdings = result.scalars().all()
        logger.info(f"用户 {user.username} 获取到 {len(holdings)} 条持仓记录")
        return holdings
    except Exception as e:
        logger.error(f"用户 {user.username} 获取持仓失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="获取持仓数据失败")


@router.post("", response_model=HoldingResponse)
async def create_holding(
    req: HoldingCreate,
    ledger_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """添加单个持仓"""
    logger.info(f"用户 {user.username} 开始添加持仓: {req.code}, 账本ID: {ledger_id}")
    try:
        holding = Holding(
            user_id=user.id,
            ledger_id=ledger_id,
            market=req.market,
            code=req.code,
            name=req.name,
            sector=req.sector,
        )
        db.add(holding)
        await db.flush()
        logger.debug(f"用户 {user.username} 创建持仓记录: {req.code}")

        for t in req.trades:
            trade = Trade(
                user_id=user.id,
                ledger_id=ledger_id,
                market=holding.market,
                code=holding.code,
                date=t.date, qty=t.qty, price=t.price, note=t.note
            )
            db.add(trade)
        logger.debug(f"用户 {user.username} 添加 {len(req.trades)} 条交易记录")

        await db.commit()
        await db.refresh(holding, ["trades"])
        logger.info(f"用户 {user.username} 添加持仓成功: {req.code}")
        return holding
    except Exception as e:
        logger.error(f"用户 {user.username} 添加持仓失败: {req.code}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="添加持仓失败")


@router.put("/bulk")
async def bulk_save_holdings(
    req: HoldingBulkUpdate,
    ledger_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量保存持仓（全量覆盖，与前端逻辑一致）"""
    logger.info(f"用户 {user.username} 开始批量保存持仓: 账本ID={ledger_id}, 数量={len(req.holdings)}")
    try:
        # 删除旧数据
        result = await db.execute(
            select(Holding)
            .where(Holding.user_id == user.id, Holding.ledger_id == ledger_id)
        )
        old_holdings = result.scalars().all()
        logger.debug(f"用户 {user.username} 删除 {len(old_holdings)} 条旧持仓记录")
        
        # 先删除关联的trades
        for h in old_holdings:
            t_result = await db.execute(
                select(Trade)
                .where(
                    Trade.user_id == user.id,
                    Trade.ledger_id == ledger_id,
                    Trade.market == h.market,
                    Trade.code == h.code
                )
            )
            for t in t_result.scalars().all():
                await db.delete(t)
            await db.delete(h)

        # 写入新数据
        for h in req.holdings:
            holding = Holding(
                user_id=user.id,
                ledger_id=ledger_id,
                market=h.market,
                code=h.code,
                name=h.name,
                sector=h.sector,
            )
            db.add(holding)
            await db.flush()
            logger.debug(f"用户 {user.username} 创建新持仓: {h.code}")

            for t in h.trades:
                trade = Trade(
                    user_id=user.id,
                    ledger_id=ledger_id,
                    market=h.market,
                    code=h.code,
                    date=t.date,
                    qty=t.qty,
                    price=t.price,
                    note=t.note
                )
                db.add(trade)
            logger.debug(f"用户 {user.username} 添加 {len(h.trades)} 条交易记录到 {h.code}")

        await db.commit()
        logger.debug(f"用户 {user.username} 提交数据库事务")
        
        # 重新查询保存后的持仓
        result = await db.execute(
            select(Holding)
            .options(selectinload(Holding.trades))
            .where(Holding.user_id == user.id, Holding.ledger_id == ledger_id)
            .order_by(Holding.market, Holding.code)
        )
        saved_holdings = result.scalars().all()
        logger.info(f"用户 {user.username} 批量保存成功: {len(saved_holdings)} 个持仓")
        return {"ok": True, "count": len(saved_holdings), "holdings": saved_holdings}
    except Exception as e:
        logger.error(f"用户 {user.username} 批量保存持仓失败: {str(e)}", exc_info=True)
        await db.rollback()
        logger.debug(f"用户 {user.username} 回滚数据库事务")
        raise HTTPException(status_code=500, detail="批量保存持仓失败")


@router.delete("/{ledger_id}/{market}/{code}")
async def delete_holding(
    ledger_id: int,
    market: str,
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除持仓"""
    logger.info(f"用户 {user.username} 开始删除持仓: {market}/{code}, 账本ID: {ledger_id}")
    try:
        result = await db.execute(
            select(Holding)
            .where(
                Holding.user_id == user.id, 
                Holding.ledger_id == ledger_id,
                Holding.market == market, 
                Holding.code == code
            )
        )
        holding = result.scalar_one_or_none()
        if not holding:
            logger.warning(f"用户 {user.username} 删除持仓失败: 持仓不存在 {market}/{code}")
            raise HTTPException(status_code=404, detail="持仓不存在")

        # 删除关联 trades
        t_result = await db.execute(
            select(Trade)
            .where(
                Trade.user_id == user.id, 
                Trade.ledger_id == ledger_id,
                Trade.market == market, 
                Trade.code == code
            )
        )
        trades = t_result.scalars().all()
        logger.debug(f"用户 {user.username} 删除 {len(trades)} 条关联交易记录")
        for t in trades:
            await db.delete(t)
        await db.delete(holding)

        await db.commit()
        logger.info(f"用户 {user.username} 删除持仓成功: {market}/{code}")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户 {user.username} 删除持仓失败: {market}/{code}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="删除持仓失败")
