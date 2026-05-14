"""
KIP Business Dashboard Routes — Hotfix 4
Exact column names confirmed by diagnose.py:

business_launch_plans: id, user_id, idea_id, business_name, location,
    capital_amount, plan_json, projected_monthly_profit,
    projected_break_even_days, status, is_profitable, profitable_at,
    created_at, updated_at

daily_business_logs: id, plan_id, user_id, log_date, revenue_today,
    expenses_today, customer_count, stock_status, problem_today,
    highlight_today, coaching_response, coaching_generated_at, created_at
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

from app.database import get_db
from app.models.user import User
from app.models.business_idea import BusinessIdea
from app.security import get_current_user
from app.models.business_dashboard import BusinessLaunchPlan, DailyBusinessLog

router = APIRouter()


class StartBusinessRequest(BaseModel):
    idea_id: int


class DailyLogRequest(BaseModel):
    plan_id:    int
    revenue:    float = 0.0
    expenses:   float = 0.0
    customers:  int   = 0
    notes:      Optional[str] = None
    challenges: Optional[str] = None
    wins:       Optional[str] = None
    stock_status: str = "sufficient"


# ── /start ───────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_business(
    req: StartBusinessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    idea = db.query(BusinessIdea).filter(
        BusinessIdea.id == req.idea_id,
        BusinessIdea.user_id == current_user.id
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found.")

    # Return existing plan if already started
    existing = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.idea_id == req.idea_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if existing:
        return {
            "id":            existing.id,
            "plan_id":       existing.id,
            "business_name": existing.business_name,
            "status":        existing.status,
            "already_existed": True,
        }

    # Generate launch plan text
    launch_text = await _generate_launch_plan(idea, current_user)

    # plan_json is NOT NULL — must always be a valid JSON string
    plan_json_value = json.dumps({
        "launch_plan": launch_text,
        "generated_at": datetime.utcnow().isoformat(),
        "version": "2.0"
    })

    plan = BusinessLaunchPlan(
        user_id=current_user.id,
        idea_id=idea.id,
        business_name=idea.idea_name,
        location=idea.location or "",
        capital_amount=idea.capital_amount,
        plan_json=plan_json_value,       # ← exact column name, never NULL
        status="active",
        is_profitable=False,
    )
    db.add(plan)

    # Mark idea as accepted
    if idea.accepted is None:
        idea.accepted = True

    db.commit()
    db.refresh(plan)

    return {
        "id":            plan.id,
        "plan_id":       plan.id,        # ← explicit, fixes frontend navigation
        "business_name": plan.business_name,
        "status":        plan.status,
        "already_existed": False,
    }


# ── /my-plans ────────────────────────────────────────────────────────────────

@router.get("/my-plans")
def get_my_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plans = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.user_id == current_user.id
    ).order_by(BusinessLaunchPlan.created_at.desc()).all()

    return [
        {
            "id":            p.id,
            "plan_id":       p.id,
            "idea_id":       p.idea_id,
            "business_name": p.business_name,
            "status":        p.status,
            "created_at":    p.created_at.isoformat() if p.created_at else None,
        }
        for p in plans
    ]


# ── /plan/{plan_id} ──────────────────────────────────────────────────────────

@router.get("/plan/{plan_id}")
def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Business plan not found.")

    # Extract launch plan text from plan_json
    launch_plan_text = ""
    if plan.plan_json:
        try:
            parsed = json.loads(plan.plan_json)
            launch_plan_text = parsed.get("launch_plan", "") or parsed.get("plan", "")
            # If plan_json is just the raw text (old format)
            if not launch_plan_text and isinstance(parsed, str):
                launch_plan_text = parsed
        except (json.JSONDecodeError, TypeError):
            # plan_json might be raw text, not JSON
            launch_plan_text = str(plan.plan_json)

    # Get logs using exact column names
    logs_raw = db.query(DailyBusinessLog).filter(
        DailyBusinessLog.plan_id == plan_id
    ).order_by(DailyBusinessLog.created_at.desc()).limit(30).all()

    logs = [
        {
            "id":         l.id,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "revenue":    l.revenue_today    or 0,
            "expenses":   l.expenses_today   or 0,
            "customers":  l.customer_count   or 0,
            "notes":      l.problem_today    or "",
            "wins":       l.highlight_today  or "",
            "coaching":   l.coaching_response or "",
        }
        for l in logs_raw
    ]

    return {
        "id":            plan.id,
        "plan_id":       plan.id,
        "idea_id":       plan.idea_id,
        "business_name": plan.business_name,
        "launch_plan":   launch_plan_text,
        "status":        plan.status,
        "projected_monthly_profit": plan.projected_monthly_profit,
        "created_at":    plan.created_at.isoformat() if plan.created_at else None,
        "logs":          logs,
    }


# ── /log ─────────────────────────────────────────────────────────────────────

@router.post("/log")
async def submit_log(
    req: DailyLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == req.plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    log = DailyBusinessLog(
        plan_id=req.plan_id,
        user_id=current_user.id,
        log_date=datetime.utcnow(),
        revenue_today=req.revenue,       # ← exact column
        expenses_today=req.expenses,     # ← exact column
        customer_count=req.customers,    # ← exact column
        stock_status=req.stock_status,
        problem_today=req.challenges,    # ← exact column
        highlight_today=req.wins,        # ← exact column
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Generate coaching
    coaching = await _generate_coaching(log, plan, current_user, req)
    log.coaching_response = coaching
    log.coaching_generated_at = datetime.utcnow()
    db.commit()

    return {
        "log_id":   log.id,
        "coaching": coaching,
        "profit":   req.revenue - req.expenses,
    }


# ── /logs/{plan_id} ──────────────────────────────────────────────────────────

@router.get("/logs/{plan_id}")
def get_logs(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    logs = db.query(DailyBusinessLog).filter(
        DailyBusinessLog.plan_id == plan_id
    ).order_by(DailyBusinessLog.created_at.desc()).all()

    return [
        {
            "id":         l.id,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "revenue":    l.revenue_today   or 0,
            "expenses":   l.expenses_today  or 0,
            "customers":  l.customer_count  or 0,
            "notes":      l.problem_today   or "",
            "wins":       l.highlight_today or "",
            "coaching":   l.coaching_response or "",
        }
        for l in logs
    ]


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _generate_launch_plan(idea, user) -> str:
    import os, anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return f"# Launch Plan: {idea.idea_name}\n\nConnect your Anthropic API key to generate a full plan."

    prompt = (
        f"Generate a detailed week-by-week business launch plan for:\n\n"
        f"Business: {idea.idea_name}\n"
        f"Entrepreneur: {user.full_name}\n"
        f"Location: {idea.location or 'Zambia'}\n"
        f"Capital: K{idea.capital_amount or 'as recommended'}\n\n"
        f"Original KIP recommendation summary:\n{(idea.idea_summary or '')[:600]}\n\n"
        f"Create a 6-week launch plan with specific, actionable tasks for each week. "
        f"Format with Week 1, Week 2, etc. headings. "
        f"Use ZMW for all amounts. Be specific to the Zambian context. "
        f"End with Month 2–3 milestones."
    )

    client = anthropic.Anthropic(api_key=api_key)
    try:
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return r.content[0].text
    except Exception as e:
        return f"# Launch Plan: {idea.idea_name}\n\nError generating plan: {e}"


async def _generate_coaching(log, plan, user, req) -> str:
    import os, anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Log saved. Add your API key for personalised daily coaching."

    profit = req.revenue - req.expenses
    client = anthropic.Anthropic(api_key=api_key)
    try:
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content":
                f"Business: {plan.business_name} | Owner: {user.full_name}\n"
                f"Today: Revenue K{req.revenue:.0f} | Expenses K{req.expenses:.0f} | "
                f"Profit K{profit:.0f} | Customers: {req.customers}\n"
                f"Challenge today: {req.challenges or 'None'}\n"
                f"Win today: {req.wins or 'None'}\n\n"
                f"Give ONE specific coaching insight referencing these actual numbers, "
                f"and ONE clear priority action for tomorrow. "
                f"Be direct. Under 180 words. Use ZMW."
            }]
        )
        return r.content[0].text
    except Exception:
        return (
            f"📊 **TODAY'S SNAPSHOT**\n"
            f"Revenue: K{req.revenue:.0f} | Expenses: K{req.expenses:.0f} | "
            f"Profit: K{profit:.0f}\n\n"
            f"⭐ **TOMORROW'S PRIORITY**\n"
            f"Keep logging daily — KIP needs 7+ days to detect patterns."
        )
