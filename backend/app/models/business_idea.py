from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class BusinessIdea(Base):
    """
    The Business Idea Repository.
    Every idea KIP generates is stored here.
    """
    __tablename__ = "business_ideas"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)

    # The idea itself
    idea_name       = Column(String(255), nullable=False)
    idea_summary    = Column(Text, nullable=False)
    full_response   = Column(Text, nullable=False)   # Full KIP response stored as JSON string

    # Context at time of generation
    location        = Column(String(255), nullable=True)
    capital_amount  = Column(Float, nullable=True)
    skills          = Column(Text, nullable=True)

    # Repository tracking
    generated_by_kip = Column(Boolean, default=True)   # 1 = KIP-generated, 0 = pre-loaded
    accepted         = Column(Boolean, nullable=True)   # True/False/None (pending)
    decline_reason   = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # ── K-BIG-2 fields ──────────────────────────────────────────────
    # `structured_data` holds the full k-big-2 schema object (identity,
    # user-fit, market, financial, operational, regulatory, location,
    # strategic and confidence fields — see the sprint doc's practical
    # schema example) as one JSON blob. The columns below promote just the
    # fields needed for filtering/sorting/CSV export to real, indexable
    # columns so the whole schema doesn't need a column each.
    category            = Column(String(100), nullable=True, index=True)
    structured_data     = Column(JSON, nullable=True)

    # Viability formula (V = 0.25D + 0.20F + 0.15C + 0.15E + 0.10R + 0.10S + 0.05A)
    # sub-scores, each on a 0-10 scale, plus the final weighted score.
    viability_score        = Column(Float, nullable=True, index=True)
    demand_score           = Column(Float, nullable=True)
    financial_score        = Column(Float, nullable=True)
    capital_fit_score      = Column(Float, nullable=True)
    execution_fit_score    = Column(Float, nullable=True)
    regulatory_score       = Column(Float, nullable=True)
    competitive_score      = Column(Float, nullable=True)
    asset_location_score   = Column(Float, nullable=True)

    # Capital fields promoted for quick filtering/CSV export
    min_capital                = Column(Float, nullable=True)
    recommended_capital_min    = Column(Float, nullable=True)
    recommended_capital_max    = Column(Float, nullable=True)

    # Snapshot of the requester's profile at generation time (slides 1-4 of
    # the New Idea wizard) — used to recompute capital-fit/execution-fit/
    # asset-location scores for this idea against a *different* requester's
    # profile later, without needing a separate user-profile table.
    capital_available_at_generation = Column(Float, nullable=True)
    skills_at_generation            = Column(JSON, nullable=True)
    assets_at_generation            = Column(JSON, nullable=True)

    user = relationship("User", back_populates="business_ideas")
