"""
K-BIG-2 3-table migration. Idempotent. BACK UP the database first.

1. Adds business_ideas.status / shown_to_user / operational_risks.
2. Creates idea_global_factors and user_session_factors (create_all).
3. Backfills idea_global_factors (incl. D and F) from existing K-BIG-2 rows.
4. Scrubs user-specific data from the public table: NULLs the old viability /
   sub-score / *_at_generation columns, location, capital_amount and skills on
   K-BIG-2 rows, and strips requester-dependent scores out of structured_data.
5. Sets status from the legacy `accepted` boolean.

The legacy columns are NULLed, not dropped (dropping columns is unsafe on
SQLite); the ORM model no longer maps them.

Usage:
    cd backend
    python scripts/migrate_kbig2_three_table.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, inspect, text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kip.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")
JSON_T = "TEXT" if IS_SQLITE else "JSON"
BOOL_TRUE = "1" if IS_SQLITE else "TRUE"

NEW_COLUMNS = [
    ("business_ideas", "status", "VARCHAR(20)", "'pending'"),
    ("business_ideas", "shown_to_user", "BOOLEAN", BOOL_TRUE),
    ("business_ideas", "operational_risks", JSON_T, None),
]
LEGACY_COLUMNS = [
    "viability_score", "demand_score", "financial_score", "capital_fit_score",
    "execution_fit_score", "regulatory_score", "competitive_score",
    "asset_location_score", "capital_available_at_generation",
    "skills_at_generation", "assets_at_generation",
]
USER_SCORE_KEYS = (
    "execution_fit_score", "competitive_position_score",
    "regulatory_risk_score", "asset_location_score",
)


def main():
    from app.database import Base
    from app.models import user, conversation, business_idea, idea_factors  # noqa: F401
    from app.services import viability_engine as ve

    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)  # new tables (Tables 1 and 2)

    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("business_ideas")}

    with engine.begin() as conn:
        for table, column, col_type, default in NEW_COLUMNS:
            if column not in cols:
                clause = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
                if default is not None:
                    clause += f" DEFAULT {default}"
                conn.execute(text(clause))
                print(f"added {table}.{column}")

        # status from legacy accepted flag
        conn.execute(text(
            "UPDATE business_ideas SET status = CASE "
            "WHEN accepted IS NULL THEN 'pending' "
            f"WHEN accepted = {BOOL_TRUE} THEN 'accepted' ELSE 'declined' END"
        ))

        rows = conn.execute(text(
            "SELECT id, structured_data FROM business_ideas "
            "WHERE generated_by_kip AND structured_data IS NOT NULL"
        )).fetchall()

        backfilled = 0
        for idea_id, raw in rows:
            data = json.loads(raw) if isinstance(raw, str) else (raw or {})
            exists = conn.execute(
                text("SELECT 1 FROM idea_global_factors WHERE idea_id = :i"), {"i": idea_id}
            ).first()
            if not exists:
                D, _ = ve.calculate_demand(
                    data.get("total_target_buyers"),
                    data.get("consumption_frequency_per_year"),
                    data.get("average_unit_price"),
                    data.get("category"),
                )
                F = ve.calculate_financial(
                    data.get("monthly_revenue_estimate"), data.get("cost_of_goods_sold_monthly")
                )
                conn.execute(text(
                    "INSERT INTO idea_global_factors (idea_id, capital_required, total_target_buyers, "
                    "consumption_frequency_per_year, average_unit_price, monthly_revenue_estimate, "
                    "cost_of_goods_sold_monthly, break_even_months, environmental_risk_score, "
                    "demand_score, financial_score, created_at) VALUES "
                    "(:i, :cr, :n, :q, :p, :rev, :cogs, :be, NULL, :d, :f, CURRENT_TIMESTAMP)"
                ), {
                    "i": idea_id,
                    "cr": data.get("min_capital") or data.get("recommended_capital_min"),
                    "n": data.get("total_target_buyers"),
                    "q": data.get("consumption_frequency_per_year"),
                    "p": data.get("average_unit_price"),
                    "rev": data.get("monthly_revenue_estimate"),
                    "cogs": data.get("cost_of_goods_sold_monthly"),
                    "be": data.get("break_even_months"),
                    "d": D, "f": F,
                })
                backfilled += 1

            clean = {k: v for k, v in data.items() if k not in USER_SCORE_KEYS}
            clean_json = json.dumps(clean)
            # Separate params: Postgres can't deduce one type for a JSON and a TEXT column.
            sd_expr = ":s" if IS_SQLITE else "CAST(:s AS JSON)"
            conn.execute(
                text(f"UPDATE business_ideas SET structured_data = {sd_expr}, full_response = :f, "
                     "location = NULL, capital_amount = NULL, skills = NULL WHERE id = :i"),
                {"s": clean_json, "f": clean_json, "i": idea_id},
            )

        for col in LEGACY_COLUMNS:
            if col in cols:
                conn.execute(text(f"UPDATE business_ideas SET {col} = NULL"))

    print(f"Backfilled idea_global_factors rows: {backfilled}")
    print(f"Scrubbed {len(rows)} K-BIG-2 rows of user-specific data.")


if __name__ == "__main__":
    main()
