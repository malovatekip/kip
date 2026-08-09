import jwt
import bcrypt
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app.models.user import User
from app.models.token_blocklist import TokenBlocklist

SECRET_KEY = os.getenv("SECRET_KEY", "kip-dev-secret-change-in-production")
ALGORITHM  = "HS256"
# 30 days: login is meant to be a once-off action until the user explicitly
# signs out. This is safe to keep long-lived because /auth/logout actually
# revokes the token now (see revoke_token/is_token_revoked below) instead of
# just relying on client-side deletion.
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 30

bearer_scheme = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain-text password against a stored bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: int) -> str:
    """Create a signed JWT token for the given user ID.

    Includes a `jti` (JWT ID) so this specific token can be individually
    revoked later (e.g. on logout) without affecting any other tokens
    already issued to the same user.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        # iat lets us invalidate every token issued before a given moment
        # (see User.sessions_revoked_at, set on password reset).
        "iat": now,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def is_token_revoked(jti: str, db: Session) -> bool:
    """Check whether a token's jti has been revoked (e.g. via logout)."""
    if not jti:
        return False
    return db.query(TokenBlocklist.id).filter(TokenBlocklist.jti == jti).first() is not None

def revoke_token(jti: str, user_id: int, expires_at: datetime, db: Session) -> None:
    """Add a token's jti to the blocklist so it can no longer authenticate.

    Idempotent (calling logout twice with the same token is a no-op the
    second time). Opportunistically prunes already-expired blocklist rows
    so this table doesn't grow without bound.
    """
    if not jti:
        return
    db.query(TokenBlocklist).filter(TokenBlocklist.expires_at < datetime.utcnow()).delete()
    already = db.query(TokenBlocklist).filter(TokenBlocklist.jti == jti).first()
    if already:
        db.commit()
        return
    db.add(TokenBlocklist(jti=jti, user_id=user_id, expires_at=expires_at))
    db.commit()

def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Dependency: verifies the JWT signature/expiry and returns its payload.

    Split out from get_current_user so routes that need the raw token
    (namely /auth/logout, which needs the jti to revoke) can depend on it
    directly without re-decoding the token themselves.
    """
    token = credentials.credentials
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

def get_current_user(
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: decodes JWT and returns the logged-in user."""
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )
    if is_token_revoked(payload.get("jti"), db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This session has been signed out. Please log in again.",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.sessions_revoked_at:
        # Tokens minted before the revocation moment (or old tokens without
        # an iat claim) no longer authenticate — used by password reset to
        # sign the account out everywhere.
        # JWT iat is whole seconds — compare at second granularity so a
        # token issued in the same second as the revocation isn't rejected.
        iat_ts = payload.get("iat")
        if not iat_ts or datetime.utcfromtimestamp(iat_ts) < user.sessions_revoked_at.replace(microsecond=0):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This session has been signed out. Please log in again.",
            )
    return user
