"""
Transactional email via SMTP.

Works with any SMTP provider. Default/recommended: Gmail SMTP
(smtp.gmail.com) with an App Password — no domain ownership required,
~500 emails/day free. Brevo, SendGrid SMTP, and Mailgun SMTP also work
unchanged if you later own a domain and want higher volume.

If SMTP_HOST/SMTP_USER/SMTP_PASSWORD are not set, emails are logged
instead of sent so local development never breaks.
"""
import os
import ssl
import smtplib
import logging
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("kip.email")

SMTP_HOST     = os.getenv("SMTP_HOST", "")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME     = os.getenv("FROM_NAME", "KIP — Kwacha Intelligence Platform")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:3000")

LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "kip_logo.png"
LOGO_CID  = "kip_logo"


def _send_email(to_email: str, subject: str, text_body: str, html_body: str, embed_logo: bool = False) -> bool:
    """Send an email via SMTP. Never raises — logs and returns False on failure."""
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        logger.warning(
            "SMTP not configured — email not sent.\nTo: %s\nSubject: %s\n%s",
            to_email, subject, text_body,
        )
        return False

    message = MIMEMultipart("related")
    message["Subject"] = subject
    message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    message["To"] = to_email

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text_body, "plain"))
    alt.attach(MIMEText(html_body, "html"))
    message.attach(alt)

    if embed_logo and LOGO_PATH.exists():
        with open(LOGO_PATH, "rb") as f:
            logo = MIMEImage(f.read())
        logo.add_header("Content-ID", f"<{LOGO_CID}>")
        logo.add_header("Content-Disposition", "inline", filename=LOGO_PATH.name)
        message.attach(logo)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, message.as_string())
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False


def send_verification_email(to_email: str, full_name: str, token: str) -> bool:
    verify_link = f"{FRONTEND_URL}/verify-email?token={token}"
    first_name = (full_name or "there").split(" ")[0]

    text_body = (
        f"Hi {first_name},\n\n"
        f"Welcome to KIP! Please verify your email address by visiting:\n{verify_link}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"If you didn't create a KIP account, you can ignore this email."
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align:center; margin-bottom: 20px;">
        <img src="cid:{LOGO_CID}" alt="KIP" width="56" height="56" style="border-radius:14px;display:inline-block;">
      </div>
      <h2 style="color:#0f766e;">Welcome to KIP, {first_name}!</h2>
      <p>Please confirm your email address to activate your account.</p>
      <p style="margin: 24px 0;">
        <a href="{verify_link}"
           style="background:#0f766e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Verify Email Address
        </a>
      </p>
      <p style="font-size:13px;color:#555;">Or copy this link into your browser:<br>
        <a href="{verify_link}">{verify_link}</a>
      </p>
      <p style="color:#888;font-size:12px;">
        This link expires in 24 hours. If you didn't create a KIP account, you can ignore this email.
      </p>
    </div>
    """

    return _send_email(to_email, "Verify your KIP account", text_body, html_body, embed_logo=True)
