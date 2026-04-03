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
    ledger_id: int = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户所有持仓，可按账本筛选"""
    logger.info(f"用户 {user.username} 获取持仓数据, ledger_id={ledger_id}")
    try:
        query = select(Holding).options(selectinload(Holding.trades)).where(Holding.user_id == user.id)
        if ledger_id:
            query = query.where(Holding.ledger_id == ledger_id)
        query = query.order_by(Holding.market, Holding.code)
        result = await db.execute(query)
        holdings = result.scalars().all()
        logger.info(f"用户 {user.username} 获取到 {len(holdings)} 条持仓记录")
        return holdings
    except Exception as e:
        logger.error(f"用户 {user.username} 获取持仓失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="获取持仓数据失败")


@router.post("", response_model=HoldingResponse)
async def create_holding(
    req: HoldingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """添加单个持仓"""
    logger.info(f"用户 {user.username} 开始添加持仓: {req.code}, ledger_id={req.ledger_id}")
    try:
        # 检查持仓是否已存在（同一账本下）
        existing = await db.execute(
            select(Holding)
            .where(
                Holding.user_id == user.id,
                Holding.ledger_id == req.ledger_id,
                Holding.market == req.market,
                Holding.code == req.code
            )
        )
        if existing.scalar_one_or_none():
            logger.warning(f"用户 {user.username} 添加持仓失败: 持仓已存在 {req.market}/{req.code}")
            raise HTTPException(status_code=400, detail="该持仓已存在")

        holding = Holding(
            user_id=user.id,
            ledger_id=req.ledger_id,
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
                ledger_id=req.ledger_id,
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户 {user.username} 添加持仓失败: {req.code}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="添加持仓失败")


@router.put("/bulk")
async def bulk_save_holdings(
    req: HoldingBulkUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量保存持仓（全量覆盖）"""
    logger.info(f"用户 {user.username} 开始批量保存持仓: 数量={len(req.holdings)}, ledger_id={req.ledger_id}")
    try:
        # 1. 查询该账本的旧持仓
        result = await db.execute(
            select(Holding).where(
                Holding.user_id == user.id,
                Holding.ledger_id == req.ledger_id
            )
        )
        old_holdings = result.scalars().all()
        logger.debug(f"用户 {user.username} 找到 {len(old_holdings)} 条旧持仓记录")

        # 2. 逐个删除旧持仓的trades
        for h in old_holdings:
            t_result = await db.execute(
                select(Trade).where(
                    Trade.user_id == user.id,
                    Trade.ledger_id == req.ledger_id,
                    Trade.market == h.market,
                    Trade.code == h.code
                )
            )
            old_trades = t_result.scalars().all()
            for t in old_trades:
                await db.delete(t)
                logger.debug(f"删除交易记录: {h.market}/{h.code} - {t.date}")

        # 3. 删除旧持仓
        for h in old_holdings:
            await db.delete(h)
            logger.debug(f"删除持仓: {h.market}/{h.code}")

        await db.flush()

        # 4. 写入新数据
        for h in req.holdings:
            holding = Holding(
                user_id=user.id,
                ledger_id=req.ledger_id,
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
                    ledger_id=req.ledger_id,
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

        # 5. 重新查询保存后的持仓
        result = await db.execute(
            select(Holding)
            .options(selectinload(Holding.trades))
            .where(
                Holding.user_id == user.id,
                Holding.ledger_id == req.ledger_id
            )
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


@router.delete("/{market}/{code}")
async def delete_holding(
    market: str,
    code: str,
    ledger_id: int = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除持仓"""
    logger.info(f"用户 {user.username} 开始删除持仓: {market}/{code}, ledger_id={ledger_id}")
    try:
        # 1. 查询持仓（可按账本筛选）
        query = select(Holding).where(
            Holding.user_id == user.id,
            Holding.market == market,
            Holding.code == code
        )
        if ledger_id:
            query = query.where(Holding.ledger_id == ledger_id)
        result = await db.execute(query)
        holding = result.scalar_one_or_none()
        if not holding:
            logger.warning(f"用户 {user.username} 删除持仓失败: 持仓不存在 {market}/{code}")
            raise HTTPException(status_code=404, detail="持仓不存在")

        # 2. 查询并删除关联的trades
        t_query = select(Trade).where(
            Trade.user_id == user.id,
            Trade.market == market,
            Trade.code == code
        )
        if ledger_id:
            t_query = t_query.where(Trade.ledger_id == ledger_id)
        t_result = await db.execute(t_query)
        trades = t_result.scalars().all()
        logger.debug(f"用户 {user.username} 找到 {len(trades)} 条关联交易记录")
        for t in trades:
            await db.delete(t)
            logger.debug(f"删除交易记录: {t.date}")

        # 3. 删除持仓
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
