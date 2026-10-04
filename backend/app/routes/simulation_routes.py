"""
KIP Simulation Routes -- FastAPI endpoints for the week-by-week simulation.

POST /api/simulation/sessions                    -- start a session for an idea
GET  /api/simulation/sessions/{session_id}       -- resume / reload a session
POST /api/simulation/sessions/{session_id}/weeks -- play the next week with this week's levers
GET  /api/simulation/idea/{idea_id}/sessions     -- past sessions for an idea (newest first)
POST /api/simulation/run                         -- one-shot run with fixed levers (kept for scripts/tests)

Session logic lives in app/services/simulation_session.py; the engine itself is
the pure app/services/simulation_engine.py.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.simulation import SimulationSession
from app.security import get_current_user
from app.services import simulation_session as svc
from app.services.simulation_engine import SimulationEngine, SimulationLevers, DEFAULT_HORIZON_WEEKS

router = APIRouter()


class LeverInput(BaseModel):
    price: float = Field(..., description="Core selling price per unit for this week.")
    ad_spend: float = 0.0
    product_mix_selections: list = Field(default_factory=list)  # sub-product dicts + `units`
    stock_ordered: int = 0                                       # core units bought this week
    staffing_change: int = 0                                     # hire(+)/fire(-) this week


class StartRequest(BaseModel):
    idea_id: int
    horizon_weeks: int = DEFAULT_HORIZON_WEEKS


class WeekRequest(BaseModel):
    levers: LeverInput


class RunRequest(BaseModel):
    idea_id: int
    levers: LeverInput
    horizon_weeks: int = DEFAULT_HORIZON_WEEKS
    seed: Optional[int] = None


def _call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except svc.SessionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/sessions")
def start_session(req: StartRequest, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    return _call(svc.create_session, db, current_user.id, req.idea_id, req.horizon_weeks)


@router.get("/sessions/{session_id}")
def get_session(session_id: int, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    sess = _call(svc.get_session, db, current_user.id, session_id)
    return svc.serialize(db, sess)


@router.post("/sessions/{session_id}/weeks")
def play_week(session_id: int, req: WeekRequest, current_user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    return _call(svc.play_week, db, current_user.id, session_id, req.levers.model_dump())


@router.get("/idea/{idea_id}/sessions")
def list_sessions(idea_id: int, current_user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    return _call(svc.list_sessions, db, current_user.id, idea_id)


@router.post("/run")
def run_simulation(req: RunRequest, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    idea = _call(svc.owned_idea, db, req.idea_id, current_user.id)
    baseline = svc.build_baseline(db, idea)
    engine = SimulationEngine(baseline, horizon_weeks=req.horizon_weeks, seed=req.seed)
    result = engine.run(SimulationLevers(**req.levers.model_dump()))
    out = result.to_dict()

    session = SimulationSession(
        user_id=current_user.id, idea_id=idea.id, horizon_weeks=result.horizon_weeks,
        seed=engine.seed, status="completed", current_week=result.horizon_weeks,
        levers=req.levers.model_dump(),
        demand_score=result.D_compiled, financial_score=result.F_compiled,
        capital_fit_score=result.C_compiled, execution_fit_score=result.E_compiled,
        risk_score=result.R_compiled, competitive_score=result.S_compiled,
        asset_location_score=result.A_compiled, viability_simulated=result.V_simulated,
        viability_baseline=result.V_baseline, initial_cash=result.initial_cash,
        ending_cash=result.ending_cash, weeks_in_crunch=result.weeks_in_crunch,
        weekly_trace=out["weekly_trace"],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    out.update({"session_id": session.id, "idea_id": idea.id, "idea_name": idea.idea_name})
    return out
