"""
Simulation engine migration: create the simulation_sessions table.

Idempotent -- create_all only creates tables that don't already exist, so it's
safe to re-run and works against local SQLite and Neon Postgres via DATABASE_URL.
(The table is also auto-created by main.py's Base.metadata.create_all at app
startup; this script lets you create it ahead of a deploy / on a suspended prod.)

Usage:
    cd backend
    python scripts/migrate_add_simulation_table.py
    # or against prod:
    DATABASE_URL="postgresql://..." python scripts/migrate_add_simulation_table.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, inspect

# Import the related models so SQLAlchemy can resolve FKs/relationships.
from app.models import user, conversation, business_idea, idea_factors  # noqa: F401
from app.models.simulation import SimulationSession
from app.database import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kip.db")


def main():
    engine = create_engine(DATABASE_URL)
    before = inspect(engine).has_table(SimulationSession.__tablename__)
    Base.metadata.create_all(bind=engine, tables=[SimulationSession.__table__])
    after = inspect(engine).has_table(SimulationSession.__tablename__)
    if before:
        print(f"· {SimulationSession.__tablename__} already existed -- nothing to do.")
    elif after:
        print(f"created table {SimulationSession.__tablename__}")
    else:
        print(f"FAILED to create {SimulationSession.__tablename__}")
        sys.exit(1)


if __name__ == "__main__":
    main()
