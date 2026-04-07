"""
email_service.py — QQ 邮箱 SMTP 发送服务
"""
import logging
import smtplib
import ssl
import random
import time
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)

_code_store: dict = {}
CODE_EXPIRE_SECONDS = 300
CODE_COOLDOWN_SECONDS = 60


def _generate_code() -> str:
    return str(random.randint(100000, 999999))


def _send_email(to_email: str, subject: str, html_body: str):
    """发送邮件"""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise ValueError("邮件服务未配置，请设置 SMTP_USER/SMTP_PASSWORD（或 QQ_EMAIL/QQ_AUTH_CODE）")

    logger.info(f"SMTP配置: host={settings.SMTP_HOST}, port={settings.SMTP_PORT}, user={settings.SMTP_USER}")
    logger.info(f"授权码长度: {len(settings.SMTP_PASSWORD)} 字符")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    last_error = None
    
    def try_send_ssl():
        nonlocal last_error
        try:
            logger.info("尝试 SMTP_SSL 方式 (端口465)...")
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, 465, timeout=30, context=context)
            server.set_debuglevel(1)
            server.ehlo()
            logger.info("SSL连接成功，尝试登录...")
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            logger.info("登录成功，发送邮件...")
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            server.quit()
            logger.info(f"邮件发送成功(SSL): {to_email}")
            return True
        except Exception as e:
            last_error = e
            logger.warning(f"SSL方式失败: {type(e).__name__}: {str(e)}")
            return False
    
    def try_send_starttls():
        nonlocal last_error
        try:
            logger.info("尝试 STARTTLS 方式 (端口587)...")
            server = smtplib.SMTP(settings.SMTP_HOST, 587, timeout=30)
            server.set_debuglevel(1)
            server.ehlo()
            server.starttls()
            server.ehlo()
            logger.info("STARTTLS连接成功，尝试登录...")
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            logger.info("登录成功，发送邮件...")
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            server.quit()
            logger.info(f"邮件发送成功(STARTTLS): {to_email}")
            return True
        except Exception as e:
            last_error = e
            logger.warning(f"STARTTLS方式失败: {type(e).__name__}: {str(e)}")
            return False
    
    def try_send_plain():
        nonlocal last_error
        try:
            logger.info("尝试普通SMTP方式 (端口25)...")
            server = smtplib.SMTP(settings.SMTP_HOST, 25, timeout=30)
            server.set_debuglevel(1)
            server.ehlo()
            logger.info("普通连接成功，尝试登录...")
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            logger.info("登录成功，发送邮件...")
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            server.quit()
            logger.info(f"邮件发送成功(Plain): {to_email}")
            return True
        except Exception as e:
            last_error = e
            logger.warning(f"普通方式失败: {type(e).__name__}: {str(e)}")
            return False

    if try_send_ssl():
        return
    time.sleep(1)
    
    if try_send_starttls():
        return
    time.sleep(1)
    
    if try_send_plain():
        return

    logger.error(f"所有SMTP方式都失败了: {to_email}")
    logger.error(f"最终错误: {type(last_error).__name__}: {str(last_error)}")
    logger.error("请检查QQ邮箱授权码是否正确，授权码需要在QQ邮箱设置中重新生成")
    raise ValueError("验证码发送失败，请检查邮箱授权码配置")


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
