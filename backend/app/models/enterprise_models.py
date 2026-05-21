"""
KIP Enterprise Models — Sprint 13
Multi-branch business system for corporate/enterprise accounts.
"""
from sqlalchemy import (
    Column, Integer, String, DateTime, Text,
    Boolean, Float, ForeignKey
)
from datetime import datetime
from app.database import Base


class EnterpriseBusiness(Base):
    """
    The top-level enterprise entity.
    Owned by one user (the central manager).
    Contains multiple branches.
    """
    __tablename__ = "enterprise_businesses"

    id              = Column(Integer, primary_key=True, index=True)
    owner_user_id   = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name            = Column(String(200), nullable=False)
    description     = Column(Text, nullable=True)
    industry        = Column(String(100), nullable=True)
    headquarters    = Column(String(200), nullable=True)   # main location
    branch_count    = Column(Integer, default=0)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EnterpriseBranch(Base):
    """
    A single branch within an enterprise.
    Linked to a BusinessLaunchPlan for its own dashboard.
    Managed by a specific KIP user (branch_manager_user_id).
    """
    __tablename__ = "enterprise_branches"

    id                    = Column(Integer, primary_key=True, index=True)
    enterprise_id         = Column(Integer, ForeignKey("enterprise_businesses.id"), nullable=False, index=True)
    plan_id               = Column(Integer, ForeignKey("business_launch_plans.id"), nullable=True)
    branch_name           = Column(String(200), nullable=False)
    location              = Column(String(200), nullable=True)
    specialty             = Column(String(300), nullable=True)   # what this branch does
    branch_manager_user_id= Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    manager_email         = Column(String(255), nullable=True)   # stored for reference
    monthly_target        = Column(Float, nullable=True)         # revenue target set by owner
    is_active             = Column(Boolean, default=True)
    created_at            = Column(DateTime, default=datetime.utcnow)


class BranchNotification(Base):
    """
    In-app notifications for branch managers.
    Shown as a banner when the manager logs in.
    Real email notifications added in Stripe sprint.
    """
    __tablename__ = "branch_notifications"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    enterprise_id = Column(Integer, ForeignKey("enterprise_businesses.id"), nullable=False)
    branch_id     = Column(Integer, ForeignKey("enterprise_branches.id"), nullable=False)
    message       = Column(Text, nullable=False)
    is_read       = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)
