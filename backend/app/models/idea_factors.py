from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON
from datetime import datetime
from app.database import Base


class UserSessionFactors(Base):
    """
    K-BIG-2 Table 1 -- TEMPORARY, user-specific factors for ONE generation
    request. Rows are deleted at the end of the request (see
    kip_engine_v2.generate_structured_ideas). Never exported and never holds a
    viability score.
    """
    __tablename__ = "user_session_factors"

    id                   = Column(Integer, primary_key=True, index=True)
    request_id           = Column(String(36), nullable=False, index=True)
    user_id              = Column(Integer, ForeignKey("users.id"), nullable=False)
    idea_id              = Column(Integer, ForeignKey("business_ideas.id"), nullable=False)

    capital_available    = Column(Float, nullable=True)     # None == limitless
    skills               = Column(JSON, nullable=True)
    assets               = Column(JSON, nullable=True)
    location             = Column(String(255), nullable=True)

    capital_fit_score          = Column(Float, nullable=True)   # C
    execution_fit_score        = Column(Float, nullable=True)   # E
    regulatory_score           = Column(Float, nullable=True)   # R
    competitive_position_score = Column(Float, nullable=True)   # S
    asset_location_score       = Column(Float, nullable=True)   # A

    created_at = Column(DateTime, default=datetime.utcnow)


class IdeaGlobalFactors(Base):
    """
    K-BIG-2 Table 2 -- PERMANENT, global/static factors common to every user
    for an idea, plus the engine-computed D and F. Grows with every
    generation. Holds no user data and no viability score.
    """
    __tablename__ = "idea_global_factors"

    id       = Column(Integer, primary_key=True, index=True)
    idea_id  = Column(Integer, ForeignKey("business_ideas.id"), nullable=False, unique=True, index=True)

    capital_required              = Column(Float, nullable=True)
    total_target_buyers           = Column(Float, nullable=True)
    consumption_frequency_per_year = Column(Float, nullable=True)
    average_unit_price            = Column(Float, nullable=True)
    monthly_revenue_estimate      = Column(Float, nullable=True)
    cost_of_goods_sold_monthly    = Column(Float, nullable=True)
    break_even_months             = Column(Float, nullable=True)
    # External/environmental exposure (floods, animal disease, drought...).
    # 1-10, HIGHER = MORE EXPOSED.
    environmental_risk_score      = Column(Float, nullable=True)

    demand_score    = Column(Float, nullable=True)   # D (0-10)
    financial_score = Column(Float, nullable=True)   # F (0-10)

    created_at = Column(DateTime, default=datetime.utcnow)
