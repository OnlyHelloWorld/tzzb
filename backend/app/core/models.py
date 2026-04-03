"""
models.py — SQLAlchemy ORM 模型
"""
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, PrimaryKeyConstraint, ForeignKeyConstraint
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

    # 关系 - 不使用级联删除
    ledgers = relationship("Ledger", back_populates="user")
    holdings = relationship("Holding", back_populates="user")
    settings = relationship("UserSetting", back_populates="user", uselist=False)


class Ledger(Base):
    __tablename__ = "ledgers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False, default="默认账本")
    color = Column(String(20), nullable=False, default="#1a1814")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系 - 不使用级联删除
    user = relationship("User", back_populates="ledgers")
    holdings = relationship("Holding", back_populates="ledger")


class Holding(Base):
    __tablename__ = "holdings"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ledger_id = Column(Integer, ForeignKey("ledgers.id"), nullable=False)
    market = Column(String(10), nullable=False)
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    sector = Column(String(50), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 联合主键: user_id + ledger_id + market + code
    __table_args__ = (
        PrimaryKeyConstraint('user_id', 'ledger_id', 'market', 'code', name='holdings_pkey'),
    )

    # 关系 - 不使用级联删除
    user = relationship("User", back_populates="holdings")
    ledger = relationship("Ledger", back_populates="holdings")
    trades = relationship("Trade", back_populates="holding", order_by="Trade.date")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    ledger_id = Column(Integer, nullable=False)
    market = Column(String(10), nullable=False)
    code = Column(String(20), nullable=False)
    date = Column(String(10), nullable=False)
    qty = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    note = Column(Text, default="")

    # 外键关联到 Holding 的联合主键 - 不使用级联删除
    __table_args__ = (
        ForeignKeyConstraint(['user_id', 'market', 'code'], 
                          ['holdings.user_id', 'holdings.market', 'holdings.code']),
    )

    # 关系
    holding = relationship("Holding", back_populates="trades")


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    fx_usd = Column(Float, default=7.28)
    fx_hkd = Column(Float, default=0.925)
    auto_refresh = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 关系 - 不使用级联删除
    user = relationship("User", back_populates="settings")
