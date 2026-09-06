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
    is_admin: bool = False
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
    category: Optional[str] = None
    viability_score: Optional[float] = None
    class Config:
        from_attributes = True

class IdeaFeedback(BaseModel):
    accepted: bool
    decline_reason: Optional[str] = None

# ── K-BIG-2: structured idea generation ──
class IdeaGenerateRequest(BaseModel):
    """The New Idea wizard's 4 slides, submitted once on the final slide."""
    capital_available: Optional[float] = None  # None == limitless (Slide 1 skipped, no loan/grant expected)
    capital_skip_loan_expected: bool = False
    capital_loan_amount_min: Optional[float] = None
    capital_loan_amount_max: Optional[float] = None
    location: str
    skills: List[str] = []
    assets: List[str] = []

class IdeaGenerateResult(BaseModel):
    id: int
    idea_name: str
    category: Optional[str] = None
    idea_summary: str
    viability_score: float
    min_capital: Optional[float] = None
    recommended_capital_min: Optional[float] = None
    recommended_capital_max: Optional[float] = None
    is_new: bool
    created_at: Optional[str] = None

class IdeaGenerateResponse(BaseModel):
    ideas: List[IdeaGenerateResult]

class IdeaDetailOut(BaseModel):
    id: int
    idea_name: str
    idea_summary: str
    location: Optional[str]
    capital_amount: Optional[float]
    accepted: Optional[bool]
    created_at: datetime
    category: Optional[str] = None
    structured_data: Optional[dict] = None
    viability_score: Optional[float] = None
    demand_score: Optional[float] = None
    financial_score: Optional[float] = None
    capital_fit_score: Optional[float] = None
    execution_fit_score: Optional[float] = None
    regulatory_score: Optional[float] = None
    competitive_score: Optional[float] = None
    asset_location_score: Optional[float] = None
    min_capital: Optional[float] = None
    recommended_capital_min: Optional[float] = None
    recommended_capital_max: Optional[float] = None
    class Config:
        from_attributes = True

# ── Dashboard ──
class DashboardStats(BaseModel):
    total_conversations: int
    total_ideas: int
    accepted_ideas: int
    member_since: datetime
