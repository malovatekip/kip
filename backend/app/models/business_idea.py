from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class BusinessIdea(Base):
    """
    The Business Idea Repository.
    Every idea KIP generates is stored here.
    """
    __tablename__ = "business_ideas"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)

    # The idea itself
    idea_name       = Column(String(255), nullable=False)
    idea_summary    = Column(Text, nullable=False)
    full_response   = Column(Text, nullable=False)   # Full KIP response stored as JSON string

    # Context at time of generation
    location        = Column(String(255), nullable=True)
    capital_amount  = Column(Float, nullable=True)
    skills          = Column(Text, nullable=True)

    # Repository tracking
    generated_by_kip = Column(Boolean, default=True)   # 1 = KIP-generated, 0 = pre-loaded
    accepted         = Column(Boolean, nullable=True)   # True/False/None (pending)
    decline_reason   = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="business_ideas")
