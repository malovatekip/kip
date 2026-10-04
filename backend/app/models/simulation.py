from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Boolean
from datetime import datetime
from app.database import Base


class SimulationSession(Base):
    """
    Permanent record of one multi-week simulation run (sprint PART 4: compiled
    outputs live in permanent tables, every score clamped to [1.0, 10.0]).

    Links to the idea it simulated and the user who ran it. Stores the lever
    inputs, the compiled sub-scores, both viability figures (baseline vs
    simulated), the session cash summary, and the full week-by-week trace so the
    results UI can redraw a run without recomputing it.
    """
    __tablename__ = "simulation_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    idea_id    = Column(Integer, ForeignKey("business_ideas.id"), nullable=False, index=True)

    horizon_weeks = Column(Integer, nullable=False, default=4)
    seed          = Column(Integer, nullable=True)   # RNG seed -> reproducible shocks

    # Week-by-week session: in_progress until the last week is played.
    status         = Column(String(20), nullable=False, default="in_progress", server_default="in_progress")
    current_week   = Column(Integer, nullable=False, default=0, server_default="0")  # weeks completed
    state          = Column(JSON, nullable=True)   # SimulationState.to_dict() between weekly calls
    shock_schedule = Column(JSON, nullable=True)   # named threat per week, revealed before each week

    # Lever inputs: a list with one entry per played week (the 5 levers each,
    # product_mix_selections nested). One-shot /run sessions store a single dict.
    levers = Column(JSON, nullable=True)

    # Compiled sub-scores (each already clamped to [1,10]).
    demand_score        = Column(Float, nullable=True)  # D
    financial_score     = Column(Float, nullable=True)  # F
    capital_fit_score   = Column(Float, nullable=True)  # C
    execution_fit_score = Column(Float, nullable=True)  # E
    risk_score          = Column(Float, nullable=True)  # R
    competitive_score   = Column(Float, nullable=True)  # S (static pass-through)
    asset_location_score = Column(Float, nullable=True) # A (static pass-through)

    viability_simulated = Column(Float, nullable=True)  # V_simulated
    viability_baseline  = Column(Float, nullable=True)  # V before the session

    # Cash summary.
    initial_cash    = Column(Float, nullable=True)
    ending_cash     = Column(Float, nullable=True)
    weeks_in_crunch = Column(Integer, nullable=True)

    # Full per-week trace (list of dicts; see SimulationResult.to_dict).
    weekly_trace = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
