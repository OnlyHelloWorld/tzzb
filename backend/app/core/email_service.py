"""
email_service.py — QQ 邮箱 SMTP 发送服务
"""
import logging
import smtplib
import random
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)

# 内存存储验证码（生产环境建议用 Redis）
_code_store: dict = {}  # { email: { code: str, expire: float, type: str } }
CODE_EXPIRE_SECONDS = 300  # 5 分钟
CODE_COOLDOWN_SECONDS = 60  # 60 秒冷却


def _generate_code() -> str:
    return str(random.randint(100000, 999999))


def _send_email(to_email: str, subject: str, html_body: str):
    """发送邮件"""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

    logger.info(f"邮件已发送: {to_email} - {subject}")


def send_verify_code(email: str, code_type: str = "register") -> str:
    """
    发送验证码
    code_type: register | reset
    返回验证码
    """
    now = time.time()

    # 冷却检查
    if email in _code_store:
        last = _code_store[email]
        elapsed = now - last.get("sent_at", 0)
        if elapsed < CODE_COOLDOWN_SECONDS:
            remaining = int(CODE_COOLDOWN_SECONDS - elapsed)
            raise ValueError(f"请 {remaining} 秒后再试")

    code = _generate_code()

    if code_type == "register":
        subject = "【投资账本】注册验证码"
        body = f"""
        <div style="max-width:400px;margin:0 auto;padding:30px;font-family:sans-serif;">
          <h2 style="color:#1a1814;">投资账本</h2>
          <p>您正在注册账号，验证码为：</p>
          <div style="font-size:32px;font-weight:bold;color:#1a7a4a;letter-spacing:4px;padding:16px 0;">{code}</div>
          <p style="color:#999;font-size:13px;">验证码 5 分钟内有效，请勿泄露给他人。</p>
        </div>
        """
    else:
        subject = "【投资账本】重置密码验证码"
        body = f"""
        <div style="max-width:400px;margin:0 auto;padding:30px;font-family:sans-serif;">
          <h2 style="color:#1a1814;">投资账本</h2>
          <p>您正在重置密码，验证码为：</p>
          <div style="font-size:32px;font-weight:bold;color:#c0392b;letter-spacing:4px;padding:16px 0;">{code}</div>
          <p style="color:#999;font-size:13px;">验证码 5 分钟内有效，请勿泄露给他人。</p>
        </div>
        """

    _send_email(email, subject, body)

    _code_store[email] = {
        "code": code,
        "type": code_type,
        "expire": now + CODE_EXPIRE_SECONDS,
        "sent_at": now,
    }

    return code


def verify_code(email: str, code: str, code_type: str = "register") -> bool:
    """验证验证码"""
    now = time.time()
    record = _code_store.get(email)

    if not record:
        return False
    if record["type"] != code_type:
        return False
    if now > record["expire"]:
        del _code_store[email]
        return False
    if record["code"] != code:
        return False

    # 验证成功后删除
    del _code_store[email]
    return True
