from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(120), nullable=False)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active     = Column(Boolean, default=True)
    is_admin      = Column(Boolean, default=False)   # platform-wide admin (dataset export, etc.)
    plan_tier     = Column(String(20), default="free")   # free | premium
    is_verified   = Column(Boolean, default=False)
    verification_token         = Column(String(255), unique=True, index=True, nullable=True)
    verification_token_expires = Column(DateTime, nullable=True)
    # Brute-force protection: count consecutive failed logins, lock the
    # account out temporarily once the threshold is hit. Reset on success.
    failed_login_attempts = Column(Integer, default=0)
    locked_until          = Column(DateTime, nullable=True)
    # Forgot-password flow: single-use token emailed to the user.
    reset_token         = Column(String(255), unique=True, index=True, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    # Tokens issued (iat) before this moment are rejected — set on password
    # reset so every pre-existing session is signed out at once.
    sessions_revoked_at = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user")
    business_ideas = relationship("BusinessIdea", back_populates="user")
