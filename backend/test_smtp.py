"""
测试189邮箱SMTP是否可用
运行: python test_smtp.py
"""
import smtplib
import ssl

SMTP_HOST = "smtp.qq.com"
SMTP_USER = "191678946@qq.com"
SMTP_PASSWORD = "ljaqystelllfcadb"

def test_smtp_ssl():
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
        print(">>> 登录成功！")
        server.quit()
        return True
    except Exception as e:
        print(f">>> 失败: {type(e).__name__}: {str(e)}")
        return False

def test_smtp_starttls():
    print("=" * 50)
    print("测试 STARTTLS (端口25)...")
    try:
        server = smtplib.SMTP(SMTP_HOST, 25, timeout=30)
        server.set_debuglevel(1)
        server.ehlo()
        server.starttls()
        server.ehlo()
        print(">>> 连接成功，尝试登录...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print(">>> 登录成功！")
        server.quit()
        return True
    except Exception as e:
        print(f">>> 失败: {type(e).__name__}: {str(e)}")
        return False

def test_smtp_plain():
    print("=" * 50)
    print("测试普通SMTP (端口25，无加密)...")
    try:
        server = smtplib.SMTP(SMTP_HOST, 25, timeout=30)
        server.set_debuglevel(1)
        server.ehlo()
        print(">>> 连接成功，尝试登录...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print(">>> 登录成功！")
        server.quit()
        return True
    except Exception as e:
        print(f">>> 失败: {type(e).__name__}: {str(e)}")
        return False

if __name__ == "__main__":
    print(f"测试邮箱: {SMTP_USER}")
    print(f"密码长度: {len(SMTP_PASSWORD)} 字符")
    print()
    
    results = []
    results.append(("SMTP_SSL", test_smtp_ssl()))
    results.append(("STARTTLS", test_smtp_starttls()))
    results.append(("Plain SMTP", test_smtp_plain()))
    
    print("\n" + "=" * 50)
    print("测试结果汇总:")
    for name, success in results:
        status = "✓ 成功" if success else "✗ 失败"
        print(f"  {name}: {status}")
    
    if any(r[1] for r in results):
        print("\n邮箱配置有效！")
    else:
        print("\n邮箱配置无效！")
        print("可能原因：")
        print("1. SMTP服务未开启 - 登录 mail.189.cn 开启SMTP服务")
        print("2. 密码错误 - 需要使用授权码而非登录密码")
        print("3. 账户限制 - 新注册账户可能有限制")
