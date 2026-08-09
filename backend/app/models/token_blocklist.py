from sqlalchemy import Column, Integer, String, DateTime, Index
from datetime import datetime
from app.database import Base


class TokenBlocklist(Base):
    """Revoked JWT access tokens, keyed by the token's unique id (jti).

    A row here means that specific token can no longer authenticate, even
    though its signature/expiry are still otherwise valid. Rows are only
    needed until the token's own `exp` passes (after that it's rejected by
    normal JWT expiry checking anyway), so `expires_at` lets us prune stale
    rows opportunistically instead of growing this table forever.
    """
    __tablename__ = "token_blocklist"

    id         = Column(Integer, primary_key=True, index=True)
    jti        = Column(String(64), unique=True, index=True, nullable=False)
    user_id    = Column(Integer, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_token_blocklist_expires_at", "expires_at"),
    )
