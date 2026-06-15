from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    full_name: str
    email:     EmailStr
    password:  str

class UserLogin(BaseModel):
    email:    EmailStr
    password: str

class UserOut(BaseModel):
    id:         int
    full_name:  str
    email:      str
    plan_tier:  Optional[str]      = "free"
    created_at: Optional[datetime] = None
    trial_info: Optional[dict]     = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type:   str
    user:         UserOut


# ── Chat / Conversations ──────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[int] = None

class ChatRequest(BaseModel):
    message:         str
    conversation_id: Optional[int] = None

class ChatResponse(BaseModel):
    reply:           str
    conversation_id: int
    idea_saved:      Optional[bool] = False

class MessageOut(BaseModel):
    id:         int
    role:       str
    content:    str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id:         int
    title:      Optional[str]              = None
    messages:   Optional[List[MessageOut]] = []
    created_at: Optional[datetime]         = None
    updated_at: Optional[datetime]         = None
    class Config:
        from_attributes = True

class ConversationListItem(BaseModel):
    id:         int
    title:      Optional[str]      = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Ideas ─────────────────────────────────────────────────────────────────────

class IdeaFeedback(BaseModel):
    accepted:       bool
    decline_reason: Optional[str] = None

class StartBusinessRequest(BaseModel):
    idea_id: int

class IdeaOut(BaseModel):
    id:               int
    idea_name:        str
    idea_summary:     Optional[str]   = None
    full_response:    Optional[str]   = None
    location:         Optional[str]   = None
    capital_amount:   Optional[float] = None
    skills:           Optional[str]   = None
    generated_by_kip: Optional[bool]  = True
    accepted:         Optional[bool]  = None
    decline_reason:   Optional[str]   = None
    plan_id:          Optional[int]   = None
    created_at:       Optional[datetime] = None
    class Config:
        from_attributes = True

# ── Dashboard ──
class DashboardStats(BaseModel):
    total_conversations: int
    total_ideas: int
    accepted_ideas: int
    member_since: datetime


# ── Business plans / logs ─────────────────────────────────────────────────────

class LogEntry(BaseModel):
    id:               int
    revenue:          Optional[float] = 0
    expenses:         Optional[float] = 0
    customers:        Optional[int]   = 0
    coaching:         Optional[str]   = None
    stock_status:     Optional[str]   = None
    problem_today:    Optional[str]   = None
    highlight_today:  Optional[str]   = None
    log_date:         Optional[str]   = None
    created_at:       Optional[datetime] = None
    class Config:
        from_attributes = True

class PlanOut(BaseModel):
    id:                       int
    business_name:            str
    location:                 Optional[str]            = None
    capital_amount:           Optional[float]          = None
    launch_plan:              Optional[str]            = None
    plan_json:                Optional[str]            = None
    status:                   Optional[str]            = "active"
    projected_monthly_profit: Optional[float]          = None
    projected_break_even_days:Optional[int]            = None
    is_profitable:            Optional[bool]           = False
    profitable_at:            Optional[datetime]       = None
    logs:                     Optional[List[LogEntry]] = []
    idea_id:                  Optional[int]            = None
    created_at:               Optional[datetime]       = None
    updated_at:               Optional[datetime]       = None
    class Config:
        from_attributes = True

class PlanListItem(BaseModel):
    id:            int
    business_name: str
    location:      Optional[str]     = None
    status:        Optional[str]     = "active"
    created_at:    Optional[datetime]= None
    class Config:
        from_attributes = True


# ── Logs submission ───────────────────────────────────────────────────────────

class DailyLogRequest(BaseModel):
    plan_id:         int
    revenue_today:   Optional[float] = 0
    expenses_today:  Optional[float] = 0
    customer_count:  Optional[int]   = 0
    stock_status:    Optional[str]   = None
    problem_today:   Optional[str]   = None
    highlight_today: Optional[str]   = None
    log_date:        Optional[str]   = None


# ── News ──────────────────────────────────────────────────────────────────────

class NewsArticle(BaseModel):
    title:       str
    url:         Optional[str] = None
    source:      Optional[str] = None
    published:   Optional[str] = None
    summary:     Optional[str] = None

class AlertOut(BaseModel):
    id:          int
    title:       str
    message:     Optional[str]     = None
    severity:    Optional[str]     = "info"
    is_read:     Optional[bool]    = False
    created_at:  Optional[datetime]= None
    class Config:
        from_attributes = True


# ── Generic ───────────────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    status:  str = "ok"
    message: Optional[str] = None
