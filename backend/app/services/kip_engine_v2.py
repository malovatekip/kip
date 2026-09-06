"""
K-BIG-2 -- KIP Business Idea Generation Engine v2 (structured, viability-scored)
=================================================================================
Implements the sprint's 3-step generation flow:
  1. Generate 3 business ideas using the k-big-1 method (same Zambia-context
     building blocks as kip_engine.py -- knowledge base RAG, town profile,
     the k-big-1 identity/economic constants -- packaged for structured
     JSON output instead of a single markdown reply).
  2. Add these ideas to the shared dataset (BusinessIdea rows, visible to
     every future k-big-2 request, not just this user).
  3. Open the entire dataset of ideas to look for the most viable match for
     *this* requester's profile (see viability_engine.py + the module
     docstring there for how D/F/S/R vs C/E/A are split between
     idea-intrinsic and requester-specific).

k-big-1's own kip_engine.py / kip_prompt.py are not modified by this file.
"""
import json
import os

import anthropic

from app.services.kip_prompt_v2 import (
    build_system_prompt_v2,
    build_user_message_v2,
    IDEAS_WRAPPER_SCHEMA,
)
from app.services.knowledge_base import get_knowledge_base
from app.services import viability_engine as ve
from app.data.town_profiles import get_town_profile
from app.services.map_service import get_map_context
from app.models.business_idea import BusinessIdea

MODEL = "claude-sonnet-5"
TOP_N_RESULTS = 6
MAX_RESCAN_ROWS = 500  # cap how many historical ideas get re-scored per request


def _extract_json_text(response) -> str:
    for block in response.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""


def _idea_intrinsic_scores(idea: dict) -> dict:
    """D, F computed from the idea's own numeric fields; C is intentionally
    NOT computed here since capital fit depends on the requester, not the
    idea. S/R come straight from the model's own self-assessment (they're
    market-intrinsic, not requester-specific, so they're safe to reuse
    as-is for every future requester)."""
    demand_score, raw_demand = ve.calculate_demand(
        total_target_buyers=idea.get("total_target_buyers"),
        consumption_frequency_per_year=idea.get("consumption_frequency_per_year"),
        average_unit_price=idea.get("average_unit_price"),
        category=idea.get("category"),
    )
    financial_score = ve.calculate_financial(
        total_revenue=idea.get("monthly_revenue_estimate"),
        cost_of_goods_sold=idea.get("cost_of_goods_sold_monthly"),
    )
    return {
        "demand_score": demand_score,
        "raw_demand": raw_demand,
        "financial_score": financial_score,
        "competitive_score": float(idea.get("competitive_position_score", 5)),
        "regulatory_score": float(idea.get("regulatory_risk_score", 5)),
    }


def generate_structured_ideas(profile: dict, user, db) -> list[dict]:
    """
    profile: {
        "capital_available": float | None,   # None == limitless
        "location": str,
        "skills": list[str],
        "assets": list[str],
    }
    Returns the ranked list (new + rescanned dataset) as plain dicts, ready
    for the API response -- see routes/ideas.py::generate_idea.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your-anthropic-api-key-here":
        raise RuntimeError("ANTHROPIC_API_KEY is not configured -- k-big-2 cannot generate ideas.")

    location = profile.get("location") or ""
    skills = profile.get("skills") or []

    # ── Same Zambia-context building blocks as k-big-1 ──────────────────
    kb = get_knowledge_base()
    retrieved_knowledge = kb.search(f"{location} {' '.join(skills)}".strip(), top_k=4)

    town_profile = get_town_profile(location) if location else ""
    map_context = get_map_context(location) if location else ""
    combined_location = "\n\n".join(filter(None, [town_profile, map_context]))

    recent = (
        db.query(BusinessIdea)
        .filter(BusinessIdea.generated_by_kip == True)  # noqa: E712
        .order_by(BusinessIdea.created_at.desc())
        .limit(15)
        .all()
    )
    idea_history = "\n".join(f"  - {i.idea_name} ({i.category or 'uncategorized'})" for i in recent)

    system_prompt = build_system_prompt_v2(
        retrieved_knowledge=retrieved_knowledge,
        town_profile=combined_location,
        user_idea_history=idea_history,
    )
    user_message = build_user_message_v2(profile)

    client = anthropic.Anthropic(api_key=api_key)
    # 3 detailed structured ideas plus adaptive thinking can comfortably
    # exceed ~16K tokens, so this must stream (the SDK raises/guards against
    # large non-streaming requests to avoid HTTP timeouts).
    with client.messages.stream(
        model=MODEL,
        max_tokens=32000,
        system=system_prompt,
        output_config={
            "effort": "high",
            "format": {"type": "json_schema", "schema": IDEAS_WRAPPER_SCHEMA},
        },
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        response = stream.get_final_message()

    if response.stop_reason == "max_tokens":
        raise RuntimeError("k-big-2 generation was truncated (hit max_tokens) -- try again.")

    raw_text = _extract_json_text(response)
    parsed = json.loads(raw_text)
    new_ideas_data = (parsed.get("ideas") or [])[:3]

    # ── Step 2: persist the 3 new ideas ──────────────────────────────────
    new_rows: list[BusinessIdea] = []
    for idea in new_ideas_data:
        scores = _idea_intrinsic_scores(idea)
        capital_available = profile.get("capital_available")
        capital_required = idea.get("min_capital") or idea.get("recommended_capital_min")
        capital_fit_score = ve.calculate_capital_fit(capital_available, capital_required)
        execution_fit_score = float(idea.get("execution_fit_score", 5))
        asset_location_score = float(idea.get("asset_location_score", 5))

        viability_score = ve.calculate_viability(
            D=scores["demand_score"],
            F=scores["financial_score"],
            C=capital_fit_score,
            E=execution_fit_score,
            R=scores["regulatory_score"],
            S=scores["competitive_score"],
            A=asset_location_score,
        )

        row = BusinessIdea(
            user_id=user.id,
            idea_name=idea.get("name", "Untitled Business Idea")[:255],
            idea_summary=(idea.get("description") or "")[:2000],
            full_response=json.dumps(idea),
            location=location or None,
            capital_amount=capital_available,
            skills=", ".join(skills) if skills else None,
            generated_by_kip=True,
            accepted=None,
            category=idea.get("category"),
            structured_data=idea,
            viability_score=viability_score,
            demand_score=scores["demand_score"],
            financial_score=scores["financial_score"],
            capital_fit_score=capital_fit_score,
            execution_fit_score=execution_fit_score,
            regulatory_score=scores["regulatory_score"],
            competitive_score=scores["competitive_score"],
            asset_location_score=asset_location_score,
            min_capital=idea.get("min_capital"),
            recommended_capital_min=idea.get("recommended_capital_min"),
            recommended_capital_max=idea.get("recommended_capital_max"),
            capital_available_at_generation=capital_available,
            skills_at_generation=skills,
            assets_at_generation=profile.get("assets") or [],
        )
        db.add(row)
        new_rows.append(row)

    db.commit()
    for row in new_rows:
        db.refresh(row)
    new_ids = {row.id for row in new_rows}

    # ── Step 3: open the entire dataset, re-rank for this requester ─────
    ranked = [_row_to_result(row, row.viability_score, is_new=True) for row in new_rows]

    existing_query = db.query(BusinessIdea).filter(
        BusinessIdea.generated_by_kip == True,  # noqa: E712
        BusinessIdea.structured_data.isnot(None),
    )
    if new_ids:
        existing_query = existing_query.filter(~BusinessIdea.id.in_(new_ids))
    existing = existing_query.order_by(BusinessIdea.created_at.desc()).limit(MAX_RESCAN_ROWS).all()

    for row in existing:
        data = row.structured_data or {}
        capital_required = row.min_capital or row.recommended_capital_min
        recomputed_capital_fit = ve.calculate_capital_fit(profile.get("capital_available"), capital_required)
        recomputed_execution_fit = ve.estimate_execution_fit(data.get("required_skills"), skills)
        recomputed_asset_location = ve.estimate_asset_location_fit(
            data.get("required_assets"), profile.get("assets"), data.get("location_fit"), location
        )
        recomputed_viability = ve.calculate_viability(
            D=row.demand_score or 0,
            F=row.financial_score or 0,
            C=recomputed_capital_fit,
            E=recomputed_execution_fit,
            R=row.regulatory_score or 0,
            S=row.competitive_score or 0,
            A=recomputed_asset_location,
        )
        # Recomputed scores are used only for this response's ranking --
        # the row's own stored scores (reflecting its original requester)
        # are never overwritten here.
        ranked.append(_row_to_result(row, recomputed_viability, is_new=False))

    ranked.sort(key=lambda r: r["viability_score"], reverse=True)
    return ranked[:TOP_N_RESULTS]


def _row_to_result(row: BusinessIdea, viability_score: float, is_new: bool) -> dict:
    return {
        "id": row.id,
        "idea_name": row.idea_name,
        "category": row.category,
        "idea_summary": row.idea_summary,
        "viability_score": viability_score,
        "min_capital": row.min_capital,
        "recommended_capital_min": row.recommended_capital_min,
        "recommended_capital_max": row.recommended_capital_max,
        "is_new": is_new,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
