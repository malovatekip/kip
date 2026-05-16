"""
KIP Business Chat — Hotfix 7
Fixed: removed dependency on business_chat_model.py import.
Tables are created inline via raw SQL so no import chain can break the route.
"""
import json
import os
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text as sqlt
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.business_dashboard import BusinessLaunchPlan, DailyBusinessLog
from app.models.business_idea import BusinessIdea

router = APIRouter()

# ── Table bootstrap ───────────────────────────────────────────────────────────

def _ensure_tables(db: Session):
    """Create chat tables if they don't exist. Called on every request — fast no-op if tables exist."""
    db.execute(sqlt("""
        CREATE TABLE IF NOT EXISTS business_chat_messages (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id                 INTEGER NOT NULL,
            user_id                 INTEGER NOT NULL,
            role                    TEXT    NOT NULL,
            content                 TEXT    NOT NULL,
            is_plan_update_proposal INTEGER DEFAULT 0,
            is_plan_update_applied  INTEGER DEFAULT 0,
            update_summary          TEXT,
            pending_resolved        INTEGER DEFAULT 0,
            created_at              TEXT    DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(sqlt("""
        CREATE TABLE IF NOT EXISTS business_plan_versions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id        INTEGER NOT NULL,
            user_id        INTEGER NOT NULL,
            version_num    INTEGER DEFAULT 1,
            plan_json_old  TEXT    NOT NULL,
            change_summary TEXT,
            created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.commit()


# ── Update detection ──────────────────────────────────────────────────────────

UPDATE_TRIGGERS = [
    "add", "change", "update", "modify", "include", "replace", "remove",
    "switch", "pivot", "expand", "also sell", "what if i", "can i add",
    "should i add", "thinking of adding", "want to add", "plan to add",
    "i want to change", "what about adding", "should i change", "can i change",
]
CONFIRM_PHRASES = ["yes", "confirm", "apply it", "update the plan", "go ahead",
                   "do it", "make the change", "update it", "yes please", "approved"]
REJECT_PHRASES  = ["no", "cancel", "don't", "keep it", "leave it", "never mind",
                   "ignore", "forget it", "not yet", "no thanks"]


def _is_update_suggestion(text: str) -> bool:
    tl = text.lower()
    return any(t in tl for t in UPDATE_TRIGGERS)

def _is_confirmation(text: str) -> bool:
    tl = text.lower().strip()
    return any(tl.startswith(p) or tl == p for p in CONFIRM_PHRASES)

def _is_rejection(text: str) -> bool:
    tl = text.lower().strip()
    return any(tl.startswith(p) or tl == p for p in REJECT_PHRASES)


# ── Business context builder ──────────────────────────────────────────────────

def _build_context(plan, idea, logs, survey) -> str:
    lines = [f"BUSINESS: {plan.business_name}", f"STATUS: {plan.status or 'active'}"]
    if idea:
        if idea.location:       lines.append(f"LOCATION: {idea.location}")
        if idea.capital_amount: lines.append(f"STARTUP CAPITAL: K{idea.capital_amount:,.0f}")
        if idea.idea_summary:   lines.append(f"\nBUSINESS SUMMARY:\n{idea.idea_summary[:500]}")
    if plan.projected_monthly_profit:
        lines.append(f"\nPROFIT TARGET: K{plan.projected_monthly_profit:,.0f}/month")

    if logs:
        total_rev  = sum(getattr(l, 'revenue_today',  0) or 0 for l in logs)
        total_exp  = sum(getattr(l, 'expenses_today', 0) or 0 for l in logs)
        total_cust = sum(getattr(l, 'customer_count', 0) or 0 for l in logs)
        lines.append(f"\nPERFORMANCE ({len(logs)} days logged):")
        lines.append(f"  Revenue: K{total_rev:,.0f} | Expenses: K{total_exp:,.0f} | Profit: K{total_rev-total_exp:,.0f}")
        lines.append(f"  Customers: {total_cust} | Avg daily: K{total_rev/len(logs):,.0f}")
        for log in logs[:3]:
            rev  = getattr(log, 'revenue_today',  0) or 0
            exp  = getattr(log, 'expenses_today', 0) or 0
            cust = getattr(log, 'customer_count', 0) or 0
            date = log.created_at.strftime('%d %b') if log.created_at else '—'
            prob = getattr(log, 'problem_today',   '') or ''
            win  = getattr(log, 'highlight_today', '') or ''
            lines.append(f"  {date}: K{rev:,.0f} rev | K{rev-exp:,.0f} profit | {cust} customers"
                         + (f" | Problem: {prob[:50]}" if prob else "")
                         + (f" | Win: {win[:50]}"     if win  else ""))

    if survey:
        fields = {
            'area_type': 'Area', 'foot_traffic': 'Traffic',
            'dominant_income_level': 'Income', 'competition_quality': 'Competition',
            'market_gaps_noted': 'Gaps', 'payment_preference': 'Payments',
        }
        notes = [f"{label}: {str(survey[f]).replace('_',' ')}"
                 for f, label in fields.items() if survey.get(f)]
        if notes:
            lines.append("\nMARKET: " + " | ".join(notes))

    return "\n".join(lines)


SYSTEM_BASE = """
You are KIP — the Kwacha Intelligence Platform — acting as dedicated advisor
for ONE specific Zambian business. Full context is provided above.

RULES:
1. Reference the actual business name and real numbers from the logs.
2. Be specific, actionable, Zambia-aware. Use ZMW always.
3. Keep answers concise — under 250 words unless a detailed plan is requested.
4. If the question is unrelated to this business, redirect politely.

PLAN UPDATES:
When the user suggests adding, changing, or pivoting something:
a) EVALUATE whether the change is net positive for this specific business.
b) State clearly: APPROVE or REJECT with a one-sentence reason.
c) If APPROVE: describe what will change and end your message with EXACTLY:
   __PLAN_UPDATE_PENDING__: [one-sentence summary of the change]
d) If REJECT: explain why and suggest an alternative.
e) Do NOT add __PLAN_UPDATE_PENDING__ unless you genuinely approve.
"""


# ── Schemas ───────────────────────────────────────────────────────────────────

class BusinessChatRequest(BaseModel):
    plan_id: int
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/history/{plan_id}")
def get_history(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _ensure_tables(db)
    rows = db.execute(sqlt(
        "SELECT id, role, content, is_plan_update_proposal, is_plan_update_applied, "
        "update_summary, created_at FROM business_chat_messages "
        "WHERE plan_id=:pid AND user_id=:uid ORDER BY created_at ASC"
    ), {"pid": plan_id, "uid": current_user.id}).fetchall()
    return [
        {
            "id":                      r[0],
            "role":                    r[1],
            "content":                 r[2],
            "is_plan_update_proposal": bool(r[3]),
            "is_plan_update_applied":  bool(r[4]),
            "update_summary":          r[5],
            "created_at":              str(r[6]),
        }
        for r in rows
    ]


@router.post("/chat")
async def business_chat(
    req: BusinessChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _ensure_tables(db)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503,
            detail="KIP AI is not available. Please contact support.")

    import anthropic

    # Verify plan ownership
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == req.plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    # Load context data
    idea = db.query(BusinessIdea).filter(
        BusinessIdea.id == plan.idea_id
    ).first() if plan.idea_id else None

    logs = db.query(DailyBusinessLog).filter(
        DailyBusinessLog.plan_id == req.plan_id
    ).order_by(DailyBusinessLog.created_at.desc()).limit(14).all()

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

    context = _build_context(plan, idea, logs, survey)
    system  = f"BUSINESS CONTEXT:\n{'='*60}\n{context}\n{'='*60}\n\n{SYSTEM_BASE}"

    # Load recent history
    hist = db.execute(sqlt(
        "SELECT role, content FROM business_chat_messages "
        "WHERE plan_id=:pid AND user_id=:uid "
        "ORDER BY created_at DESC LIMIT 20"
    ), {"pid": req.plan_id, "uid": current_user.id}).fetchall()
    messages = [{"role": r[0], "content": r[1]} for r in reversed(hist)]

    # Check for pending update
    pending = _get_pending(db, req.plan_id, current_user.id)

    if pending and _is_confirmation(req.message):
        reply = await _apply_update(plan, pending["summary"], current_user, db)
        _save_msg(db, req.plan_id, current_user.id, "user",      req.message)
        _save_msg(db, req.plan_id, current_user.id, "assistant", reply, applied=True)
        _resolve_pending(db, pending["msg_id"])
        return {"reply": reply, "plan_updated": True, "is_proposal": False, "plan_id": req.plan_id}

    if pending and _is_rejection(req.message):
        reply = f"Understood — the plan for **{plan.business_name}** stays as is. Let me know if you'd like to explore other ideas."
        _save_msg(db, req.plan_id, current_user.id, "user",      req.message)
        _save_msg(db, req.plan_id, current_user.id, "assistant", reply)
        _resolve_pending(db, pending["msg_id"])
        return {"reply": reply, "plan_updated": False, "is_proposal": False, "plan_id": req.plan_id}

    # Regular message
    messages.append({"role": "user", "content": req.message})

    client = anthropic.Anthropic(api_key=api_key)
    tools  = [{"type": "web_search_20250305", "name": "web_search"}]

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=1024,
            system=system, tools=tools, messages=messages
        )
    except Exception:
        # Fallback without web search
        try:
            response = client.messages.create(
                model="claude-sonnet-4-6", max_tokens=1024,
                system=system, messages=messages
            )
        except Exception as e:
            raise HTTPException(status_code=500,
                detail=f"KIP AI error: {str(e)}")

    reply = _extract_text(response)

    # Handle tool use loop
    if response.stop_reason == "tool_use" and not reply:
        tool_results = [
            {"type": "tool_result", "tool_use_id": b.id, "content": "Search completed."}
            for b in response.content
            if hasattr(b, 'type') and b.type == "tool_use"
        ]
        if tool_results:
            try:
                followup = client.messages.create(
                    model="claude-sonnet-4-6", max_tokens=1024,
                    system=system, tools=tools,
                    messages=messages + [
                        {"role": "assistant", "content": response.content},
                        {"role": "user",      "content": tool_results},
                    ]
                )
                reply = _extract_text(followup)
            except Exception:
                pass

    if not reply:
        reply = "I couldn't generate a response right now. Please try again."

    # Detect plan update proposal
    is_proposal    = "__PLAN_UPDATE_PENDING__" in reply
    clean_reply    = reply
    update_summary = None

    if is_proposal:
        match = re.search(r'__PLAN_UPDATE_PENDING__:\s*(.+)', reply)
        update_summary = match.group(1).strip() if match else "Proposed change"
        clean_reply = re.sub(r'\n?__PLAN_UPDATE_PENDING__:.*', '', reply).strip()
        clean_reply += (
            f"\n\n---\n"
            f"✅ Type **\"confirm\"** to apply this change to your plan, "
            f"or **\"cancel\"** to keep the current plan."
        )

    _save_msg(db, req.plan_id, current_user.id, "user",      req.message)
    _save_msg(db, req.plan_id, current_user.id, "assistant", clean_reply,
              proposal=is_proposal, update_summary=update_summary)

    return {
        "reply":          clean_reply,
        "plan_updated":   False,
        "is_proposal":    is_proposal,
        "update_summary": update_summary,
        "plan_id":        req.plan_id,
    }


@router.get("/suggestions/{plan_id}")
def get_suggestions(
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

    log_count = db.query(DailyBusinessLog).filter(
        DailyBusinessLog.plan_id == plan_id
    ).count()
    name = plan.business_name

    if log_count == 0:
        s = [
            f"What should I do in the first week of {name}?",
            "How do I find my first clients?",
            "What licences do I need before opening?",
            "How should I price my products?",
        ]
    elif log_count < 7:
        s = [
            "My expenses are higher than expected — what should I cut?",
            "How can I get more customers this week?",
            f"Should I add delivery as a service for {name}?",
            "Am I on track to hit my profit target?",
        ]
    else:
        s = [
            "Based on my logs, what is my biggest problem right now?",
            "I want to add a new product line — is that a good idea?",
            "When will I reach break-even at my current rate?",
            "Should I hire someone or keep operating alone?",
        ]

    return {"suggestions": s, "log_count": log_count}


@router.get("/plan-versions/{plan_id}")
def get_plan_versions(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _ensure_tables(db)
    rows = db.execute(sqlt(
        "SELECT version_num, change_summary, created_at "
        "FROM business_plan_versions "
        "WHERE plan_id=:pid AND user_id=:uid ORDER BY version_num DESC"
    ), {"pid": plan_id, "uid": current_user.id}).fetchall()
    return [{"version": r[0], "change": r[1], "at": str(r[2])} for r in rows]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_text(response) -> str:
    return "\n".join(
        b.text for b in response.content
        if hasattr(b, 'type') and b.type == 'text'
    ).strip()


def _save_msg(db, plan_id, user_id, role, content,
              proposal=False, applied=False, update_summary=None):
    db.execute(sqlt("""
        INSERT INTO business_chat_messages
            (plan_id, user_id, role, content,
             is_plan_update_proposal, is_plan_update_applied, update_summary)
        VALUES (:pid, :uid, :role, :content, :prop, :app, :summary)
    """), {
        "pid": plan_id, "uid": user_id, "role": role, "content": content,
        "prop": 1 if proposal else 0, "app": 1 if applied else 0,
        "summary": update_summary,
    })
    db.commit()


def _get_pending(db, plan_id: int, user_id: int):
    row = db.execute(sqlt("""
        SELECT id, update_summary FROM business_chat_messages
        WHERE plan_id=:pid AND user_id=:uid
          AND is_plan_update_proposal=1 AND pending_resolved=0
        ORDER BY created_at DESC LIMIT 1
    """), {"pid": plan_id, "uid": user_id}).fetchone()
    return {"msg_id": row[0], "summary": row[1] or "Proposed change"} if row else None


def _resolve_pending(db, msg_id: int):
    db.execute(sqlt(
        "UPDATE business_chat_messages SET pending_resolved=1 WHERE id=:mid"
    ), {"mid": msg_id})
    db.commit()


def _get_version_num(db, plan_id: int) -> int:
    row = db.execute(sqlt(
        "SELECT COUNT(*) FROM business_plan_versions WHERE plan_id=:pid"
    ), {"pid": plan_id}).scalar()
    return (row or 0) + 1


async def _apply_update(plan, change_summary: str, user, db) -> str:
    import anthropic as _ant, os as _os

    # Save old version
    version_num = _get_version_num(db, plan.id)
    db.execute(sqlt("""
        INSERT INTO business_plan_versions
            (plan_id, user_id, version_num, plan_json_old, change_summary)
        VALUES (:pid, :uid, :vn, :old, :summary)
    """), {
        "pid": plan.id, "uid": user.id, "vn": version_num,
        "old": plan.plan_json or "", "summary": change_summary,
    })
    db.commit()

    current_plan = ""
    if plan.plan_json:
        try:
            parsed = json.loads(plan.plan_json)
            current_plan = parsed.get("launch_plan", "")
        except Exception:
            current_plan = str(plan.plan_json)

    api_key = _os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Plan update could not be applied — API key not configured."

    client = _ant.Anthropic(api_key=api_key)
    try:
        r = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=2000,
            messages=[{"role": "user", "content":
                f"Update this business plan for '{plan.business_name}' in Zambia.\n\n"
                f"APPROVED CHANGE: {change_summary}\n\n"
                f"CURRENT PLAN:\n{current_plan[:2000]}\n\n"
                f"Rewrite the plan incorporating this change. Use ZMW. Be practical."
            }]
        )
        new_text = r.content[0].text
        plan.plan_json = json.dumps({
            "launch_plan":  new_text,
            "updated_at":   datetime.utcnow().isoformat(),
            "last_change":  change_summary,
            "version":      version_num,
        })
        db.commit()
        return (
            f"✅ **Plan updated successfully.**\n\n"
            f"**Change applied:** {change_summary}\n\n"
            f"Your launch plan for **{plan.business_name}** has been revised. "
            f"View the updated plan in the **Launch Plan** tab. "
            f"The previous version has been saved."
        )
    except Exception as e:
        return f"I approved the change but could not apply it automatically: {e}"
