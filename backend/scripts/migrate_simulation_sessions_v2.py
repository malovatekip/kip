"""
Simulation sessions v2: add the columns for week-by-week sessions.

Adds simulation_sessions.status, current_week, state, shock_schedule. Idempotent:
each column is added only if missing. Existing rows (one-shot /run sessions) are
marked completed. Works on local SQLite and Neon Postgres via DATABASE_URL.

Usage:
    cd backend
    python scripts/migrate_simulation_sessions_v2.py
    # or against prod:
    DATABASE_URL="postgresql://..." python scripts/migrate_simulation_sessions_v2.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, inspect, text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kip.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")
JSON_T = "TEXT" if IS_SQLITE else "JSON"

NEW_COLUMNS = [
    ("status", "VARCHAR(20)", "'in_progress'"),
    ("current_week", "INTEGER", "0"),
    ("state", JSON_T, None),
    ("shock_schedule", JSON_T, None),
]


def main():
    engine = create_engine(DATABASE_URL)
    if not inspect(engine).has_table("simulation_sessions"):
        print("simulation_sessions does not exist -- run migrate_add_simulation_table.py first.")
        sys.exit(1)
    cols = {c["name"] for c in inspect(engine).get_columns("simulation_sessions")}
    added = []
    with engine.begin() as conn:
        for name, col_type, default in NEW_COLUMNS:
            if name in cols:
                continue
            clause = f"ALTER TABLE simulation_sessions ADD COLUMN {name} {col_type}"
            if default is not None:
                clause += f" NOT NULL DEFAULT {default}"
            conn.execute(text(clause))
            added.append(name)
            print(f"added simulation_sessions.{name}")
        if "status" in added:
            # Rows created before v2 were one-shot runs that already finished.
            conn.execute(text(
                "UPDATE simulation_sessions SET status = 'completed', current_week = horizon_weeks"
            ))
    if not added:
        print("· simulation_sessions already has the v2 columns -- nothing to do.")


if __name__ == "__main__":
    main()
