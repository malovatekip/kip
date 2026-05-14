"""
KIP Business Chat — context-aware conversation for a specific business plan.
KIP is given the full business context before every message:
- Business name, location, capital
- Launch plan summary
- Last 7 days of log data
- Survey intelligence
- Projected profit target
"""
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.business_dashboard import BusinessLaunchPlan, DailyBusinessLog
from app.models.business_idea import BusinessIdea

router = APIRouter()


class BusinessChatRequest(BaseModel):
    plan_id:    int
    message:    str
    history:    Optional[list] = []   # [{role, content}, ...]


def _build_business_context(plan, idea, logs, survey) -> str:
    """
    Assemble everything KIP needs to know about this specific business
    before answering any question.
    """
    lines = [
        f"BUSINESS: {plan.business_name}",
        f"STATUS: {plan.status or 'active'}",
    ]

    if idea:
        if idea.location:
            lines.append(f"LOCATION: {idea.location}")
        if idea.capital_amount:
            lines.append(f"STARTUP CAPITAL: K{idea.capital_amount:,.0f}")
        if idea.idea_summary:
            lines.append(f"\nBUSINESS SUMMARY:\n{idea.idea_summary[:600]}")

    if plan.projected_monthly_profit:
        lines.append(f"\nPROJECTED MONTHLY PROFIT TARGET: K{plan.projected_monthly_profit:,.0f}")

    # Recent log performance
    if logs:
        lines.append(f"\nPERFORMANCE (last {len(logs)} days logged):")
        total_rev  = sum(getattr(l, 'revenue_today',  0) or 0 for l in logs)
        total_exp  = sum(getattr(l, 'expenses_today', 0) or 0 for l in logs)
        total_cust = sum(getattr(l, 'customer_count', 0) or 0 for l in logs)
        lines.append(f"  Total revenue:   K{total_rev:,.0f}")
        lines.append(f"  Total expenses:  K{total_exp:,.0f}")
        lines.append(f"  Net profit:      K{(total_rev - total_exp):,.0f}")
        lines.append(f"  Total customers: {total_cust}")
        lines.append(f"  Avg daily rev:   K{(total_rev / len(logs)):,.0f}")

        # Last 3 logs
        lines.append("\nRECENT DAILY LOGS:")
        for log in logs[:3]:
            rev  = getattr(log, 'revenue_today',  0) or 0
            exp  = getattr(log, 'expenses_today', 0) or 0
            cust = getattr(log, 'customer_count', 0) or 0
            date = log.created_at.strftime('%d %b') if log.created_at else '—'
            prob = getattr(log, 'problem_today', '') or ''
            win  = getattr(log, 'highlight_today', '') or ''
            lines.append(f"  {date}: Rev K{rev:,.0f} | Exp K{exp:,.0f} | "
                         f"Profit K{(rev-exp):,.0f} | {cust} customers")
            if prob:
                lines.append(f"         Challenge: {prob}")
            if win:
                lines.append(f"         Win: {win}")

    # Survey intelligence
    if survey:
        lines.append("\nMARKET INTELLIGENCE (from owner survey):")
        field_map = {
            'area_type':            'Area type',
            'foot_traffic':         'Foot traffic',
            'dominant_income_level':'Customer income',
            'competition_quality':  'Competition',
            'payment_preference':   'Payment method',
            'market_gaps_noted':    'Market gaps',
            'main_competitor_weakness': 'Competitor weakness',
            'security_level':       'Security',
        }
        for field, label in field_map.items():
            val = survey.get(field)
            if val:
                lines.append(f"  {label}: {str(val).replace('_',' ')}")

    return "\n".join(lines)


BUSINESS_CHAT_SYSTEM = """
You are KIP — the Kwacha Intelligence Platform — acting as a dedicated business advisor
for ONE specific business. You have been given the complete context about this business
above. Every answer you give must be:

1. SPECIFIC to this business — reference its actual name, numbers, location, and logs
2. ACTIONABLE — give concrete next steps, not general advice
3. ZAMBIA-AWARE — reference Zambian suppliers, institutions, prices, and context
4. DATA-DRIVEN — when log data is available, reference the actual figures

You are NOT a general chatbot here. You are this entrepreneur's personal business coach
who knows everything about their specific business.

If asked about things outside this business (unrelated topics), politely redirect:
"I'm focused on helping you with {business_name}. What would you like to know about your business?"

Always use ZMW (Kwacha) for money. Be direct, warm, and practical.
"""


@router.post("/chat")
async def business_chat(
    req: BusinessChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Context-aware chat endpoint for a specific business.
    KIP knows the full business context before answering.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="API key not configured.")

    import anthropic

    # Verify plan belongs to user
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == req.plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Business plan not found.")

    # Load idea
    idea = db.query(BusinessIdea).filter(
        BusinessIdea.id == plan.idea_id
    ).first() if plan.idea_id else None

    # Load recent logs (last 14)
    logs = db.query(DailyBusinessLog).filter(
        DailyBusinessLog.plan_id == req.plan_id
    ).order_by(DailyBusinessLog.created_at.desc()).limit(14).all()

    # Load survey
    survey = None
    try:
        from app.models.enhanced_logs import MarketSurvey
        s = db.query(MarketSurvey).filter(
            MarketSurvey.plan_id == req.plan_id,
            MarketSurvey.user_id == current_user.id
        ).first()
        if s:
            survey = {c.name: getattr(s, c.name) for c in s.__table__.columns}
    except Exception:
        pass

    # Build context block
    business_context = _build_business_context(plan, idea, logs, survey)

    # System prompt with injected context
    system = (
        f"BUSINESS CONTEXT — READ THIS FIRST:\n"
        f"{'='*60}\n"
        f"{business_context}\n"
        f"{'='*60}\n\n"
        f"{BUSINESS_CHAT_SYSTEM.replace('{business_name}', plan.business_name)}"
    )

    # Build message history (last 10 exchanges)
    messages = []
    for msg in (req.history or [])[-20:]:
        role    = msg.get('role', 'user')
        content = msg.get('content', '')
        if role in ('user', 'assistant') and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": req.message})

    # Call Claude with web search enabled
    client = anthropic.Anthropic(api_key=api_key)
    tools  = [{"type": "web_search_20250305", "name": "web_search"}]

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            tools=tools,
            messages=messages
        )
    except Exception:
        # Fallback without web search
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            messages=messages
        )

    # Extract text
    reply = ""
    for block in response.content:
        if hasattr(block, 'type') and block.type == 'text':
            reply += block.text

    # Handle tool use loop if needed
    if response.stop_reason == "tool_use" and not reply:
        tool_results = [
            {"type": "tool_result", "tool_use_id": b.id, "content": "Search completed."}
            for b in response.content
            if hasattr(b, 'type') and b.type == "tool_use"
        ]
        if tool_results:
            followup = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=system,
                tools=tools,
                messages=messages + [
                    {"role": "assistant", "content": response.content},
                    {"role": "user",      "content": tool_results},
                ]
            )
            for block in followup.content:
                if hasattr(block, 'type') and block.type == 'text':
                    reply += block.text

    return {
        "reply":         reply or "I couldn't generate a response. Please try again.",
        "business_name": plan.business_name,
        "plan_id":       req.plan_id,
    }


# ── Suggested questions for this business ────────────────────────────────────

@router.get("/suggestions/{plan_id}")
def get_suggestions(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return context-aware suggested questions for this business."""
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    log_count = db.query(DailyBusinessLog).filter(
        DailyBusinessLog.plan_id == plan_id
    ).count()

    base = [
        f"What should I focus on this week for {plan.business_name}?",
        "How can I reduce my expenses without losing quality?",
        "What marketing should I do this week?",
        "How do I find my first anchor clients?",
    ]

    if log_count >= 3:
        base = [
            "My expenses are higher than expected — what should I cut?",
            "My customer count is dropping — what could be causing this?",
            f"Am I on track to hit my profit target for {plan.business_name}?",
            "What is my peak day and how do I maximise it?",
        ]

    if log_count >= 7:
        base = [
            "Based on my logs, what is my biggest problem right now?",
            "When will I reach break-even at my current rate?",
            "Should I hire someone or keep operating alone?",
            "How do I scale this business to the next level?",
        ]

    return {"suggestions": base, "log_count": log_count}
