import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr
from . import config


def send_mail(to_email: str, subject: str, html: str, service: str = "naver"):
    """
    Sends an email using the specified service (naver or google).
    """
    if service == "naver":
        smtp_host = config.NAVER_SMTP_HOST
        smtp_port = config.NAVER_SMTP_PORT
        smtp_user = config.NAVER_SMTP_USER
        smtp_pass = config.NAVER_SMTP_PASS
        from_email = config.NAVER_SMTP_USER
        display_from = formataddr(("TRADESITE", from_email))
    elif service == "google":
        smtp_host = config.GOOGLE_SMTP_HOST
        smtp_port = config.GOOGLE_SMTP_PORT
        smtp_user = config.GOOGLE_SMTP_USER
        smtp_pass = config.GOOGLE_SMTP_PASS
        from_email = config.GOOGLE_SMTP_USER
        display_from = formataddr(("TRADESITE", from_email))
    else:
        # Invalid service, raise an error or handle it gracefully.
        raise ValueError(f"Invalid email service: {service}. Must be 'naver' or 'google'.")

    msg = MIMEText(html, "html", "utf-8")
    msg["From"] = display_from
    msg["To"] = to_email
    msg["Subject"] = subject

    with smtplib.SMTP(smtp_host, smtp_port) as s:
        s.starttls()
        # Authentication is now required for both services.
        s.login(smtp_user, smtp_pass)
        s.sendmail(from_email, [to_email], msg.as_string())


def otp_html(code: str) -> str:
    return f"""
    <div style='font-family:Inter,system-ui,Segoe UI,Arial'>
      <h2>회원가입 인증번호</h2>
      <p>아래 6자리 코드를 3분 이내에 입력해 주세요.</p>
      <div style='font-weight:700;font-size:28px;letter-spacing:6px'>{code}</div>
    </div>
    """


def verification_html(link: str) -> str:
    return f"""
    <div style='font-family:Inter,system-ui,Segoe UI,Arial'>
      <h2>이메일 인증을 완료해 주세요</h2>
      <p>아래 버튼을 눌러 이메일 인증을 완료하면 로그인이 가능해집니다.</p>
      <p><a href='{link}' style='display:inline-block;padding:10px 16px;background:#111;color:#fff;
      border-radius:8px;text-decoration:none'>이메일 인증하기</a></p>
      <p style='color:#666;font-size:13px'>버튼이 열리지 않으면 링크를 복사해 브라우저에 붙여넣기:<br>{link}</p>
    </div>
    """