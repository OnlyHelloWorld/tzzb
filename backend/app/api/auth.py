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
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload:
            logger.warning("用户认证失败: token无效")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已过期，请重新登录")
        user_id = int(payload.get("sub", 0))
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning(f"用户认证失败: 用户不存在 ID={user_id}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
        logger.debug(f"用户认证成功: {user.username}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户认证异常: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="认证失败")


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    logger.info(f"用户尝试登录: username={req.username}")
    try:
        result = await db.execute(select(User).where(User.username == req.username))
        user = result.scalar_one_or_none()
        if not user or not verify_password(req.password, user.password_hash):
            logger.warning(f"登录失败: username={req.username} - 账号或密码错误")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")

        token = create_access_token(user.id, user.username)
        logger.info(f"用户登录成功: {req.username}")
        return LoginResponse(access_token=token, username=user.username)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户登录异常: username={req.username}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="登录失败")


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    logger.debug(f"用户获取个人信息: {user.username}")
    try:
        return {"id": user.id, "username": user.username, "email": user.email}
    except Exception as e:
        logger.error(f"用户获取个人信息失败: {user.username}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="获取用户信息失败")


# ─── 注册 & 验证码 ────────────────────────────────────────────

@router.post("/send-code")
async def send_code(req: SendCodeRequest, db: AsyncSession = Depends(get_db)):
    """发送验证码"""
    email = req.email.strip().lower()
    code_type = req.type
    logger.info(f"用户请求发送验证码: email={email}, type={code_type}")

    try:
        # 邮箱格式校验
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
            logger.warning(f"发送验证码失败: 邮箱格式不正确 {email}")
            raise HTTPException(status_code=400, detail="邮箱格式不正确")

        # 注册时检查邮箱是否已注册
        if code_type == "register":
            result = await db.execute(select(User).where(User.email == email))
            if result.scalar_one_or_none():
                logger.warning(f"发送验证码失败: 邮箱已注册 {email}")
                raise HTTPException(status_code=400, detail="该邮箱已注册")

        send_verify_code(email, code_type)
        logger.info(f"验证码发送成功: email={email}, type={code_type}")
        return {"ok": True, "message": "验证码已发送"}
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"发送验证码失败: email={email}, 错误: {str(e)}")
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error(f"发送验证码异常: email={email}, 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="验证码发送失败，请稍后重试")


@router.post("/register", response_model=LoginResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """用户注册"""
    email = req.email.strip().lower()
    username = req.username.strip()
    logger.info(f"用户尝试注册: username={username}, email={email}")

    try:
        # 校验
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
            logger.warning(f"用户注册失败: 邮箱格式不正确 {email}")
            raise HTTPException(status_code=400, detail="邮箱格式不正确")
        if len(username) < 2 or len(username) > 50:
            logger.warning(f"用户注册失败: 用户名长度不正确 {username}")
            raise HTTPException(status_code=400, detail="用户名长度 2-50 个字符")
        if len(req.password) < 6:
            logger.warning(f"用户注册失败: 密码长度不足 {username}")
            raise HTTPException(status_code=400, detail="密码至少 6 个字符")

        # 验证验证码
        if not verify_code(email, req.code, "register"):
            logger.warning(f"用户注册失败: 验证码错误 {email}")
            raise HTTPException(status_code=400, detail="验证码错误或已过期")

        # 检查重复
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            logger.warning(f"用户注册失败: 邮箱已注册 {email}")
            raise HTTPException(status_code=400, detail="该邮箱已注册")
        result = await db.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none():
            logger.warning(f"用户注册失败: 用户名已被占用 {username}")
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户注册异常: username={username}, email={email}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="注册失败")


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """重置密码"""
    email = req.email.strip().lower()
    logger.info(f"用户尝试重置密码: email={email}")

    try:
        # 验证验证码
        if not verify_code(email, req.code, "reset"):
            logger.warning(f"重置密码失败: 验证码错误 {email}")
            raise HTTPException(status_code=400, detail="验证码错误或已过期")

        if len(req.new_password) < 6:
            logger.warning(f"重置密码失败: 密码长度不足 {email}")
            raise HTTPException(status_code=400, detail="新密码至少 6 个字符")

        # 查找用户
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning(f"重置密码失败: 邮箱未注册 {email}")
            raise HTTPException(status_code=404, detail="该邮箱未注册")

        # 更新密码
        user.password_hash = hash_password(req.new_password)
        await db.flush()

        logger.info(f"用户重置密码成功: {user.username} ({email})")
        return {"ok": True, "message": "密码重置成功，请重新登录"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重置密码异常: email={email}, 错误: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="重置密码失败")
