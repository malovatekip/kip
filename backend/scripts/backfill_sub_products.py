"""
One-off backfill: populate business_ideas.allowed_sub_products for ideas that
pre-date the simulation foundation (column added by migrate_add_sub_products.py).

For every KIP-generated idea whose allowed_sub_products is still NULL, ask Claude
for exactly 4 complement products (sub_product_name, base_cost, suggested_price,
demand_expansion_factor) derived from the idea's name/category/description and
its unit economics, then write the column AND merge the list into structured_data
so the two stay in sync (mirrors kip_engine_v2._score_and_store).

Idempotent: rows that already have sub-products are skipped, so re-running only
fills what's still missing. Works against local SQLite and Neon via DATABASE_URL.

Usage:
    cd backend
    python scripts/backfill_sub_products.py
    # or against prod:
    DATABASE_URL="postgresql://..." python scripts/backfill_sub_products.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import anthropic
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import the related models too so SQLAlchemy can resolve BusinessIdea's
# relationship("User") when the mapper configures.
from app.models import user, conversation, idea_factors  # noqa: F401
from app.models.business_idea import BusinessIdea
from app.services.kip_prompt_v2 import _SUB_PRODUCT_SCHEMA

# Kept in sync with kip_engine_v2.MODEL by hand; importing that module here
# would pull in its heavy deps (chromadb/knowledge_base) this script doesn't need.
MODEL = "claude-sonnet-5"

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kip.db")

# Wrapper schema: exactly-4 is requested in the prompt and clipped in code
# (structured outputs don't enforce array size).
_WRAPPER_SCHEMA = {
    "type": "object",
    "properties": {"allowed_sub_products": {"type": "array", "items": _SUB_PRODUCT_SCHEMA}},
    "required": ["allowed_sub_products"],
    "additionalProperties": False,
}


def _sub_products_for(client, idea: BusinessIdea) -> list[dict]:
    sd = idea.structured_data or {}
    facts = {
        "name": idea.idea_name,
        "category": idea.category,
        "description": idea.idea_summary,
        "average_unit_price": sd.get("average_unit_price"),
        "cost_of_goods_sold_monthly": sd.get("cost_of_goods_sold_monthly"),
        "monthly_revenue_estimate": sd.get("monthly_revenue_estimate"),
    }
    prompt = (
        "You design complement products for a Zambian micro/small business.\n"
        "For the business below, return EXACTLY 4 complement products that a "
        "customer would naturally buy alongside the main product.\n"
        "base_cost = wholesale ZMW per unit, suggested_price = retail ZMW per "
        "unit (must exceed base_cost), demand_expansion_factor = decimal such "
        "as 0.10 for how much stocking it grows the total customer base N.\n"
        "All prices in ZMW and realistic for Zambia.\n\n"
        f"BUSINESS:\n{json.dumps(facts, indent=2)}"
    )
    resp = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        output_config={"format": {"type": "json_schema", "schema": _WRAPPER_SCHEMA}},
        messages=[{"role": "user", "content": prompt}],
    )
    text = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "")
    return (json.loads(text).get("allowed_sub_products") or [])[:4]


def main():
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your-anthropic-api-key-here":
        print("ANTHROPIC_API_KEY is not configured -- cannot backfill.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        todo = (
            db.query(BusinessIdea)
            .filter(BusinessIdea.generated_by_kip == True)  # noqa: E712
            .filter(BusinessIdea.allowed_sub_products.is_(None))
            .all()
        )
        print(f"{len(todo)} idea(s) need sub-products.")

        filled = 0
        for idea in todo:
            try:
                subs = _sub_products_for(client, idea)
            except Exception as e:
                print(f"  x id={idea.id} '{idea.idea_name}': {e}")
                continue
            if not subs:
                print(f"  x id={idea.id} '{idea.idea_name}': model returned none")
                continue
            idea.allowed_sub_products = subs
            # Keep structured_data in sync (reassign a new dict so SQLAlchemy
            # records the change).
            idea.structured_data = {**(idea.structured_data or {}), "allowed_sub_products": subs}
            db.commit()
            filled += 1
            print(f"  + id={idea.id} '{idea.idea_name}': {len(subs)} sub-products")

        print(f"Done. Backfilled {filled}/{len(todo)}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
