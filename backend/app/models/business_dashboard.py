from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON
from datetime import datetime
from app.database import Base

class BusinessLaunchPlan(Base):
    __tablename__ = "business_launch_plans"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    idea_id         = Column(Integer, ForeignKey("business_ideas.id"), nullable=True)
    business_name   = Column(String(255), nullable=False)
    location        = Column(String(255), nullable=True)
    capital_amount  = Column(Float, nullable=True)
    # Full plan stored as JSON — phases, weeks, milestones
    plan_json       = Column(Text, nullable=False)          # JSON string
    projected_monthly_profit = Column(Float, nullable=True) # KIP's profit projection
    projected_break_even_days = Column(Integer, nullable=True)
    status          = Column(String(30), default="pre_launch")
    # pre_launch | launching | running | profitable | paused
    is_profitable   = Column(Boolean, default=False)
    profitable_at   = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyBusinessLog(Base):
    __tablename__ = "daily_business_logs"
    id              = Column(Integer, primary_key=True, index=True)
    plan_id         = Column(Integer, ForeignKey("business_launch_plans.id"), nullable=False)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    log_date        = Column(DateTime, default=datetime.utcnow)
    # Core metrics
    revenue_today   = Column(Float, default=0.0)     # ZMW
    expenses_today  = Column(Float, default=0.0)     # ZMW
    customer_count  = Column(Integer, default=0)
    stock_status    = Column(String(20), default="sufficient")  # sufficient|low|critical
    # Optional qualitative fields
    problem_today   = Column(Text, nullable=True)
    highlight_today = Column(Text, nullable=True)
    # Coaching response generated from this log
    coaching_response = Column(Text, nullable=True)
    coaching_generated_at = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class CoachingEntry(Base):
    __tablename__ = "coaching_entries"
    id              = Column(Integer, primary_key=True, index=True)
    plan_id         = Column(Integer, ForeignKey("business_launch_plans.id"), nullable=False)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    log_id          = Column(Integer, ForeignKey("daily_business_logs.id"), nullable=True)
    entry_type      = Column(String(30), default="daily")  # daily | weekly | milestone | graduation
    content         = Column(Text, nullable=False)
    day_number      = Column(Integer, nullable=True)  # day X of business
    created_at      = Column(DateTime, default=datetime.utcnow)
