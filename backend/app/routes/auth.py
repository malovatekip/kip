import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas import UserRegister, UserLogin, Token, UserOut
from app.security import hash_password, verify_password, create_access_token, get_current_user
from app.services.email_service import send_verification_email

router = APIRouter()

VERIFICATION_TOKEN_EXPIRE_HOURS = 24


def _issue_verification_token(user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires = datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)
    return token


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Log in with email and password. Returns a JWT access token."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    token = create_access_token(user.id)
    return Token(access_token=token, token_type="bearer", user=UserOut.model_validate(user))

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
def resend_verification(
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
