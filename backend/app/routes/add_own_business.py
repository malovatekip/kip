"""
KIP — Add Your Own Business
Users with an existing business can add it directly.
KIP analyses it and generates a growth-focused plan (not a startup plan).
"""
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.business_idea import BusinessIdea
from app.models.business_dashboard import BusinessLaunchPlan

router = APIRouter()

TENURE_LABELS = {
    "just_started":  "just started (under 1 month)",
    "1_6_months":    "1–6 months old",
    "6_12_months":   "6–12 months old",
    "1_3_years":     "1–3 years old",
    "3_plus_years":  "over 3 years old",
}


class AddOwnBusinessRequest(BaseModel):
    business_name:     str
    description:       str
    location:          Optional[str] = None
    tenure:            str = "just_started"   # key from TENURE_LABELS
    monthly_revenue:   Optional[float] = None  # approximate ZMW
    main_challenge:    Optional[str] = None
    capital_invested:  Optional[float] = None

    @field_validator('monthly_revenue', 'capital_invested', mode='before')
    @classmethod
    def coerce_float(cls, v):
        if v is None or v == '':
            return None
        try:
            return float(str(v))
        except (TypeError, ValueError):
            return None


@router.post("/add-own")
async def add_own_business(
    req: AddOwnBusinessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add an existing business to KIP.
    KIP generates a growth analysis and improvement plan.
    No accept/decline step — goes straight to dashboard.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    tenure_str = TENURE_LABELS.get(req.tenure, req.tenure)

    # ── Generate KIP analysis ──────────────────────────────────────────────
    analysis_text = await _generate_growth_analysis(
        business_name=req.business_name,
        description=req.description,
        location=req.location or "Zambia",
        tenure=tenure_str,
        monthly_revenue=req.monthly_revenue,
        main_challenge=req.main_challenge,
        capital_invested=req.capital_invested,
        owner_name=current_user.full_name,
        api_key=api_key,
    )

    # ── Save as BusinessIdea (marked as user-added, not KIP-generated) ────
    summary = analysis_text[:500] + "..." if len(analysis_text) > 500 else analysis_text

    idea = BusinessIdea(
        user_id=current_user.id,
        idea_name=req.business_name,
        idea_summary=summary,
        full_response=analysis_text,
        location=req.location or "",
        capital_amount=req.capital_invested,
        generated_by_kip=False,   # user-added
        accepted=True,             # pre-accepted — no review step
    )
    db.add(idea)
    db.flush()

    # ── Create launch plan immediately ────────────────────────────────────
    plan_json_value = json.dumps({
        "launch_plan":  analysis_text,
        "generated_at": datetime.utcnow().isoformat(),
        "version":      "1.0",
        "type":         "growth_plan",   # distinguishes from startup plans
    })

    plan = BusinessLaunchPlan(
        user_id=current_user.id,
        idea_id=idea.id,
        business_name=req.business_name,
        location=req.location or "",
        capital_amount=req.capital_invested,
        plan_json=plan_json_value,
        status="active",
        is_profitable=False,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return {
        "idea_id":       idea.id,
        "plan_id":       plan.id,
        "business_name": req.business_name,
        "analysis":      analysis_text,
        "message":       "Business added! Your KIP growth plan is ready.",
    }


async def _generate_growth_analysis(
    business_name, description, location, tenure,
    monthly_revenue, main_challenge, capital_invested,
    owner_name, api_key
) -> str:
    """
    Generate a growth-focused business analysis.
    KIP acknowledges the business already exists and focuses on improvement.
    """
    if not api_key:
        return _fallback_plan(business_name, description, location, tenure)

    import anthropic

    rev_str = f"K{monthly_revenue:,.0f}/month" if monthly_revenue else "not specified"
    cap_str = f"K{capital_invested:,.0f}" if capital_invested else "not specified"

    prompt = f"""You are KIP — the Kwacha Intelligence Platform. A Zambian entrepreneur has 
added their existing business to KIP. They need a growth analysis and improvement plan, 
NOT a startup plan.

BUSINESS DETAILS:
- Business: {business_name}
- Description: {description}
- Location: {location}
- How long running: {tenure}
- Current monthly revenue: {rev_str}
- Capital invested: {cap_str}
- Main challenge: {main_challenge or "not specified"}
- Owner: {owner_name}

Generate a professional growth plan with these sections:

## 📊 BUSINESS ASSESSMENT
[2 paragraphs: honest assessment of where this business is, what's working, 
what the numbers suggest about its health. Reference the revenue and tenure.]

## 🔍 KIP'S KEY OBSERVATIONS
[3–4 specific observations about this business type in the Zambian context. 
What are the typical opportunities and risks for this kind of business?]

## 🚀 GROWTH PRIORITIES (Next 90 Days)
[5 specific, actionable items numbered 1–5. Each should be concrete and achievable.]

## 💰 REVENUE OPTIMISATION
[2 paragraphs: specific suggestions to increase revenue or profit margin 
for this type of business in this location.]

## ⚠️ RISKS TO WATCH
[3 bullet points: specific risks relevant to this business and Zambian context.]

## 📋 COMPLIANCE CHECK
[Any licences, registrations, or ZRA requirements relevant to this business type.]

Use ZMW for all amounts. Be specific to Zambia. Reference the actual details provided.
This business already exists — focus on growth and improvement, not how to start."""

    client = anthropic.Anthropic(api_key=api_key)
    try:
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return r.content[0].text
    except Exception as e:
        return _fallback_plan(business_name, description, location, tenure)


def _fallback_plan(business_name, description, location, tenure) -> str:
    return f"""## 📊 BUSINESS ASSESSMENT

**{business_name}** is a {tenure} business based in {location or 'Zambia'}.
{description}

Your business has been added to KIP. Connect your Anthropic API key to receive 
a full AI-powered growth analysis and improvement plan.

## 🚀 GROWTH PRIORITIES (Next 90 Days)

1. Set up your daily logging to track revenue, expenses, and customers
2. Complete the market survey for your area to improve KIP's recommendations
3. Review your pricing strategy against local competitors
4. Identify your top 3 customers and focus on retaining them
5. Register with PACRA and ZRA if not already done

## 📋 COMPLIANCE CHECK

Ensure your business is registered with PACRA and your ZRA TPIN is active.
Contact your local council for any operating licences required."""
