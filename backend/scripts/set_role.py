"""
Grant a field-data role to a user, identified by email. There is no in-app
role management yet, so this is how collectors and supervisors are set up.

Roles:
    collector   -- can use the /field area of the app to pin businesses and markets
    supervisor  -- collector, plus the review queue (verify / reject / merge)
    user        -- back to a normal account

Usage:
    cd backend
    python scripts/set_role.py --email agent@example.com --role collector
    python scripts/set_role.py --email lead@example.com --role supervisor
"""
import argparse
import importlib
import os
import pkgutil
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal

# Every model module must be imported before querying User (see set_admin.py).
import app.models as _models_pkg
for _, _name, _ in pkgutil.iter_modules(_models_pkg.__path__):
    importlib.import_module(f"app.models.{_name}")

from app.models.user import User


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", required=True, choices=["user", "collector", "supervisor"])
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if not user:
            print(f"No user found with email '{args.email}'.")
            sys.exit(1)
        user.role = args.role
        db.commit()
        print(f"{user.email} (user_id={user.id}) now has role '{args.role}'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
