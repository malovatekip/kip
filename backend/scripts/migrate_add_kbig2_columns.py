"""
K-BIG-2 migration: add the new business_ideas / users columns needed by the
structured idea-generation engine and the admin-only dataset export.

Idempotent -- safe to re-run. Adds each column only if it doesn't already
exist, so it works the same way against the local SQLite dev DB and a
Postgres (Neon) production DB via DATABASE_URL. New tables (none needed by
this sprint) would still be handled by Base.metadata.create_all() at normal
app startup; this script only handles *columns added to existing tables*,
which create_all() does not do.

Usage:
    cd backend
    python scripts/migrate_add_kbig2_columns.py
    # or against prod:
    DATABASE_URL="postgresql://..." python scripts/migrate_add_kbig2_columns.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, inspect, text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kip.db")

# (table, column, SQL type, default_clause_or_None)
NEW_COLUMNS = [
    ("users", "is_admin", "BOOLEAN", "FALSE"),

    ("business_ideas", "category", "VARCHAR(100)", None),
    ("business_ideas", "structured_data", "JSON" if not DATABASE_URL.startswith("sqlite") else "TEXT", None),
    ("business_ideas", "viability_score", "FLOAT", None),
    ("business_ideas", "demand_score", "FLOAT", None),
    ("business_ideas", "financial_score", "FLOAT", None),
    ("business_ideas", "capital_fit_score", "FLOAT", None),
    ("business_ideas", "execution_fit_score", "FLOAT", None),
    ("business_ideas", "regulatory_score", "FLOAT", None),
    ("business_ideas", "competitive_score", "FLOAT", None),
    ("business_ideas", "asset_location_score", "FLOAT", None),
    ("business_ideas", "min_capital", "FLOAT", None),
    ("business_ideas", "recommended_capital_min", "FLOAT", None),
    ("business_ideas", "recommended_capital_max", "FLOAT", None),
    ("business_ideas", "capital_available_at_generation", "FLOAT", None),
    ("business_ideas", "skills_at_generation", "JSON" if not DATABASE_URL.startswith("sqlite") else "TEXT", None),
    ("business_ideas", "assets_at_generation", "JSON" if not DATABASE_URL.startswith("sqlite") else "TEXT", None),
]


def main():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)

    added, skipped = [], []
    with engine.begin() as conn:
        for table, column, col_type, default in NEW_COLUMNS:
            existing_cols = {c["name"] for c in inspector.get_columns(table)}
            if column in existing_cols:
                skipped.append(f"{table}.{column}")
                continue
            clause = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
            if default is not None:
                clause += f" DEFAULT {default}"
            conn.execute(text(clause))
            added.append(f"{table}.{column}")

    print(f"K-BIG-2 migration against: {DATABASE_URL}")
    print(f"  Added   ({len(added)}): {', '.join(added) if added else '(none)'}")
    print(f"  Skipped ({len(skipped)}, already present): {', '.join(skipped) if skipped else '(none)'}")


if __name__ == "__main__":
    main()
