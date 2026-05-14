"""
KIP Templates & Survey Routes — Sprint 8
Survey data is now saved to:
  1. SQLite database (for fast querying)
  2. /backend/data/surveys/{town_slug}.json (for manual access & reuse)

Each town JSON file aggregates ALL submissions for that town over time,
with timestamps so you can track how data changes.
"""
import json
import os
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.business_dashboard import BusinessLaunchPlan
from app.models.business_idea import BusinessIdea
from app.services.business_plan_generator import generate_business_plan_pdf

router = APIRouter()

# ── Survey data directory ─────────────────────────────────────────────────────
SURVEY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'surveys')
os.makedirs(SURVEY_DIR, exist_ok=True)


def _town_slug(location: str) -> str:
    """Convert location string to a safe filename slug."""
    slug = location.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '_', slug)
    slug = re.sub(r'-+', '_', slug)
    return slug[:60] or 'unknown'


def _save_to_json(location: str, data: dict, submission_type: str):
    """
    Save survey data to a per-town JSON file.
    Structure:
    {
      "town": "Riverside, Kitwe",
      "slug": "riverside_kitwe",
      "submissions": [
        {
          "type": "market_survey" | "general_survey",
          "submitted_at": "...",
          "data": {...}
        }
      ],
      "aggregated": {
        "total_submissions": N,
        "last_updated": "...",
        "avg_tomato_price": ...,
        "business_count_food": ...,
        ...
      }
    }
    """
    slug = _town_slug(location)
    filepath = os.path.join(SURVEY_DIR, f"{slug}.json")

    # Load existing file or create new
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            town_data = json.load(f)
    else:
        town_data = {
            "town": location,
            "slug": slug,
            "created_at": datetime.utcnow().isoformat(),
            "submissions": [],
            "aggregated": {}
        }

    # Add this submission
    town_data["submissions"].append({
        "type": submission_type,
        "submitted_at": datetime.utcnow().isoformat(),
        "user_hash": str(hash(data.get('user_id', 0)))[:8],  # anonymised
        "data": {k: v for k, v in data.items() if k not in ('user_id',)}
    })

    # Update aggregates
    town_data["aggregated"] = _compute_aggregates(town_data["submissions"])
    town_data["last_updated"] = datetime.utcnow().isoformat()

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(town_data, f, indent=2, ensure_ascii=False, default=str)

    print(f"[Survey] Saved to {filepath}")
    return filepath


def _compute_aggregates(submissions: list) -> dict:
    """Compute running aggregates from all submissions for a town."""
    agg = {
        "total_submissions": len(submissions),
        "market_surveys":    sum(1 for s in submissions if s.get("type") == "market_survey"),
        "general_surveys":   sum(1 for s in submissions if s.get("type") == "general_survey"),
    }

    # Numeric fields to average
    numeric_fields = [
        "avg_tomato_price_per_kg", "avg_bread_price", "avg_phone_data_1gb",
        "avg_shop_rent_pm", "avg_labor_wage_pm",
        "food_businesses_count", "retail_count", "services_count",
        "direct_competitors_count", "avg_spend_per_visit",
    ]

    for field in numeric_fields:
        values = [
            float(s["data"][field])
            for s in submissions
            if s.get("data", {}).get(field) not in (None, "", 0)
        ]
        if values:
            agg[f"avg_{field}"] = round(sum(values) / len(values), 2)
            agg[f"responses_{field}"] = len(values)

    # Mode fields (most common answer)
    mode_fields = [
        "area_type", "foot_traffic", "dominant_income_level",
        "competition_quality", "power_reliability", "payment_preference",
        "primary_employment", "internet_access", "security_level",
    ]
    for field in mode_fields:
        values = [s["data"][field] for s in submissions if s.get("data", {}).get(field)]
        if values:
            agg[f"most_common_{field}"] = max(set(values), key=values.count)

    # Collect all market gaps mentioned
    gaps = []
    for s in submissions:
        gap = s.get("data", {}).get("market_gaps_noted") or s.get("data", {}).get("missing_services")
        if gap:
            gaps.append(gap)
    if gaps:
        agg["market_gaps_mentioned"] = gaps

    return agg


# ── Template library ──────────────────────────────────────────────────────────

TEMPLATES = [
    {
        "id": "pacra-form1", "category": "forms", "tab": "Forms",
        "title": "PACRA Form 1 — Name Clearance",
        "description": "Application to clear and reserve your company name before registration.",
        "institution": "PACRA", "type": "link",
        "url": "https://www.pacra.org.zm/forms",
        "tags": ["company", "registration", "name"], "color": "#1B6EF3",
    },
    {
        "id": "pacra-form3", "category": "forms", "tab": "Forms",
        "title": "PACRA Form 3 — Company Registration",
        "description": "Articles and Memorandum of Association for a private limited company.",
        "institution": "PACRA", "type": "link",
        "url": "https://www.pacra.org.zm/forms",
        "tags": ["company", "registration"], "color": "#1B6EF3",
    },
    {
        "id": "zra-tpn", "category": "forms", "tab": "Forms",
        "title": "ZRA — Taxpayer Registration (TPIN)",
        "description": "Register for a TPIN with Zambia Revenue Authority. Required for all businesses.",
        "institution": "ZRA", "type": "link",
        "url": "https://www.zra.org.zm",
        "tags": ["tax", "tpin", "zra"], "color": "#00D4B1",
    },
    {
        "id": "ceec-application", "category": "forms", "tab": "Forms",
        "title": "CEEC — SME Funding Application",
        "description": "Apply for citizen economic empowerment funding (K5,000–K500,000).",
        "institution": "CEEC", "type": "link",
        "url": "https://www.ceec.org.zm",
        "tags": ["funding", "loan", "ceec"], "color": "#F5A623",
    },
    {
        "id": "cdf-application", "category": "forms", "tab": "Forms",
        "title": "CDF — Kitwe Council",
        "description": "Apply for Constituency Development Fund support through your local MP's office.",
        "institution": "CDF", "type": "link",
        "url": "https://www.kitwecouncil.gov.zm/?page_id=1759",
        "tags": ["funding", "cdf", "grant"], "color": "#00E676",
    },
    {
        "id": "dbz-sme", "category": "forms", "tab": "Forms",
        "title": "DBZ — SME Loan Application",
        "description": "Development Bank of Zambia SME lending at concessional rates from K20,000.",
        "institution": "DBZ", "type": "link",
        "url": "https://www.dbz.co.zm",
        "tags": ["loan", "bank", "dbz"], "color": "#F5A623",
    },
    {
        "id": "letter-intro", "category": "letters", "tab": "Letters",
        "title": "Business Introduction Letter",
        "description": "Professional letter introducing your business to potential clients or partners.",
        "type": "generate", "tags": ["letter", "introduction"],
        "color": "#4B9EFF", "prompt_type": "introduction_letter",
    },
    {
        "id": "letter-loan", "category": "letters", "tab": "Letters",
        "title": "Loan / Funding Request Letter",
        "description": "Formal letter requesting funding from a bank, CDF, or CEEC.",
        "type": "generate", "tags": ["loan", "funding", "letter"],
        "color": "#F5A623", "prompt_type": "loan_request_letter",
    },
    {
        "id": "letter-supplier", "category": "letters", "tab": "Letters",
        "title": "Supplier Credit Request Letter",
        "description": "Request credit terms or introduce your business to a supplier.",
        "type": "generate", "tags": ["supplier", "credit"],
        "color": "#00D4B1", "prompt_type": "supplier_letter",
    },
    {
        "id": "letter-council", "category": "letters", "tab": "Letters",
        "title": "Local Authority / Council Letter",
        "description": "Letter to city council or local authority for business permits.",
        "type": "generate", "tags": ["council", "permit"],
        "color": "#00E676", "prompt_type": "council_letter",
    },
    {
        "id": "bizplan-full", "category": "business_plans", "tab": "Business Plans",
        "title": "Full Business Plan (Bank/CDF Ready)",
        "description": "8-section professional business plan with financial projections. Suitable for bank loans, CDF, CEEC, and DBZ applications.",
        "type": "generate_plan", "tags": ["business plan", "bank", "cdf"],
        "color": "#F5A623",
    },
]


@router.get("/list")
def get_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plans = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.user_id == current_user.id
    ).order_by(BusinessLaunchPlan.created_at.desc()).all()
    return {
        "templates": TEMPLATES,
        "user_plans": [{"id": p.id, "name": p.business_name, "status": p.status} for p in plans],
    }


# ── Business Plan PDF ─────────────────────────────────────────────────────────

@router.post("/generate-plan/{plan_id}")
async def generate_plan_pdf(
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

    idea = db.query(BusinessIdea).filter(BusinessIdea.id == plan.idea_id).first()
    plan_json_text = ""
    if plan.plan_json:
        try:
            parsed = json.loads(plan.plan_json)
            plan_json_text = parsed.get("launch_plan", "")
        except Exception:
            plan_json_text = str(plan.plan_json)

    survey_data = None
    try:
        from app.models.enhanced_logs import MarketSurvey
        survey = db.query(MarketSurvey).filter(
            MarketSurvey.user_id == current_user.id,
            MarketSurvey.plan_id == plan_id
        ).first()
        if survey:
            survey_data = {c.name: getattr(survey, c.name) for c in survey.__table__.columns if getattr(survey, c.name) is not None}
    except Exception:
        pass

    log_summary = None
    try:
        from app.models.business_dashboard import DailyBusinessLog
        logs = db.query(DailyBusinessLog).filter(DailyBusinessLog.plan_id == plan_id).all()
        if logs:
            total_rev  = sum(getattr(l, 'revenue_today', 0) or 0 for l in logs)
            total_exp  = sum(getattr(l, 'expenses_today', 0) or 0 for l in logs)
            total_cust = sum(getattr(l, 'customer_count', 0) or 0 for l in logs)
            log_summary = {
                "days_logged": len(logs), "total_revenue": total_rev,
                "total_expenses": total_exp, "net_profit": total_rev - total_exp,
                "total_customers": total_cust,
                "avg_daily_revenue": round(total_rev / len(logs), 2) if logs else 0,
            }
    except Exception:
        pass

    capital = (idea.capital_amount if idea else None) or getattr(plan, 'capital_amount', None)
    idea_summary = ""
    if idea:
        idea_summary = idea.idea_summary or idea.full_response or ""

    try:
        pdf_bytes = await generate_business_plan_pdf(
            plan_id=plan_id,
            business_name=plan.business_name,
            owner_name=current_user.full_name,
            location=getattr(plan, 'location', '') or (idea.location if idea else 'Zambia'),
            capital=capital,
            idea_summary=idea_summary[:1000],
            plan_json_text=plan_json_text,
            survey_data=survey_data,
            log_summary=log_summary,
            projected_profit=plan.projected_monthly_profit,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    filename = f"KIP_BusinessPlan_{plan.business_name.replace(' ', '_')}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ── Letter Generation ─────────────────────────────────────────────────────────

class LetterRequest(BaseModel):
    prompt_type: str
    plan_id:     Optional[int] = None
    recipient:   Optional[str] = None
    amount:      Optional[str] = None
    notes:       Optional[str] = None


@router.post("/generate-letter")
async def generate_letter(
    req: LetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import os as _os, anthropic
    api_key = _os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="API key not configured.")

    business_name = "My Business"; location = "Zambia"
    if req.plan_id:
        plan = db.query(BusinessLaunchPlan).filter(
            BusinessLaunchPlan.id == req.plan_id,
            BusinessLaunchPlan.user_id == current_user.id
        ).first()
        if plan:
            business_name = plan.business_name
            location = getattr(plan, 'location', 'Zambia') or 'Zambia'

    prompts = {
        "introduction_letter":
            f"Write a professional business introduction letter for {business_name}, "
            f"owned by {current_user.full_name}, based in {location}, Zambia. "
            f"Addressed to {req.recipient or 'potential clients/partners'}. "
            f"Context: {req.notes or 'None'}. Format as a proper business letter.",
        "loan_request_letter":
            f"Write a formal loan/funding request letter for {business_name}, "
            f"owned by {current_user.full_name}, based in {location}, Zambia. "
            f"Addressed to {req.recipient or 'The Loans Officer'}. "
            f"Amount: {req.amount or 'to be confirmed'}. Context: {req.notes or 'None'}. "
            f"Include purpose, repayment plan, and viability statement.",
        "supplier_letter":
            f"Write a supplier credit terms request for {business_name}, "
            f"owned by {current_user.full_name}, {location}, Zambia. "
            f"Addressed to {req.recipient or 'The Sales Manager'}. Context: {req.notes or 'None'}.",
        "council_letter":
            f"Write a formal letter to the local authority from {business_name}, "
            f"owned by {current_user.full_name}, {location}, Zambia. "
            f"Purpose: {req.notes or 'application for business operating permit'}.",
    }

    client = anthropic.Anthropic(api_key=api_key)
    try:
        r = client.messages.create(model="claude-sonnet-4-6", max_tokens=800,
            messages=[{"role": "user", "content": prompts.get(req.prompt_type, prompts["introduction_letter"])}])
        return {"letter_text": r.content[0].text, "business_name": business_name,
                "owner_name": current_user.full_name, "generated_at": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── General Survey (Community Intelligence) ───────────────────────────────────

class GeneralSurveyRequest(BaseModel):
    location:                str
    area_type:               Optional[str]   = None
    food_businesses_count:   Optional[int]   = None
    retail_count:            Optional[int]   = None
    services_count:          Optional[int]   = None
    manufacturing_count:     Optional[int]   = None
    missing_services:        Optional[str]   = None
    oversaturated_sectors:   Optional[str]   = None
    power_reliability:       Optional[str]   = None
    internet_access:         Optional[str]   = None
    road_quality:            Optional[str]   = None
    dominant_income_level:   Optional[str]   = None
    primary_employment:      Optional[str]   = None
    market_days:             Optional[str]   = None
    avg_tomato_price_per_kg: Optional[float] = None
    avg_bread_price:         Optional[float] = None
    avg_phone_data_1gb:      Optional[float] = None
    avg_shop_rent_pm:        Optional[float] = None
    avg_labor_wage_pm:       Optional[float] = None
    seasonal_notes:          Optional[str]   = None
    other_observations:      Optional[str]   = None


@router.post("/general-survey")
async def submit_general_survey(
    req: GeneralSurveyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit community market intelligence.
    Saved to:
      1. SQLite general_surveys table
      2. backend/data/surveys/{town}.json
    """
    from sqlalchemy import text

    data = req.dict()
    data['user_id'] = current_user.id
    data['submitted_at'] = datetime.utcnow().isoformat()

    # ── Save to database ──
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS general_surveys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER, location TEXT,
                data_json TEXT, submitted_at TEXT,
                UNIQUE(user_id, location)
            )
        """))
        db.execute(text("""
            INSERT INTO general_surveys (user_id, location, data_json, submitted_at)
            VALUES (:uid, :loc, :dj, :sa)
            ON CONFLICT(user_id, location) DO UPDATE SET
                data_json=excluded.data_json, submitted_at=excluded.submitted_at
        """), {"uid": current_user.id, "loc": req.location,
               "dj": json.dumps(data), "sa": data['submitted_at']})
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Survey] DB error: {e}")

    # ── Save to JSON file ──
    try:
        filepath = _save_to_json(req.location, data, "general_survey")
        json_saved = True
    except Exception as e:
        print(f"[Survey] JSON save error: {e}")
        json_saved = False

    return {
        "status": "saved",
        "location": req.location,
        "json_file": f"data/surveys/{_town_slug(req.location)}.json" if json_saved else None,
        "message": "Thank you! This improves KIP's recommendations for all entrepreneurs in your area.",
    }


@router.get("/general-survey")
def get_my_general_surveys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy import text
    try:
        rows = db.execute(text(
            "SELECT location, data_json, submitted_at FROM general_surveys "
            "WHERE user_id=:uid ORDER BY submitted_at DESC"
        ), {"uid": current_user.id}).fetchall()
        return [{"location": r[0], "submitted_at": r[2], **json.loads(r[1])} for r in rows]
    except Exception:
        return []


# ── Admin: list all town survey files ────────────────────────────────────────

@router.get("/admin/towns")
def list_town_surveys(
    current_user: User = Depends(get_current_user),
):
    """List all town JSON survey files available."""
    if not os.path.exists(SURVEY_DIR):
        return []
    files = []
    for f in sorted(os.listdir(SURVEY_DIR)):
        if f.endswith('.json'):
            fp = os.path.join(SURVEY_DIR, f)
            try:
                with open(fp) as fh:
                    d = json.load(fh)
                files.append({
                    "filename": f,
                    "town": d.get("town", f),
                    "total_submissions": d.get("aggregated", {}).get("total_submissions", 0),
                    "last_updated": d.get("last_updated"),
                    "size_kb": round(os.path.getsize(fp) / 1024, 1),
                })
            except Exception:
                pass
    return files


@router.get("/admin/towns/{slug}")
def get_town_survey(
    slug: str,
    current_user: User = Depends(get_current_user),
):
    """Return the full JSON data for a specific town."""
    filepath = os.path.join(SURVEY_DIR, f"{slug}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Town survey not found.")
    with open(filepath) as f:
        return json.load(f)
