"""
KIP Auth Routes — Sprint 15 update
Activates 30-day premium trial on new user registration.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.schemas import UserRegister, UserLogin, Token, UserOut
from app.models.user import User
from app.security import (
    hash_password, verify_password,
    create_access_token, get_current_user
)

router = APIRouter()


@router.post("/register", response_model=Token)
def register(req: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        full_name=req.full_name.strip(),
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        plan_tier="premium",   # starts on trial = premium access
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Activate 30-day trial
    try:
        from app.services.subscription_service import activate_trial, ensure_subscription_tables
        ensure_subscription_tables(db)
        activate_trial(user, db)
    except Exception as e:
        print(f"[Auth] Trial activation error (non-fatal): {e}")

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":        user.id,
            "full_name": user.full_name,
            "email":     user.email,
            "plan_tier": "premium",
        }
    }


@router.post("/login", response_model=Token)
def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact support."
        )

    # Sync plan_tier from subscription
    try:
        from app.services.subscription_service import (
            get_effective_tier, ensure_subscription_tables
        )
        ensure_subscription_tables(db)
        effective_tier = get_effective_tier(user, db)
        if user.plan_tier != effective_tier:
            user.plan_tier = effective_tier
            db.commit()
    except Exception as e:
        print(f"[Auth] Tier sync error (non-fatal): {e}")

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":        user.id,
            "full_name": user.full_name,
            "email":     user.email,
            "plan_tier": user.plan_tier or "free",
        }
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Always return fresh tier from subscription service
    try:
        from app.services.subscription_service import (
            get_effective_tier, get_trial_info, ensure_subscription_tables
        )
        ensure_subscription_tables(db)
        effective_tier = get_effective_tier(current_user, db)
        trial_info     = get_trial_info(current_user, db)
        return {
            "id":         current_user.id,
            "full_name":  current_user.full_name,
            "email":      current_user.email,
            "plan_tier":  effective_tier,
            "trial_info": trial_info,
        }
    except Exception:
        return {
            "id":         current_user.id,
            "full_name":  current_user.full_name,
            "email":      current_user.email,
            "plan_tier":  current_user.plan_tier or "free",
            "trial_info": {"on_trial": False},
        }
