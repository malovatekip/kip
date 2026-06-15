"""
KIP Subscription Models — Sprint 15
Tables: subscriptions, usage_logs, payments
"""
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey
from datetime import datetime
from app.database import Base


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id                   = Column(Integer, primary_key=True, index=True)
    user_id              = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    plan_tier            = Column(String(20), default="free")     # free | premium
    status               = Column(String(20), default="active")   # active | cancelled | expired | trialing
    trial_ends_at        = Column(DateTime, nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end   = Column(DateTime, nullable=True)
    # Stripe
    stripe_customer_id      = Column(String(100), nullable=True)
    stripe_subscription_id  = Column(String(100), nullable=True)
    # Flutterwave
    flw_customer_id         = Column(String(100), nullable=True)
    flw_subscription_code   = Column(String(100), nullable=True)
    # Payment method
    payment_method          = Column(String(20), nullable=True)   # stripe | flutterwave | none
    # Amount
    amount_zmw              = Column(Float, default=0.0)
    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyUsage(Base):
    """Tracks per-user per-day usage of rate-limited features."""
    __tablename__ = "daily_usage"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    usage_date      = Column(String(10), nullable=False)   # YYYY-MM-DD
    ideas_generated = Column(Integer, default=0)
    chat_messages   = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PaymentRecord(Base):
    """Records every payment attempt and outcome."""
    __tablename__ = "payment_records"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider       = Column(String(20), nullable=False)   # stripe | flutterwave
    provider_ref   = Column(String(200), nullable=True)   # payment intent ID or FLW tx ref
    amount_zmw     = Column(Float, nullable=False)
    currency       = Column(String(5), default="ZMW")
    status         = Column(String(20), default="pending")  # pending | success | failed | refunded
    plan_tier      = Column(String(20), default="premium")
    months         = Column(Integer, default=1)
    description    = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
