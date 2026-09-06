"""
One-off: grant (or revoke) platform-admin status for a user, identified by
email. This is the only bootstrap path for the admin-only dataset export
(GET /api/ideas/export) since there is no in-app admin-management UI.

Usage:
    cd backend
    python scripts/set_admin.py --email you@example.com
    python scripts/set_admin.py --email you@example.com --revoke
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

from dotenv import load_dotenv
load_dotenv()

import importlib
import pkgutil

from app.database import SessionLocal

# User.conversations / User.business_ideas relationships reference other
# model classes by name -- SQLAlchemy needs every model module imported
# before any query touches User, or mapper configuration fails with
# "failed to locate a name ('Conversation')" etc. Import every module under
# app/models (mirrors main.py/startup.py) rather than hand-listing them.
import app.models as _models_pkg
for _, _name, _ in pkgutil.iter_modules(_models_pkg.__path__):
    importlib.import_module(f"app.models.{_name}")

from app.models.user import User


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, help="Email of the account to grant/revoke admin on")
    parser.add_argument("--revoke", action="store_true", help="Revoke admin instead of granting it")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if not user:
            print(f"No user found with email '{args.email}'.")
            sys.exit(1)

        user.is_admin = not args.revoke
        db.commit()
        action = "revoked from" if args.revoke else "granted to"
        print(f"Admin {action} {user.email} (user_id={user.id}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
