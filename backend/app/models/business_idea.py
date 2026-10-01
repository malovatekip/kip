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

    # This table is the PUBLIC dataset (admin export). It holds NO user-specific
    # data and NO viability score -- viability depends on the requester and is
    # computed per request from idea_global_factors (D, F) and the temporary
    # user_session_factors (C, E, R, S, A). See idea_factors.py.

    # Capital fields promoted for quick filtering/CSV export
    min_capital                = Column(Float, nullable=True)
    recommended_capital_min    = Column(Float, nullable=True)
    recommended_capital_max    = Column(Float, nullable=True)

    # External/operational risks of the business (e.g. floods, animal disease)
    operational_risks   = Column(JSON, nullable=True)

    # pending | accepted | declined -- set by the user's Accept/Decline click.
    # `accepted` (bool) is kept in sync for older code paths.
    status              = Column(String(20), nullable=False, default="pending", server_default="pending")
    # K-BIG-2 stores all 3 generated ideas but shows the requester only the
    # winner; the other two are False so they stay out of that user's list.
    shown_to_user       = Column(Boolean, nullable=False, default=True, server_default="1")

    user = relationship("User", back_populates="business_ideas")
