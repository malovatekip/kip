"""
KIP Subscription Service — Sprint 15
Core logic: plan checks, usage enforcement, trial activation.
"""
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text as sqlt
from app.models.subscription_models import UserSubscription, DailyUsage

# ── Plan limits ───────────────────────────────────────────────────────────────
FREE_LIMITS = {
    "ideas_per_day":    3,
    "chat_per_day":     5,
    "soft_extra":       2,   # how many extra allowed before hard block
}

PREMIUM_PRICE_ZMW = 49.0
TRIAL_DAYS        = 30
PREMIUM_TIERS     = {"premium", "enterprise", "pro"}


# ── Tier resolution ───────────────────────────────────────────────────────────

def get_effective_tier(user, db: Session) -> str:
    """
    Returns the user's current effective tier:
    'premium' if on paid plan or within trial window,
    'free' otherwise.
    """
    sub = _get_or_create_subscription(user, db)

    # Trialing
    if sub.status == "trialing" and sub.trial_ends_at:
        if datetime.utcnow() < sub.trial_ends_at:
            return "premium"
        else:
            # Trial expired — downgrade
            sub.status    = "active"
            sub.plan_tier = "free"
            db.commit()
            return "free"

    if sub.plan_tier in PREMIUM_TIERS and sub.status == "active":
        # Check subscription hasn't expired
        if sub.current_period_end and datetime.utcnow() > sub.current_period_end:
            sub.plan_tier = "free"
            sub.status    = "active"
            db.commit()
            return "free"
        return "premium"

    return "free"


def is_premium(user, db: Session) -> bool:
    return get_effective_tier(user, db) == "premium"


def get_trial_info(user, db: Session) -> dict:
    """Returns trial status info for the UI banner."""
    sub = _get_or_create_subscription(user, db)
    if sub.status != "trialing" or not sub.trial_ends_at:
        return {"on_trial": False}
    now  = datetime.utcnow()
    if now >= sub.trial_ends_at:
        return {"on_trial": False}
    days_left = (sub.trial_ends_at - now).days
    return {
        "on_trial":  True,
        "days_left": days_left,
        "ends_at":   sub.trial_ends_at.isoformat(),
    }


# ── Trial activation ──────────────────────────────────────────────────────────

def activate_trial(user, db: Session):
    """Activate 30-day premium trial for a new user."""
    sub = _get_or_create_subscription(user, db)
    if sub.status not in ("trialing", "active") or sub.plan_tier != "free":
        return  # already on paid plan or trial already used

    # Only activate if they haven't had a trial before
    if sub.trial_ends_at is not None:
        return  # trial already was/is active

    sub.status        = "trialing"
    sub.plan_tier     = "premium"
    sub.trial_ends_at = datetime.utcnow() + timedelta(days=TRIAL_DAYS)
    db.commit()
    print(f"[KIP Sub] Trial activated for user {user.id} — {TRIAL_DAYS} days")


# ── Usage tracking ────────────────────────────────────────────────────────────

def _today_str() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _get_usage(user_id: int, db: Session) -> DailyUsage:
    today = _today_str()
    usage = db.query(DailyUsage).filter(
        DailyUsage.user_id   == user_id,
        DailyUsage.usage_date == today,
    ).first()
    if not usage:
        usage = DailyUsage(user_id=user_id, usage_date=today)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    return usage


def check_idea_limit(user, db: Session) -> dict:
    """
    Check if user can generate another business idea.
    Returns: {allowed: bool, count: int, limit: int, soft_warning: bool}
    """
    if is_premium(user, db):
        return {"allowed": True, "count": 0, "limit": -1, "soft_warning": False}

    usage = _get_usage(user.id, db)
    count = usage.ideas_generated
    limit = FREE_LIMITS["ideas_per_day"]
    soft  = limit + FREE_LIMITS["soft_extra"]

    return {
        "allowed":      count < soft,
        "count":        count,
        "limit":        limit,
        "soft_warning": count >= limit,
        "hard_blocked": count >= soft,
    }


def increment_idea_count(user, db: Session):
    """Increment the idea generation count for today."""
    if is_premium(user, db):
        return
    usage = _get_usage(user.id, db)
    usage.ideas_generated += 1
    usage.updated_at       = datetime.utcnow()
    db.commit()


def check_chat_limit(user, db: Session) -> dict:
    """Check if user can send another business chat message."""
    if is_premium(user, db):
        return {"allowed": True, "count": 0, "limit": -1, "soft_warning": False}

    usage = _get_usage(user.id, db)
    count = usage.chat_messages
    limit = FREE_LIMITS["chat_per_day"]
    soft  = limit + FREE_LIMITS["soft_extra"]

    return {
        "allowed":      count < soft,
        "count":        count,
        "limit":        limit,
        "soft_warning": count >= limit,
        "hard_blocked": count >= soft,
    }


def increment_chat_count(user, db: Session):
    """Increment the chat message count for today."""
    if is_premium(user, db):
        return
    usage = _get_usage(user.id, db)
    usage.chat_messages += 1
    usage.updated_at     = datetime.utcnow()
    db.commit()


def get_usage_summary(user, db: Session) -> dict:
    """Return today's usage counts for the UI."""
    tier  = get_effective_tier(user, db)
    usage = _get_usage(user.id, db)
    trial = get_trial_info(user, db)

    return {
        "tier":             tier,
        "is_premium":       tier == "premium",
        "trial":            trial,
        "ideas_today":      usage.ideas_generated,
        "chat_today":       usage.chat_messages,
        "ideas_limit":      -1 if tier == "premium" else FREE_LIMITS["ideas_per_day"],
        "chat_limit":       -1 if tier == "premium" else FREE_LIMITS["chat_per_day"],
        "ideas_soft_limit": -1 if tier == "premium" else FREE_LIMITS["ideas_per_day"] + FREE_LIMITS["soft_extra"],
        "chat_soft_limit":  -1 if tier == "premium" else FREE_LIMITS["chat_per_day"] + FREE_LIMITS["soft_extra"],
    }


# ── Subscription activation (after payment) ───────────────────────────────────

def activate_premium(
    user,
    db: Session,
    months: int = 1,
    payment_method: str = "stripe",
    provider_ref: str = None,
    stripe_customer_id: str = None,
    stripe_subscription_id: str = None,
    flw_customer_id: str = None,
    flw_subscription_code: str = None,
):
    """Upgrade a user to premium after successful payment."""
    sub = _get_or_create_subscription(user, db)

    now               = datetime.utcnow()
    period_end        = now + timedelta(days=30 * months)

    sub.plan_tier             = "premium"
    sub.status                = "active"
    sub.current_period_start  = now
    sub.current_period_end    = period_end
    sub.payment_method        = payment_method
    sub.amount_zmw            = PREMIUM_PRICE_ZMW * months
    sub.trial_ends_at         = None  # trial ended, now on paid

    if stripe_customer_id:
        sub.stripe_customer_id     = stripe_customer_id
    if stripe_subscription_id:
        sub.stripe_subscription_id = stripe_subscription_id
    if flw_customer_id:
        sub.flw_customer_id        = flw_customer_id
    if flw_subscription_code:
        sub.flw_subscription_code  = flw_subscription_code

    sub.updated_at = now
    db.commit()

    # Update the user record tier too
    try:
        user.plan_tier = "premium"
        db.commit()
    except Exception:
        pass

    print(f"[KIP Sub] Premium activated for user {user.id} until {period_end}")


def cancel_premium(user, db: Session):
    """Cancel premium — user retains access until period end."""
    sub = _get_or_create_subscription(user, db)
    sub.status     = "cancelled"
    sub.updated_at = datetime.utcnow()
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create_subscription(user, db: Session) -> UserSubscription:
    sub = db.query(UserSubscription).filter(
        UserSubscription.user_id == user.id
    ).first()
    if not sub:
        sub = UserSubscription(user_id=user.id, plan_tier="free", status="active")
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def ensure_subscription_tables(db: Session):
    """Create subscription tables if they don't exist."""
    db.execute(sqlt("""
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id                 INTEGER NOT NULL UNIQUE,
            plan_tier               TEXT DEFAULT 'free',
            status                  TEXT DEFAULT 'active',
            trial_ends_at           TEXT,
            current_period_start    TEXT,
            current_period_end      TEXT,
            stripe_customer_id      TEXT,
            stripe_subscription_id  TEXT,
            flw_customer_id         TEXT,
            flw_subscription_code   TEXT,
            payment_method          TEXT,
            amount_zmw              REAL DEFAULT 0,
            created_at              TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at              TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(sqlt("""
        CREATE TABLE IF NOT EXISTS daily_usage (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            usage_date      TEXT NOT NULL,
            ideas_generated INTEGER DEFAULT 0,
            chat_messages   INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at      TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, usage_date)
        )
    """))
    db.execute(sqlt("""
        CREATE TABLE IF NOT EXISTS payment_records (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            provider     TEXT NOT NULL,
            provider_ref TEXT,
            amount_zmw   REAL NOT NULL,
            currency     TEXT DEFAULT 'ZMW',
            status       TEXT DEFAULT 'pending',
            plan_tier    TEXT DEFAULT 'premium',
            months       INTEGER DEFAULT 1,
            description  TEXT,
            created_at   TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.commit()
