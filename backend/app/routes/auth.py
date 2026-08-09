import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas import (
    UserRegister, UserLogin, Token, UserOut,
    ForgotPasswordRequest, ResetPasswordRequest, AccountDeleteRequest,
)
from app.security import (
    hash_password, verify_password, create_access_token, get_current_user,
    get_current_token_payload, revoke_token,
)
from app.services.email_service import send_verification_email, send_password_reset_email
from app.services.account_service import delete_user_account
from app.rate_limit import limiter

router = APIRouter()

VERIFICATION_TOKEN_EXPIRE_HOURS = 24
RESET_TOKEN_EXPIRE_HOURS = 1

# Brute-force protection: lock an account out for a while after repeated
# failed logins, on top of the IP-based rate limit below (the two cover
# different attack shapes — one attacker hammering many accounts vs. one
# attacker hammering a single account from many IPs).
LOCKOUT_THRESHOLD_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


def _issue_verification_token(user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires = datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)
    return token


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def register(request: Request, payload: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Register a new KIP user account and email them a verification link."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password)
    )
    token = _issue_verification_token(user)
    db.add(user)
    db.commit()
    db.refresh(user)

    background_tasks.add_task(send_verification_email, user.email, user.full_name, token)

    access_token = create_access_token(user.id)
    return Token(access_token=access_token, token_type="bearer", user=UserOut.model_validate(user))

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    """Log in with email and password. Returns a JWT access token."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if user and user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again in a few minutes.",
        )

    if not user or not verify_password(payload.password, user.hashed_password):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= LOCKOUT_THRESHOLD_ATTEMPTS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Successful login — clear any accumulated lockout state.
    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

    token = create_access_token(user.id)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

@router.post("/logout")
def logout(
    payload: dict = Depends(get_current_token_payload),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log out the current session by revoking its access token.

    Unlike just deleting the token client-side, this makes the token
    unusable server-side immediately (see security.py's blocklist), so a
    copy of the token leaked before logout can't keep authenticating.
    """
    exp_ts = payload.get("exp")
    expires_at = datetime.utcfromtimestamp(exp_ts) if exp_ts else datetime.utcnow() + timedelta(days=1)
    revoke_token(payload.get("jti"), current_user.id, expires_at, db)
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently logged-in user's profile."""
    return current_user

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Confirm a user's email address using the token from their verification link."""
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")
    if not user.verification_token_expires or user.verification_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This verification link has expired. Please request a new one.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    return {"message": "Email verified successfully."}

@router.post("/resend-verification")
@limiter.limit("3/hour")
def resend_verification(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resend the verification email to the logged-in user."""
    if current_user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")

    token = _issue_verification_token(current_user)
    db.commit()

    background_tasks.add_task(send_verification_email, current_user.email, current_user.full_name, token)
    return {"message": "Verification email sent."}

@router.post("/forgot-password")
@limiter.limit("3/hour")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Email a single-use password-reset link if the address has an account.

    Responds identically whether or not the email exists, so this endpoint
    can't be used to probe which addresses are registered.
    """
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        user.reset_token = secrets.token_urlsafe(32)
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
        db.commit()
        background_tasks.add_task(send_password_reset_email, user.email, user.full_name, user.reset_token)
    return {"message": "If an account with that email exists, we've sent a password reset link."}

@router.post("/reset-password")
@limiter.limit("10/hour")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Set a new password using the token from the reset email."""
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")
    if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    # A reset proves control of the inbox — clear any lockout so they can
    # log in immediately, and sign out every existing session in case the
    # reset was prompted by a compromised password.
    user.failed_login_attempts = 0
    user.locked_until = None
    user.sessions_revoked_at = datetime.utcnow()
    db.commit()
    return {"message": "Password reset successfully. You can now log in with your new password."}

@router.delete("/me")
def delete_account(
    payload: AccountDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete the logged-in user's account and all their data.

    Requires the current password so a hijacked session (or a borrowed
    device) can't destroy the account on its own.
    """
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password.")
    delete_user_account(current_user, db)
    return {"message": "Your account and all associated data have been permanently deleted."}
