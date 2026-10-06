"""
KIP Templates Routes: template library, business plan PDF and letter generation.
"""
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.business_dashboard import BusinessLaunchPlan
from app.models.business_idea import BusinessIdea
from app.services.business_plan_generator import generate_business_plan_pdf

router = APIRouter()

# ── Template library ──────────────────────────────────────────────────────────

TEMPLATES = [
    {"id":"pacra-form1","category":"forms","tab":"Forms","title":"PACRA Form 1 — Name Clearance","description":"Application to clear and reserve your company name before registration.","institution":"PACRA","type":"link","url":"https://pacra.org.zm/fees-and-forms","tags":["company","registration","name"],"color":"#1B6EF3"},
    {"id":"pacra-form3","category":"forms","tab":"Forms","title":"PACRA Form 3 — Company Registration","description":"Articles and Memorandum of Association for a private limited company.","institution":"PACRA","type":"link","url":"https://pacra.org.zm/fees-and-forms","tags":["company","registration"],"color":"#1B6EF3"},
    {"id":"zra-tpn","category":"forms","tab":"Forms","title":"ZRA — Taxpayer Registration (TPIN)","description":"Register for a TPIN with Zambia Revenue Authority. Required for all businesses.","institution":"ZRA","type":"link","url":"https://portal.zra.org.zm/login","tags":["tax","tpin","zra"],"color":"#00D4B1"},
    {"id":"ceec-application","category":"forms","tab":"Forms","title":"CEEC — SME Funding Application","description":"Apply for citizen economic empowerment funding (K5,000–K500,000).","institution":"CEEC","type":"link",
     "url":"https://www.bing.com/ck/a?!&&p=b4462e995c08239c801a4a89e7ba47a23bff94bd33c12cb9c1b7baa83c5938b6JmltdHM9MTc3ODk3NjAwMA&ptn=3&ver=2&hsh=4&fclid=26ed4dd7-c441-6109-069a-5af0c56a60a1&psq=ceec+forms&u=a1aHR0cHM6Ly93d3cuY2VlYy5vcmcuem0vd3AtY29udGVudC91cGxvYWRzLzIwMjUvMDQvQ0VFQy1QUC1BcHBsaWNhdGlvbi1Gb3JtLmRvY3g","tags":["funding","loan","ceec"],"color":"#F5A623"},
    {"id":"cdf-application","category":"forms","tab":"Forms","title":"CDF — Business Grant Application","description":"Apply for Constituency Development Fund support through your local MP's office.","institution":"CDF","type":"link","url":"https://cdf.gov.zm","tags":["funding","cdf","grant"],"color":"#00E676"},
    {"id":"dbz-sme","category":"forms","tab":"Forms","title":"DBZ — SME Loan Application","description":"Development Bank of Zambia SME lending at concessional rates from K20,000.","institution":"DBZ","type":"link",
     "url":"https://www.bing.com/ck/a?!&&p=3b23b58ca7bde6378414b8e2647bfd452fd50393cc3c52034404b76752f0793cJmltdHM9MTc3ODk3NjAwMA&ptn=3&ver=2&hsh=4&fclid=26ed4dd7-c441-6109-069a-5af0c56a60a1&psq=development+bank+of+zambia+website&u=a1aHR0cHM6Ly93d3cuZmFjZWJvb2suY29tL2RldmVsb3BtZW50YmFua29memFtYmlhLw","tags":["loan","bank","dbz"],"color":"#F5A623"},
    {"id":"letter-intro","category":"letters","tab":"Letters","title":"Business Introduction Letter","description":"Professional letter introducing your business to potential clients or partners.","type":"generate","tags":["letter","introduction"],"color":"#4B9EFF","prompt_type":"introduction_letter"},
    {"id":"letter-loan","category":"letters","tab":"Letters","title":"Loan / Funding Request Letter","description":"Formal letter requesting funding from a bank, CDF, or CEEC.","type":"generate","tags":["loan","funding","letter"],"color":"#F5A623","prompt_type":"loan_request_letter"},
    {"id":"letter-supplier","category":"letters","tab":"Letters","title":"Supplier Credit Request Letter","description":"Request credit terms or introduce your business to a supplier.","type":"generate","tags":["supplier","credit"],"color":"#00D4B1","prompt_type":"supplier_letter"},
    {"id":"letter-council","category":"letters","tab":"Letters","title":"Local Authority / Council Letter","description":"Letter to city council or local authority for business permits.","type":"generate","tags":["council","permit"],"color":"#00E676","prompt_type":"council_letter"},
    {"id":"bizplan-full","category":"business_plans","tab":"Business Plans","title":"Full Business Plan (Bank/CDF Ready)","description":"8-section professional business plan with financial projections. Suitable for bank loans, CDF, CEEC, and DBZ applications.","type":"generate_plan","tags":["business plan","bank","cdf"],"color":"#F5A623"},
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
        "templates":  TEMPLATES,
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

    log_summary = None
    try:
        from app.models.business_dashboard import DailyBusinessLog
        logs = db.query(DailyBusinessLog).filter(DailyBusinessLog.plan_id == plan_id).all()
        if logs:
            total_rev  = sum(getattr(l, 'revenue_today',  0) or 0 for l in logs)
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

    capital      = (idea.capital_amount if idea else None) or getattr(plan, 'capital_amount', None)
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
            log_summary=log_summary,
            projected_profit=plan.projected_monthly_profit,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    filename = f"KIP_BusinessPlan_{plan.business_name.replace(' ', '_')}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ── Letter generation ─────────────────────────────────────────────────────────

class LetterRequest(BaseModel):
    prompt_type: str
    plan_id:     Optional[int]   = None
    recipient:   Optional[str]   = None
    amount:      Optional[str]   = None
    notes:       Optional[str]   = None


@router.post("/generate-letter")
async def generate_letter(
    req: LetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import anthropic as _anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
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
        "introduction_letter": f"Write a professional business introduction letter for {business_name}, owned by {current_user.full_name}, based in {location}, Zambia. Addressed to {req.recipient or 'potential clients/partners'}. Context: {req.notes or 'None'}. Format as a proper business letter.",
        "loan_request_letter": f"Write a formal loan/funding request letter for {business_name}, owned by {current_user.full_name}, based in {location}, Zambia. Addressed to {req.recipient or 'The Loans Officer'}. Amount: {req.amount or 'to be confirmed'}. Context: {req.notes or 'None'}. Include purpose, repayment plan, and viability statement.",
        "supplier_letter":     f"Write a supplier credit terms request for {business_name}, owned by {current_user.full_name}, {location}, Zambia. Addressed to {req.recipient or 'The Sales Manager'}. Context: {req.notes or 'None'}.",
        "council_letter":      f"Write a formal letter to the local authority from {business_name}, owned by {current_user.full_name}, {location}, Zambia. Purpose: {req.notes or 'application for business operating permit'}.",
    }

    client = _anthropic.Anthropic(api_key=api_key)
    try:
        r = client.messages.create(model="claude-sonnet-4-6", max_tokens=800,
            messages=[{"role": "user", "content": prompts.get(req.prompt_type, prompts["introduction_letter"])}])
        return {"letter_text": r.content[0].text, "business_name": business_name,
                "owner_name": current_user.full_name, "generated_at": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
