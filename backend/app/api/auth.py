"""
auth.py — 认证路由（登录、注册、验证码、重置密码）
"""
import re
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.models import User
from app.core.schemas import (
    LoginRequest, LoginResponse,
    SendCodeRequest, RegisterRequest, ResetPasswordRequest,
)
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token
from app.core.email_service import send_verify_code, verify_code

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["认证"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """获取当前登录用户（依赖注入）"""
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已过期，请重新登录")
    user_id = int(payload.get("sub", 0))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    return user


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        logger.warning(f"登录失败: username={req.username}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")

    token = create_access_token(user.id, user.username)
    logger.info(f"用户登录成功: {req.username}")
    return LoginResponse(access_token=token, username=user.username)


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return {"id": user.id, "username": user.username, "email": user.email}


# ─── 注册 & 验证码 ────────────────────────────────────────────

@router.post("/send-code")
async def send_code(req: SendCodeRequest, db: AsyncSession = Depends(get_db)):
    """发送验证码"""
    email = req.email.strip().lower()
    code_type = req.type

    # 邮箱格式校验
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    # 注册时检查邮箱是否已注册
    if code_type == "register":
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="该邮箱已注册")

    try:
        send_verify_code(email, code_type)
        return {"ok": True, "message": "验证码已发送"}
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error(f"发送验证码失败: {email}, {e}")
        raise HTTPException(status_code=500, detail="验证码发送失败，请稍后重试")


@router.post("/register", response_model=LoginResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """用户注册"""
    email = req.email.strip().lower()
    username = req.username.strip()

    # 校验
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")
    if len(username) < 2 or len(username) > 50:
        raise HTTPException(status_code=400, detail="用户名长度 2-50 个字符")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少 6 个字符")

    # 验证验证码
    if not verify_code(email, req.code, "register"):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")

    # 检查重复
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该邮箱已注册")
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已被占用")

    # 创建用户
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.flush()

    token = create_access_token(user.id, user.username)
    logger.info(f"用户注册成功: {username} ({email})")
    return LoginResponse(access_token=token, username=user.username)


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """重置密码"""
    email = req.email.strip().lower()

    # 验证验证码
    if not verify_code(email, req.code, "reset"):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少 6 个字符")

    # 查找用户
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="该邮箱未注册")

    # 更新密码
    user.password_hash = hash_password(req.new_password)
    await db.flush()

    logger.info(f"用户重置密码: {user.username} ({email})")
    return {"ok": True, "message": "密码重置成功，请重新登录"}
