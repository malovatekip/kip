"""
KIP Simulation Routes -- FastAPI endpoints for the multi-week simulation engine.

GET  /api/simulation/idea/{idea_id}           -- baseline + sub-products + default levers (to render the form)
POST /api/simulation/run                      -- run the n-week simulation, persist it, return the result
GET  /api/simulation/idea/{idea_id}/sessions  -- past runs for this idea (newest first)

The engine (app/services/simulation_engine.py) is pure; this router only
assembles an IdeaBaseline from the three permanent tables, runs it, and stores
the SimulationSession.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.business_idea import BusinessIdea
from app.models.idea_factors import IdeaGlobalFactors, UserSessionFactors
from app.models.simulation import SimulationSession
from app.security import get_current_user
from app.services.simulation_engine import (
    SimulationEngine, SimulationLevers, IdeaBaseline, DEFAULT_HORIZON_WEEKS,
)

router = APIRouter()

NEUTRAL_SCORE = 5.0  # fallback when a user_session_factors row is absent (pre-persistence ideas)


class LeverInput(BaseModel):
    price: float = Field(..., description="Selling price per unit the user sets.")
    ad_spend: float = 0.0
    product_mix_selections: list = Field(default_factory=list)  # sub-product dicts from allowed_sub_products
    stock_ordered: int = 0
    staffing_change: int = 0


class RunRequest(BaseModel):
    idea_id: int
    levers: LeverInput
    horizon_weeks: int = DEFAULT_HORIZON_WEEKS
    seed: Optional[int] = None


def _owned_idea(idea_id: int, user: User, db: Session) -> BusinessIdea:
    idea = db.query(BusinessIdea).filter(
        BusinessIdea.id == idea_id,
        BusinessIdea.user_id == user.id,
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


def _build_baseline(idea: BusinessIdea, db: Session) -> IdeaBaseline:
    """Assemble the static baseline from the three permanent tables, with safe
    fallbacks for older ideas whose user_session_factors row predates persistence."""
    g = db.query(IdeaGlobalFactors).filter(IdeaGlobalFactors.idea_id == idea.id).first()
    u = (
        db.query(UserSessionFactors)
        .filter(UserSessionFactors.idea_id == idea.id)
        .order_by(UserSessionFactors.created_at.desc())
        .first()
    )
    from app.services import viability_engine as ve

    # D, F from global factors (recompute if missing).
    D = (g.demand_score if g and g.demand_score is not None else None)
    F = (g.financial_score if g and g.financial_score is not None else None)
    if g and D is None:
        D, _ = ve.calculate_demand(g.total_target_buyers, g.consumption_frequency_per_year,
                                   g.average_unit_price, idea.category)
    if g and F is None:
        F = ve.calculate_financial(g.monthly_revenue_estimate, g.cost_of_goods_sold_monthly)

    return IdeaBaseline(
        category=idea.category,
        D=D if D is not None else NEUTRAL_SCORE,
        F=F if F is not None else NEUTRAL_SCORE,
        C=(u.capital_fit_score if u and u.capital_fit_score is not None else NEUTRAL_SCORE),
        R=(u.regulatory_score if u and u.regulatory_score is not None else NEUTRAL_SCORE),
        E=(u.execution_fit_score if u and u.execution_fit_score is not None else NEUTRAL_SCORE),
        S=(u.competitive_position_score if u and u.competitive_position_score is not None else NEUTRAL_SCORE),
        A=(u.asset_location_score if u and u.asset_location_score is not None else NEUTRAL_SCORE),
        total_target_buyers=(g.total_target_buyers if g else 0) or 0,
        consumption_frequency_per_year=(g.consumption_frequency_per_year if g else 0) or 0,
        average_unit_price=(g.average_unit_price if g else 0) or 0,
        monthly_revenue_estimate=(g.monthly_revenue_estimate if g else 0) or 0,
        cost_of_goods_sold_monthly=(g.cost_of_goods_sold_monthly if g else 0) or 0,
        capital_required=(g.capital_required if g else None),
        capital_available=(u.capital_available if u else None),
        environmental_risk_score=(g.environmental_risk_score if g and g.environmental_risk_score is not None else NEUTRAL_SCORE),
        allowed_sub_products=idea.allowed_sub_products or [],
    )


@router.get("/idea/{idea_id}")
def get_simulation_baseline(idea_id: int, current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Everything the Simulate form needs: the idea, its baseline scores, the 4
    selectable sub-products, and sensible default lever values."""
    idea = _owned_idea(idea_id, current_user, db)
    b = _build_baseline(idea, db)
    import app.services.viability_engine as ve
    return {
        "idea_id": idea.id,
        "idea_name": idea.idea_name,
        "category": idea.category,
        "baseline_scores": {"D": b.D, "F": b.F, "C": b.C, "E": b.E, "R": b.R, "S": b.S, "A": b.A},
        "viability_baseline": ve.calculate_viability(b.D, b.F, b.C, b.E, b.R, b.S, b.A),
        "economics": {
            "average_unit_price": b.average_unit_price,
            "capital_available": b.capital_available,
            "capital_required": b.capital_required,
            "total_target_buyers": b.total_target_buyers,
            "consumption_frequency_per_year": b.consumption_frequency_per_year,
        },
        "allowed_sub_products": b.allowed_sub_products,
        "default_levers": {
            "price": b.average_unit_price or 0,
            "ad_spend": 0,
            "product_mix_selections": [],
            "stock_ordered": 0,
            "staffing_change": 0,
        },
        "horizon_weeks": DEFAULT_HORIZON_WEEKS,
    }


@router.post("/run")
def run_simulation(req: RunRequest, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    idea = _owned_idea(req.idea_id, current_user, db)
    baseline = _build_baseline(idea, db)

    levers = SimulationLevers(
        price=req.levers.price,
        ad_spend=req.levers.ad_spend,
        product_mix_selections=req.levers.product_mix_selections,
        stock_ordered=req.levers.stock_ordered,
        staffing_change=req.levers.staffing_change,
    )
    engine = SimulationEngine(baseline, horizon_weeks=req.horizon_weeks, seed=req.seed)
    result = engine.run(levers)

    session = SimulationSession(
        user_id=current_user.id,
        idea_id=idea.id,
        horizon_weeks=result.horizon_weeks,
        seed=req.seed,
        levers=req.levers.model_dump(),
        demand_score=result.D_compiled,
        financial_score=result.F_compiled,
        capital_fit_score=result.C_compiled,
        execution_fit_score=result.E_compiled,
        risk_score=result.R_compiled,
        competitive_score=result.S_compiled,
        asset_location_score=result.A_compiled,
        viability_simulated=result.V_simulated,
        viability_baseline=result.V_baseline,
        initial_cash=result.initial_cash,
        ending_cash=result.ending_cash,
        weeks_in_crunch=result.weeks_in_crunch,
        weekly_trace=[w.to_dict() for w in result.weekly_trace],
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    out = result.to_dict()
    out["session_id"] = session.id
    out["idea_id"] = idea.id
    out["idea_name"] = idea.idea_name
    return out


@router.get("/idea/{idea_id}/sessions")
def list_sessions(idea_id: int, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    _owned_idea(idea_id, current_user, db)
    rows = (
        db.query(SimulationSession)
        .filter(SimulationSession.idea_id == idea_id, SimulationSession.user_id == current_user.id)
        .order_by(SimulationSession.created_at.desc())
        .all()
    )
    return [
        {
            "session_id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "horizon_weeks": r.horizon_weeks,
            "viability_simulated": r.viability_simulated,
            "viability_baseline": r.viability_baseline,
            "ending_cash": r.ending_cash,
            "weeks_in_crunch": r.weeks_in_crunch,
            "levers": r.levers,
        }
        for r in rows
    ]
