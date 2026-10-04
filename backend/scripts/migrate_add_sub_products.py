"""
Simulation foundation migration: add business_ideas.allowed_sub_products.

Idempotent -- adds the column only if it doesn't already exist, so it's safe to
re-run and works the same against the local SQLite dev DB and a Postgres (Neon)
production DB via DATABASE_URL. Column type is JSON on Postgres and TEXT on
SQLite (SQLite has no JSON column type; SQLAlchemy stores JSON as TEXT there).

The column holds a JSON list of exactly 4 complement products, each:
    sub_product_name, base_cost, suggested_price, demand_expansion_factor
read by the simulation engine's product-mix lever. Existing rows are left NULL;
run scripts/backfill_sub_products.py to populate them.

Usage:
    cd backend
    python scripts/migrate_add_sub_products.py
    # or against prod:
    DATABASE_URL="postgresql://..." python scripts/migrate_add_sub_products.py
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


def main():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("business_ideas")}

    if "allowed_sub_products" in cols:
        print("· business_ideas.allowed_sub_products already exists -- nothing to do.")
        return

    with engine.begin() as conn:
        conn.execute(text(
            f"ALTER TABLE business_ideas ADD COLUMN allowed_sub_products {JSON_T}"
        ))
    print(f"added business_ideas.allowed_sub_products ({JSON_T})")


if __name__ == "__main__":
    main()
