"""
models.py — SQLAlchemy ORM 模型
"""
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON, PrimaryKeyConstraint, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系
    holdings = relationship("Holding", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSetting", back_populates="user", cascade="all, delete-orphan", uselist=False)


class Holding(Base):
    __tablename__ = "holdings"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    market = Column(String(10), nullable=False)  # A股/港股/美股
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    sector = Column(String(50), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 联合主键: user_id + market + code
    __table_args__ = (
        PrimaryKeyConstraint('user_id', 'market', 'code', name='holdings_pkey'),
    )

    # 关系
    user = relationship("User", back_populates="holdings")
    trades = relationship("Trade", back_populates="holding", cascade="all, delete-orphan", order_by="Trade.date")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    market = Column(String(10), nullable=False)
    code = Column(String(20), nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    qty = Column(Float, nullable=False)  # 正数=买入，负数=卖出
    price = Column(Float, nullable=False)
    note = Column(Text, default="")

    # 外键关联到 Holding 的联合主键
    __table_args__ = (
        ForeignKeyConstraint(['user_id', 'market', 'code'], 
                          ['holdings.user_id', 'holdings.market', 'holdings.code'], 
                          ondelete="CASCADE"),
    )

    # 关系
    holding = relationship("Holding", back_populates="trades")


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    fx_usd = Column(Float, default=7.28)
    fx_hkd = Column(Float, default=0.925)
    auto_refresh = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系
    user = relationship("User", back_populates="settings")
