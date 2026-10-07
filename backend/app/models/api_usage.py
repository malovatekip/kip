from sqlalchemy import Column, Integer, String, DateTime, Float
from datetime import datetime
from app.database import Base


class ApiUsageLog(Base):
    """One row per Anthropic API call, so real per-feature / per-user / per-day
    cost can be measured instead of estimated. Written by
    app.services.usage_meter.record_usage; never on the request's critical path
    (logging failures are swallowed). No ForeignKey on user_id -- a usage row
    must survive even if the user is later deleted, and some calls have no user.
    """
    __tablename__ = "api_usage_logs"

    id          = Column(Integer, primary_key=True, index=True)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)
    user_id     = Column(Integer, nullable=True, index=True)
    feature     = Column(String(40), nullable=False, index=True)  # kbig1_chat, kbig2_structured, ...
    model       = Column(String(60), nullable=True)

    input_tokens       = Column(Integer, nullable=False, default=0)
    output_tokens      = Column(Integer, nullable=False, default=0)
    cache_read_tokens  = Column(Integer, nullable=False, default=0)
    cache_write_tokens = Column(Integer, nullable=False, default=0)
    web_searches       = Column(Integer, nullable=False, default=0)

    cost_usd    = Column(Float, nullable=True)   # None when the model's price is unknown
    request_id  = Column(String(64), nullable=True)
