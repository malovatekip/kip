"""
KIP Business Chat History Model
Stores per-business chat messages so conversations persist across sessions.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from datetime import datetime
from app.database import Base


class BusinessChatMessage(Base):
    __tablename__ = "business_chat_messages"

    id         = Column(Integer, primary_key=True, index=True)
    plan_id    = Column(Integer, ForeignKey("business_launch_plans.id"), nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    role       = Column(String(20), nullable=False)   # 'user' | 'assistant'
    content    = Column(Text, nullable=False)
    # Plan update tracking
    is_plan_update_proposal = Column(Boolean, default=False)  # KIP proposed a change
    is_plan_update_applied  = Column(Boolean, default=False)  # User confirmed it
    created_at = Column(DateTime, default=datetime.utcnow)


class BusinessPlanVersion(Base):
    """
    Stores previous versions of plan_json so changes are reversible.
    """
    __tablename__ = "business_plan_versions"

    id            = Column(Integer, primary_key=True, index=True)
    plan_id       = Column(Integer, ForeignKey("business_launch_plans.id"), nullable=False)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    version_num   = Column(Integer, nullable=False, default=1)
    plan_json_old = Column(Text, nullable=False)   # snapshot before change
    change_summary= Column(String(500), nullable=True)  # what changed
    created_at    = Column(DateTime, default=datetime.utcnow)
