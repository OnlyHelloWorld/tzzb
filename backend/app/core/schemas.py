"""
schemas.py — Pydantic 请求/响应模型
"""
from typing import List, Optional
from pydantic import BaseModel


# ─── Auth ─────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class TokenPayload(BaseModel):
    user_id: int
    username: str


class SendCodeRequest(BaseModel):
    email: str
    type: str = "register"  # register | reset


class RegisterRequest(BaseModel):
    email: str
    code: str
    username: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


# ─── Trade ────────────────────────────────────────────────────
class TradeBase(BaseModel):
    date: str
    qty: float
    price: float
    note: str = ""


class TradeCreate(TradeBase):
    pass


class TradeResponse(TradeBase):
    id: int

    class Config:
        from_attributes = True


# ─── Holding ─────────────────────────────────────────────────
class HoldingBase(BaseModel):
    market: str
    code: str
    name: str
    sector: str = ""


class HoldingCreate(HoldingBase):
    ledger_id: int
    trades: List[TradeCreate] = []


class HoldingResponse(HoldingBase):
    id: int
    user_id: int
    ledger_id: int
    trades: List[TradeResponse] = []

    class Config:
        from_attributes = True


class HoldingBulkUpdate(BaseModel):
    """批量保存持仓（前端全量覆盖）"""
    ledger_id: int
    holdings: List[HoldingCreate]


# ─── Ledger ─────────────────────────────────────────────────
class LedgerBase(BaseModel):
    name: str
    color: str = "#1a1814"


class LedgerCreate(LedgerBase):
    pass


class LedgerUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class LedgerResponse(LedgerBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ─── Settings ────────────────────────────────────────────────
class SettingsResponse(BaseModel):
    fx_usd: float = 7.28
    fx_hkd: float = 0.925
    auto_refresh: bool = True


class SettingsUpdate(BaseModel):
    fx_usd: Optional[float] = None
    fx_hkd: Optional[float] = None
    auto_refresh: Optional[bool] = None
