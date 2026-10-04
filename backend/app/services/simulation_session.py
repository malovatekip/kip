"""
Week-by-week simulation sessions: the persistence layer around the pure engine.

create_session -> play_week (x horizon_weeks) -> completed.
Routes in app/routes/simulation_routes.py are thin wrappers over these functions.
Only the NEXT week's shock is revealed to the client; the rest of the schedule
stays server-side.
"""
import random
from typing import Optional

from sqlalchemy.orm import Session

from app.models.business_idea import BusinessIdea
from app.models.idea_factors import IdeaGlobalFactors, UserSessionFactors
from app.models.simulation import SimulationSession
from app.services import viability_engine as ve
from app.services.simulation_engine import (
    SimulationEngine, SimulationLevers, SimulationState, IdeaBaseline,
    DEFAULT_HORIZON_WEEKS, BASE_STAFF,
)

NEUTRAL_SCORE = 5.0  # fallback when a user_session_factors row is absent (pre-persistence ideas)
MAX_HORIZON_WEEKS = 12


class SessionError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def owned_idea(db: Session, idea_id: int, user_id: int) -> BusinessIdea:
    idea = db.query(BusinessIdea).filter(
        BusinessIdea.id == idea_id, BusinessIdea.user_id == user_id,
    ).first()
    if not idea:
        raise SessionError(404, "Idea not found")
    return idea


def build_baseline(db: Session, idea: BusinessIdea) -> IdeaBaseline:
    """Static baseline from the three permanent tables, with safe fallbacks for
    older ideas whose user_session_factors row predates persistence."""
    g = db.query(IdeaGlobalFactors).filter(IdeaGlobalFactors.idea_id == idea.id).first()
    u = (
        db.query(UserSessionFactors)
        .filter(UserSessionFactors.idea_id == idea.id)
        .order_by(UserSessionFactors.created_at.desc())
        .first()
    )
    D = g.demand_score if g and g.demand_score is not None else None
    F = g.financial_score if g and g.financial_score is not None else None
    if g and D is None:
        D, _ = ve.calculate_demand(g.total_target_buyers, g.consumption_frequency_per_year,
                                   g.average_unit_price, idea.category)
    if g and F is None:
        F = ve.calculate_financial(g.monthly_revenue_estimate, g.cost_of_goods_sold_monthly)

    def score(attr):
        v = getattr(u, attr, None) if u else None
        return v if v is not None else NEUTRAL_SCORE

    return IdeaBaseline(
        category=idea.category,
        D=D if D is not None else NEUTRAL_SCORE,
        F=F if F is not None else NEUTRAL_SCORE,
        C=score("capital_fit_score"), R=score("regulatory_score"),
        E=score("execution_fit_score"), S=score("competitive_position_score"),
        A=score("asset_location_score"),
        total_target_buyers=(g.total_target_buyers if g else 0) or 0,
        consumption_frequency_per_year=(g.consumption_frequency_per_year if g else 0) or 0,
        average_unit_price=(g.average_unit_price if g else 0) or 0,
        monthly_revenue_estimate=(g.monthly_revenue_estimate if g else 0) or 0,
        cost_of_goods_sold_monthly=(g.cost_of_goods_sold_monthly if g else 0) or 0,
        capital_required=(g.capital_required if g else None),
        capital_available=(u.capital_available if u else None),
        environmental_risk_score=(g.environmental_risk_score
                                  if g and g.environmental_risk_score is not None else NEUTRAL_SCORE),
        allowed_sub_products=idea.allowed_sub_products or [],
        operational_risks=idea.operational_risks or [],
    )


def _engine_for(db: Session, sess: SimulationSession) -> tuple[BusinessIdea, IdeaBaseline, SimulationEngine]:
    idea = db.query(BusinessIdea).filter(BusinessIdea.id == sess.idea_id).first()
    baseline = build_baseline(db, idea)
    return idea, baseline, SimulationEngine(baseline, horizon_weeks=sess.horizon_weeks, seed=sess.seed)


def _default_levers(baseline: IdeaBaseline, engine: SimulationEngine, cash: float) -> dict:
    """A sensible, affordable opening order: price at baseline, stock about one
    week of demand one worker can serve, capped so stock plus the week's rent and
    wages fits the cash on hand. No ads, no sub-products."""
    weekly_buyers = (baseline.total_target_buyers or 0) * (baseline.consumption_frequency_per_year or 0) / 52.0
    capacity = BASE_STAFF * engine.bench["base_worker_throughput_weekly"] * (baseline.E / 10.0)
    fixed = engine.bench["fixed_weekly_rent_baseline"] + BASE_STAFF * engine.bench["weekly_wage_per_worker"]
    unit_cost = baseline.core_unit_cost
    affordable = max(0.0, (cash - fixed) / unit_cost) if unit_cost > 0 else float("inf")
    return {
        "price": round(baseline.average_unit_price or 0, 2),
        "ad_spend": 0,
        "stock_ordered": int(max(0, round(min(weekly_buyers, capacity, affordable)))),
        "staffing_change": 0,
        "product_mix_selections": [],
    }


def serialize(db: Session, sess: SimulationSession) -> dict:
    idea, baseline, engine = _engine_for(db, sess)
    state = SimulationState.from_dict(sess.state) if sess.state else engine.start()
    running = engine.compile(state)
    weeks = list(sess.weekly_trace or [])
    bench = engine.bench
    return {
        "session_id": sess.id,
        "status": sess.status,
        "current_week": sess.current_week,
        "horizon_weeks": sess.horizon_weeks,
        "idea": {"id": idea.id, "name": idea.idea_name, "category": idea.category},
        "baseline_scores": {"D": baseline.D, "F": baseline.F, "C": baseline.C, "E": baseline.E,
                            "R": baseline.R, "S": baseline.S, "A": baseline.A},
        "viability_baseline": running.V_baseline,
        "running_scores": running.scores,
        "running_viability": running.V_simulated,
        "economics": {
            "average_unit_price": baseline.average_unit_price,
            "core_unit_cost": round(baseline.core_unit_cost, 2),
            "capital_available": baseline.capital_available,
            "capital_required": baseline.capital_required,
            "initial_cash": state.initial_cash,
            "cash": round(state.cash, 2),
            "staff_count": state.staff_count,
            "inventory": {k: round(v, 1) for k, v in state.inventory.items()},
            "total_target_buyers": baseline.total_target_buyers,
            "consumption_frequency_per_year": baseline.consumption_frequency_per_year,
            "weekly_rent": bench["fixed_weekly_rent_baseline"],
            "weekly_wage_per_worker": bench["weekly_wage_per_worker"],
            "worker_throughput_weekly": bench["base_worker_throughput_weekly"],
            "waste_penalty_per_unit": bench["unsold_waste_penalty_per_unit"],
            "base_elasticity": bench["base_elasticity"],
            "marketing_scale_k": bench["diminishing_returns_marketing_scale_k"],
            "category_growth_rate": ve.get_cagr(baseline.category),
            "environmental_risk_score": baseline.environmental_risk_score,
        },
        "allowed_sub_products": baseline.allowed_sub_products,
        "next_shock": state.next_shock(),          # only the coming week is revealed
        "weeks": weeks,
        "lever_history": list(sess.levers) if isinstance(sess.levers, list) else [],
        "default_levers": _carried_levers(sess.levers) or _default_levers(baseline, engine, state.cash),
    }


def _carried_levers(history) -> Optional[dict]:
    """Next week's starting levers = last week's decisions, except staffing_change,
    which is a one-off hire/fire delta and resets to 0."""
    if isinstance(history, list) and history and isinstance(history[-1], dict):
        return {**history[-1], "staffing_change": 0}
    return None


def create_session(db: Session, user_id: int, idea_id: int,
                   horizon_weeks: int = DEFAULT_HORIZON_WEEKS, seed: Optional[int] = None) -> dict:
    idea = owned_idea(db, idea_id, user_id)
    horizon = max(1, min(MAX_HORIZON_WEEKS, int(horizon_weeks or DEFAULT_HORIZON_WEEKS)))
    seed = seed if seed is not None else random.randrange(1, 2**31 - 1)
    baseline = build_baseline(db, idea)
    engine = SimulationEngine(baseline, horizon_weeks=horizon, seed=seed)
    state = engine.start()
    # At most one live session per idea: an unfinished older run is abandoned.
    db.query(SimulationSession).filter(
        SimulationSession.user_id == user_id,
        SimulationSession.idea_id == idea.id,
        SimulationSession.status == "in_progress",
    ).update({"status": "abandoned"}, synchronize_session=False)
    sess = SimulationSession(
        user_id=user_id, idea_id=idea.id, horizon_weeks=horizon, seed=seed,
        status="in_progress", current_week=0,
        state=state.to_dict(), shock_schedule=state.shock_schedule,
        levers=[], weekly_trace=[],
        viability_baseline=engine.compile(state).V_baseline,
        initial_cash=state.initial_cash,
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return serialize(db, sess)


def get_session(db: Session, user_id: int, session_id: int) -> SimulationSession:
    sess = db.query(SimulationSession).filter(
        SimulationSession.id == session_id, SimulationSession.user_id == user_id,
    ).first()
    if not sess:
        raise SessionError(404, "Simulation session not found")
    return sess


def play_week(db: Session, user_id: int, session_id: int, levers: dict) -> dict:
    sess = get_session(db, user_id, session_id)
    if sess.status != "in_progress" or not sess.state:
        raise SessionError(409, "This simulation has already finished")
    _, _, engine = _engine_for(db, sess)
    state = SimulationState.from_dict(sess.state)

    lv = SimulationLevers(
        price=float(levers.get("price") or 0),
        ad_spend=float(levers.get("ad_spend") or 0),
        product_mix_selections=list(levers.get("product_mix_selections") or []),
        stock_ordered=int(levers.get("stock_ordered") or 0),
        staffing_change=int(levers.get("staffing_change") or 0),
    )
    trace, state = engine.step(state, lv)
    week = trace.to_dict()

    # Reassign (not mutate) JSON columns so SQLAlchemy records the change.
    sess.state = state.to_dict()
    sess.current_week = state.week
    sess.levers = list(sess.levers or []) + [levers]
    sess.weekly_trace = list(sess.weekly_trace or []) + [week]
    sess.ending_cash = state.cash
    sess.weeks_in_crunch = state.weeks_in_crunch
    sess.viability_simulated = week["running_viability"]

    if state.finished:
        result = engine.compile(state)
        sess.status = "completed"
        sess.demand_score = result.D_compiled
        sess.financial_score = result.F_compiled
        sess.capital_fit_score = result.C_compiled
        sess.execution_fit_score = result.E_compiled
        sess.risk_score = result.R_compiled
        sess.competitive_score = result.S_compiled
        sess.asset_location_score = result.A_compiled
        sess.viability_simulated = result.V_simulated
        sess.viability_baseline = result.V_baseline
    db.commit()
    db.refresh(sess)
    return {"week": week, "session": serialize(db, sess)}


def list_sessions(db: Session, user_id: int, idea_id: int) -> list:
    owned_idea(db, idea_id, user_id)
    rows = (
        db.query(SimulationSession)
        .filter(SimulationSession.idea_id == idea_id, SimulationSession.user_id == user_id)
        .order_by(SimulationSession.created_at.desc())
        .all()
    )
    return [
        {
            "session_id": r.id,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "horizon_weeks": r.horizon_weeks,
            "current_week": r.current_week,
            "viability_simulated": r.viability_simulated,
            "viability_baseline": r.viability_baseline,
            "ending_cash": r.ending_cash,
            "initial_cash": r.initial_cash,
            "weeks_in_crunch": r.weeks_in_crunch,
        }
        for r in rows
    ]
