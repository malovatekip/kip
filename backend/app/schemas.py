from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ── Auth ──
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
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
