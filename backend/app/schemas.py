import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime

# ── Auth ──
def _check_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(v.encode("utf-8")) > 72:
        # bcrypt ignores/errors on anything past 72 bytes
        raise ValueError("Password must be at most 72 characters long.")
    if not re.search(r"[A-Za-z]", v):
        raise ValueError("Password must contain at least one letter.")
    if not re.search(r"[0-9]", v):
        raise ValueError("Password must contain at least one number.")
    return v

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _check_password_strength(v)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _check_password_strength(v)

class AccountDeleteRequest(BaseModel):
    password: str

class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    plan_tier: str
    is_verified: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

# ── Chat ──
class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[MessageOut] = []
    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    conversation_id: int
    reply: str
    idea_saved: bool = False

# ── Startup Chat ──
class StartupChatMessage(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    step_context: Optional[str] = None

class StartupMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class StartupConversationOut(BaseModel):
    id: int
    title: str
    step_emoji: Optional[str] = None
    created_at: datetime
    messages: List[StartupMessageOut] = []
    class Config:
        from_attributes = True

class StartupChatResponse(BaseModel):
    conversation_id: int
    reply: str

# ── Business Ideas ──
class IdeaOut(BaseModel):
    id: int
    idea_name: str
    idea_summary: str
    location: Optional[str]
    capital_amount: Optional[float]
    accepted: Optional[bool]
    created_at: datetime
    class Config:
        from_attributes = True

class IdeaFeedback(BaseModel):
    accepted: bool
    decline_reason: Optional[str] = None

# ── Dashboard ──
class DashboardStats(BaseModel):
    total_conversations: int
    total_ideas: int
    accepted_ideas: int
    member_since: datetime
