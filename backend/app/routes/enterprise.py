"""
KIP Enterprise Routes — Sprint 13
Endpoints for enterprise creation, branch management,
consolidated dashboard, and branch notifications.
"""
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.enterprise_models import (
    EnterpriseBusiness, EnterpriseBranch, BranchNotification
)
from app.models.business_dashboard import BusinessLaunchPlan, DailyBusinessLog

router = APIRouter()

def _require_premium(user: User):
    """KIP is free right now — multi-branch enterprise is open to everyone.
    Kept as a no-op call site so re-introducing a paid tier later is a
    one-line change here instead of touching every call site again."""
    pass


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateEnterpriseRequest(BaseModel):
    name:          str
    description:   Optional[str] = None
    industry:      Optional[str] = None
    headquarters:  Optional[str] = None


class AddBranchRequest(BaseModel):
    enterprise_id:  int
    branch_name:    str
    location:       Optional[str] = None
    specialty:      Optional[str] = None
    manager_email:  str
    monthly_target: Optional[float] = None


class UpdateBranchTargetRequest(BaseModel):
    branch_id:      int
    monthly_target: float


# ── Enterprise CRUD ───────────────────────────────────────────────────────────

@router.post("/create")
async def create_enterprise(
    req: CreateEnterpriseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new enterprise. Premium only."""
    # _require_premium(current_user)

    enterprise = EnterpriseBusiness(
        owner_user_id=current_user.id,
        name=req.name,
        description=req.description,
        industry=req.industry,
        headquarters=req.headquarters,
    )
    db.add(enterprise)
    db.commit()
    db.refresh(enterprise)

    return {
        "id":          enterprise.id,
        "name":        enterprise.name,
        "description": enterprise.description,
        "created_at":  enterprise.created_at.isoformat(),
    }


@router.get("/my-enterprises")
def get_my_enterprises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all enterprises owned by this user."""
    enterprises = db.query(EnterpriseBusiness).filter(
        EnterpriseBusiness.owner_user_id == current_user.id,
        EnterpriseBusiness.is_active == True
    ).order_by(EnterpriseBusiness.created_at.desc()).all()

    result = []
    for e in enterprises:
        branches = db.query(EnterpriseBranch).filter(
            EnterpriseBranch.enterprise_id == e.id,
            EnterpriseBranch.is_active == True
        ).all()
        result.append({
            "id":           e.id,
            "name":         e.name,
            "description":  e.description,
            "industry":     e.industry,
            "headquarters": e.headquarters,
            "branch_count": len(branches),
            "created_at":   e.created_at.isoformat() if e.created_at else None,
        })
    return result


@router.get("/enterprise/{enterprise_id}")
def get_enterprise(
    enterprise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get enterprise details — owner only."""
    enterprise = db.query(EnterpriseBusiness).filter(
        EnterpriseBusiness.id == enterprise_id,
        EnterpriseBusiness.owner_user_id == current_user.id
    ).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found.")

    branches = db.query(EnterpriseBranch).filter(
        EnterpriseBranch.enterprise_id == enterprise_id,
        EnterpriseBranch.is_active == True
    ).all()

    branch_data = []
    for b in branches:
        manager = db.query(User).filter(User.id == b.branch_manager_user_id).first()
        plan    = db.query(BusinessLaunchPlan).filter(BusinessLaunchPlan.id == b.plan_id).first()

        # Get latest 7 logs for this branch
        logs = []
        if plan:
            logs_raw = db.query(DailyBusinessLog).filter(
                DailyBusinessLog.plan_id == b.plan_id
            ).order_by(DailyBusinessLog.created_at.desc()).limit(7).all()
            logs = [
                {
                    "revenue":   getattr(l, 'revenue_today',  0) or 0,
                    "expenses":  getattr(l, 'expenses_today', 0) or 0,
                    "customers": getattr(l, 'customer_count', 0) or 0,
                    "created_at":l.created_at.isoformat() if l.created_at else None,
                }
                for l in logs_raw
            ]

        total_rev  = sum(l['revenue']  for l in logs)
        total_exp  = sum(l['expenses'] for l in logs)
        total_cust = sum(l['customers']for l in logs)

        branch_data.append({
            "id":             b.id,
            "branch_name":    b.branch_name,
            "location":       b.location,
            "specialty":      b.specialty,
            "manager_email":  b.manager_email,
            "manager_name":   manager.full_name if manager else None,
            "plan_id":        b.plan_id,
            "monthly_target": b.monthly_target,
            "days_logged":    len(logs),
            "revenue_7d":     round(total_rev,  2),
            "expenses_7d":    round(total_exp,  2),
            "profit_7d":      round(total_rev - total_exp, 2),
            "customers_7d":   total_cust,
            "logs":           list(reversed(logs)),  # oldest first for charts
        })

    return {
        "id":           enterprise.id,
        "name":         enterprise.name,
        "description":  enterprise.description,
        "industry":     enterprise.industry,
        "headquarters": enterprise.headquarters,
        "created_at":   enterprise.created_at.isoformat() if enterprise.created_at else None,
        "branches":     branch_data,
    }


# ── Branch management ─────────────────────────────────────────────────────────

@router.post("/add-branch")
async def add_branch(
    req: AddBranchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a branch to an enterprise. Owner only."""

    enterprise = db.query(EnterpriseBusiness).filter(
        EnterpriseBusiness.id == req.enterprise_id,
        EnterpriseBusiness.owner_user_id == current_user.id
    ).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found.")

    # Look up manager by email
    manager = db.query(User).filter(
        User.email == req.manager_email.lower().strip()
    ).first()
    if not manager:
        raise HTTPException(
            status_code=404,
            detail=f"No KIP account found for {req.manager_email}. "
                   f"The branch manager must register on KIP first."
        )
    if manager.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot assign yourself as a branch manager. "
                   "Branch managers must be separate KIP accounts."
        )

    # Generate a launch plan for this branch
    plan_json_value = json.dumps({
        "launch_plan":  f"# {req.branch_name} — Branch Operations Plan\n\n"
                        f"Branch of {enterprise.name}\n"
                        f"Location: {req.location or 'TBD'}\n"
                        f"Specialty: {req.specialty or 'General operations'}\n\n"
                        f"This branch plan will be enriched as daily logs are submitted.",
        "generated_at": datetime.utcnow().isoformat(),
        "version":      "1.0",
        "type":         "branch_plan",
    })

    plan = BusinessLaunchPlan(
        user_id=manager.id,
        idea_id=None,
        business_name=req.branch_name,
        location=req.location or "",
        plan_json=plan_json_value,
        status="active",
        is_profitable=False,
    )
    db.add(plan)
    db.flush()  # get plan.id before committing

    branch = EnterpriseBranch(
        enterprise_id=req.enterprise_id,
        plan_id=plan.id,
        branch_name=req.branch_name,
        location=req.location,
        specialty=req.specialty,
        branch_manager_user_id=manager.id,
        manager_email=req.manager_email.lower().strip(),
        monthly_target=req.monthly_target,
    )
    db.add(branch)
    db.flush()

    # In-app notification to branch manager
    notification = BranchNotification(
        user_id=manager.id,
        enterprise_id=enterprise.id,
        branch_id=branch.id,
        message=(
            f"You have been assigned as Branch Manager of **{req.branch_name}** "
            f"({req.location or 'location TBD'}) under **{enterprise.name}**, "
            f"managed by {current_user.full_name}. "
            f"Your branch dashboard is now active — start logging to track performance."
        ),
    )
    db.add(notification)

    # Update branch count
    enterprise.branch_count = db.query(EnterpriseBranch).filter(
        EnterpriseBranch.enterprise_id == enterprise.id
    ).count() + 1

    db.commit()

    return {
        "branch_id":   branch.id,
        "plan_id":     plan.id,
        "branch_name": branch.branch_name,
        "manager":     manager.full_name,
        "message":     f"Branch '{req.branch_name}' created. {manager.full_name} has been notified.",
    }


@router.post("/update-target")
def update_branch_target(
    req: UpdateBranchTargetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = db.query(EnterpriseBranch).filter(
        EnterpriseBranch.id == req.branch_id
    ).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found.")

    # Verify ownership via enterprise
    enterprise = db.query(EnterpriseBusiness).filter(
        EnterpriseBusiness.id == branch.enterprise_id,
        EnterpriseBusiness.owner_user_id == current_user.id
    ).first()
    if not enterprise:
        raise HTTPException(status_code=403, detail="Not authorised.")

    branch.monthly_target = req.monthly_target
    db.commit()
    return {"status": "updated"}


# ── Branch manager view ───────────────────────────────────────────────────────

@router.get("/my-branches")
def get_my_managed_branches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get branches where current user is the branch manager."""
    branches = db.query(EnterpriseBranch).filter(
        EnterpriseBranch.branch_manager_user_id == current_user.id,
        EnterpriseBranch.is_active == True
    ).all()

    result = []
    for b in branches:
        enterprise = db.query(EnterpriseBusiness).filter(
            EnterpriseBusiness.id == b.enterprise_id
        ).first()
        owner = db.query(User).filter(
            User.id == enterprise.owner_user_id
        ).first() if enterprise else None

        result.append({
            "branch_id":       b.id,
            "plan_id":         b.plan_id,
            "branch_name":     b.branch_name,
            "location":        b.location,
            "specialty":       b.specialty,
            "enterprise_id":   b.enterprise_id,
            "enterprise_name": enterprise.name if enterprise else "—",
            "owner_name":      owner.full_name if owner else "—",
            "monthly_target":  b.monthly_target,
        })
    return result


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get unread branch notifications for current user."""
    notifs = db.query(BranchNotification).filter(
        BranchNotification.user_id == current_user.id,
        BranchNotification.is_read == False
    ).order_by(BranchNotification.created_at.desc()).all()

    return [
        {
            "id":            n.id,
            "message":       n.message,
            "enterprise_id": n.enterprise_id,
            "branch_id":     n.branch_id,
            "created_at":    n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.post("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(BranchNotification).filter(
        BranchNotification.id == notif_id,
        BranchNotification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "ok"}


# ── KIP consolidated analysis ─────────────────────────────────────────────────

@router.get("/enterprise/{enterprise_id}/kip-analysis")
async def get_kip_analysis(
    enterprise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask KIP to analyse all branches and identify
    best performer, underperformer, and strategic recommendations.
    """
    enterprise = db.query(EnterpriseBusiness).filter(
        EnterpriseBusiness.id == enterprise_id,
        EnterpriseBusiness.owner_user_id == current_user.id
    ).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found.")

    branches = db.query(EnterpriseBranch).filter(
        EnterpriseBranch.enterprise_id == enterprise_id,
        EnterpriseBranch.is_active == True
    ).all()

    if not branches:
        return {"analysis": "No branches added yet. Add branches to get KIP's analysis."}

    # Build summary for each branch
    branch_summaries = []
    for b in branches:
        logs = db.query(DailyBusinessLog).filter(
            DailyBusinessLog.plan_id == b.plan_id
        ).order_by(DailyBusinessLog.created_at.desc()).limit(7).all()

        total_rev  = sum(getattr(l,'revenue_today',0) or 0 for l in logs)
        total_exp  = sum(getattr(l,'expenses_today',0) or 0 for l in logs)
        total_cust = sum(getattr(l,'customer_count',0) or 0 for l in logs)

        branch_summaries.append(
            f"- {b.branch_name} ({b.location or 'no location'}): "
            f"K{total_rev:,.0f} revenue, K{total_rev-total_exp:,.0f} profit, "
            f"{total_cust} customers (last 7 days). "
            f"Target: K{b.monthly_target:,.0f}/month" if b.monthly_target
            else f"- {b.branch_name} ({b.location or 'no location'}): "
                 f"K{total_rev:,.0f} revenue, K{total_rev-total_exp:,.0f} profit, "
                 f"{total_cust} customers (last 7 days). No target set."
        )

    summary_text = "\n".join(branch_summaries)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"analysis": f"KIP analysis unavailable — API key not set.\n\nBranch summary:\n{summary_text}"}

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    try:
        r = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=600,
            messages=[{"role": "user", "content":
                f"You are KIP, analysing a multi-branch business called '{enterprise.name}' "
                f"in Zambia, owned by {current_user.full_name}.\n\n"
                f"Branch performance (last 7 days):\n{summary_text}\n\n"
                f"Provide a concise analysis (under 250 words):\n"
                f"1. Which branch is performing best and why\n"
                f"2. Which branch needs attention and what the likely issue is\n"
                f"3. One specific action the owner should take this week\n"
                f"Use ZMW. Be direct and reference actual numbers."
            }]
        )
        return {"analysis": r.content[0].text}
    except Exception as e:
        return {"analysis": f"Analysis error: {e}"}
