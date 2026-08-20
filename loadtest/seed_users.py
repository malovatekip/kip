"""
KIP load-test user seeder
==========================
Creates N test users directly in the backend's SQLite DB and mints a valid
JWT for each one, WITHOUT ever calling POST /api/auth/register or
POST /api/auth/login. This matters because:

  1. The auth rate limiter (backend/app/rate_limit.py) caps register at
     5/hour and login at 10/minute, keyed by source IP. Every simulated
     user in a local load test shares localhost's IP, so hitting those
     endpoints for dozens of virtual users would immediately 429 and would
     not reflect how real, geographically-distributed users behave.
  2. It's realistic anyway — real returning users are usually already
     logged in, not registering fresh every session.

Run this with the BACKEND's own venv (it needs SQLAlchemy/bcrypt/PyJWT/
python-dotenv, which live there, not in loadtest/venv):

    backend\\venv\\Scripts\\python.exe loadtest\\seed_users.py --count 60

Idempotent — re-running just tops up new users and refreshes tokens.json;
existing seeded users are left alone (their tokens are also 30 days from
creation, so re-running is safe if you need fresh tokens or more users).
"""
import argparse
import json
import os
import sys
from pathlib import Path

LOADTEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = LOADTEST_DIR.parent / "backend"
TOKENS_FILE = LOADTEST_DIR / "tokens.json"

SEED_EMAIL_PREFIX = "loadtest_user_"
SEED_EMAIL_DOMAIN = "kip-loadtest.local"
SEED_PASSWORD = "LoadTest!2026"  # never used to actually log in over HTTP


def main():
    parser = argparse.ArgumentParser(description="Seed KIP load-test users + JWTs")
    parser.add_argument("--count", type=int, default=60, help="Number of test users to ensure exist")
    args = parser.parse_args()

    # Run from the backend dir so the relative `sqlite:///./kip.db` in
    # app/database.py resolves to backend/kip.db (the same DB uvicorn uses),
    # and so load_dotenv() picks up backend/.env (needed so SECRET_KEY
    # matches what uvicorn signs/verifies tokens with).
    if not BACKEND_DIR.is_dir():
        print(f"ERROR: backend dir not found at {BACKEND_DIR}")
        sys.exit(1)
    os.chdir(BACKEND_DIR)
    sys.path.insert(0, str(BACKEND_DIR))

    from dotenv import load_dotenv
    load_dotenv()

    from app.database import SessionLocal, engine, Base
    from app.models.user import User
    from app.security import hash_password, create_access_token

    # Make sure tables exist (no-op if they already do, mirrors main.py's
    # own startup behaviour rather than assuming migrations have run).
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    created, existing = 0, 0
    tokens = {}
    try:
        for i in range(args.count):
            email = f"{SEED_EMAIL_PREFIX}{i:03d}@{SEED_EMAIL_DOMAIN}"
            user = db.query(User).filter(User.email == email).first()
            if user is None:
                user = User(
                    full_name=f"Load Test User {i:03d}",
                    email=email,
                    hashed_password=hash_password(SEED_PASSWORD),
                    is_active=True,
                    is_verified=True,
                    plan_tier="free",
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                created += 1
            else:
                existing += 1

            token = create_access_token(user.id)
            tokens[email] = {"user_id": user.id, "token": token}
    finally:
        db.close()

    with open(TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(tokens, f, indent=2)

    print(f"Seeded users: {created} created, {existing} already existed, {len(tokens)} total.")
    print(f"Tokens written to {TOKENS_FILE}")


if __name__ == "__main__":
    main()
