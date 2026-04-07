"""
测试QQ邮箱SMTP授权码是否可用
运行: python test_smtp.py
"""
import smtplib
import ssl

SMTP_HOST = "smtp.qq.com"
SMTP_USER = "191678946@qq.com"
SMTP_PASSWORD = "pvsitdezezoccagf"

def test_smtp():
    print(f"测试邮箱: {SMTP_USER}")
    print(f"授权码长度: {len(SMTP_PASSWORD)} 字符")
    print()
    
    print("=" * 50)
    print("测试 SMTP_SSL (端口465)...")
    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        server = smtplib.SMTP_SSL(SMTP_HOST, 465, timeout=30, context=context)
        server.set_debuglevel(1)
        server.ehlo()
        print(">>> 连接成功，尝试登录...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print(">>> 登录成功！授权码有效！")
        server.quit()
        return True
    except Exception as e:
        print(f">>> 失败: {type(e).__name__}: {str(e)}")
        return False

if __name__ == "__main__":
    if test_smtp():
        print("\n授权码有效！")
    else:
        print("\n授权码无效或已过期！")
        print("请重新生成授权码：mail.qq.com -> 设置 -> 账户 -> POP3/SMTP服务")
