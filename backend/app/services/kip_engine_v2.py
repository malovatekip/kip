"""
K-BIG-2 -- KIP Business Idea Generation Engine v2 (structured, viability-scored)
=================================================================================
Flow (3-table isolation):
  1. Claude generates 3 ideas (k-big-1 method) with qualitative scores.
  2. Table 2 (idea_global_factors, permanent) gets the global factors plus the
     engine-computed D and F; Table 3 (business_ideas, the public dataset)
     gets the idea with NO user data and NO viability score; Table 1
     (user_session_factors) holds this requester's factors.
  3. The viability engine combines D, F (Table 2) with C, E, R, S, A (Table 1)
     per idea; only the highest-V idea is returned. V is never stored.
  4. The winner's Table 1 row PERSISTS -- the simulation engine later reads its
     C/E/R/S/A static baseline alongside D/F. Only the two losing (unshown)
     candidates' Table 1 rows are deleted; on request failure all are deleted.

k-big-1's own kip_engine.py / kip_prompt.py are not modified by this file.
"""
import json
import os
import uuid

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
from app.models.idea_factors import IdeaGlobalFactors, UserSessionFactors

MODEL = "claude-sonnet-5"
# Qualitative scores that depend on the requester: used for the viability
# calculation (Table 1) but never written to the public dataset.
USER_SCORE_FIELDS = (
    "execution_fit_score", "competitive_position_score",
    "regulatory_risk_score", "asset_location_score",
)


def _extract_json_text(response) -> str:
    for block in response.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""


def generate_structured_ideas(profile: dict, user, db) -> list[dict]:
    """
    profile: {
        "capital_available": float | None,   # None == limitless
        "location": str,
        "skills": list[str],
        "assets": list[str],
    }
    Returns a one-element list holding the single highest-viability idea, ready
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
    map_context = get_map_context(location, db) if location else ""
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

    # ── Steps 2-3: Table 2 (global) + Table 1 (session) + Table 3 (public) ───
    request_id = str(uuid.uuid4())
    try:
        # _score_and_store keeps the winner's Table 1 row and deletes the two
        # losing candidates' rows itself.
        return _score_and_store(new_ideas_data, profile, user, db, request_id)
    except Exception:
        # On failure, leave nothing behind: drop every Table 1 row for this
        # request (rollback first so a half-written transaction can't block the
        # delete), then re-raise.
        db.rollback()
        db.query(UserSessionFactors).filter(UserSessionFactors.request_id == request_id).delete()
        db.commit()
        raise


def _public_structured_data(idea: dict) -> dict:
    """Strip requester-dependent qualitative scores before the idea goes into
    the public dataset (E and A depend on the user; R/S are kept out too so the
    public table never carries a per-request score)."""
    return {k: v for k, v in idea.items() if k not in USER_SCORE_FIELDS}


def _score_and_store(ideas: list[dict], profile: dict, user, db, request_id: str) -> list[dict]:
    location = profile.get("location") or ""
    skills = profile.get("skills") or []
    assets = profile.get("assets") or []
    capital_available = profile.get("capital_available")

    candidates = []  # (idea_row, D, F, C, E, R, S, A)
    for idea in ideas:
        capital_required = idea.get("min_capital") or idea.get("recommended_capital_min")
        D, _raw = ve.calculate_demand(
            total_target_buyers=idea.get("total_target_buyers"),
            consumption_frequency_per_year=idea.get("consumption_frequency_per_year"),
            average_unit_price=idea.get("average_unit_price"),
            category=idea.get("category"),
        )
        F = ve.calculate_financial(
            total_revenue=idea.get("monthly_revenue_estimate"),
            cost_of_goods_sold=idea.get("cost_of_goods_sold_monthly"),
        )

        # Table 3 -- public dataset row: no user data, no viability score.
        row = BusinessIdea(
            user_id=user.id,  # private ownership link only; never exported
            idea_name=idea.get("name", "Untitled Business Idea")[:255],
            idea_summary=(idea.get("description") or "")[:2000],
            full_response=json.dumps(_public_structured_data(idea)),
            generated_by_kip=True,
            accepted=None,
            status="pending",
            shown_to_user=False,  # flipped to True for the winner below
            category=idea.get("category"),
            structured_data=_public_structured_data(idea),
            min_capital=idea.get("min_capital"),
            recommended_capital_min=idea.get("recommended_capital_min"),
            recommended_capital_max=idea.get("recommended_capital_max"),
            operational_risks=idea.get("operational_risks") or [],
            # Global/public simulation lookup -- exactly 4 complements; clip if
            # the model returned more/fewer (array size isn't schema-enforced).
            allowed_sub_products=(idea.get("allowed_sub_products") or [])[:4],
        )
        db.add(row)
        db.flush()  # assigns row.id

        # Table 2 -- global factors plus D and F.
        db.add(IdeaGlobalFactors(
            idea_id=row.id,
            capital_required=capital_required,
            total_target_buyers=idea.get("total_target_buyers"),
            consumption_frequency_per_year=idea.get("consumption_frequency_per_year"),
            average_unit_price=idea.get("average_unit_price"),
            monthly_revenue_estimate=idea.get("monthly_revenue_estimate"),
            cost_of_goods_sold_monthly=idea.get("cost_of_goods_sold_monthly"),
            break_even_months=idea.get("break_even_months"),
            environmental_risk_score=float(idea.get("environmental_risk_score", 5)),
            demand_score=D,
            financial_score=F,
        ))

        # Table 1 -- temporary user/local factors for this request.
        C = ve.calculate_capital_fit(capital_available, capital_required)
        E = float(idea.get("execution_fit_score", 5))
        R = float(idea.get("regulatory_risk_score", 5))
        S = float(idea.get("competitive_position_score", 5))
        A = float(idea.get("asset_location_score", 5))
        db.add(UserSessionFactors(
            request_id=request_id, user_id=user.id, idea_id=row.id,
            capital_available=capital_available, skills=skills, assets=assets,
            location=location or None,
            capital_fit_score=C, execution_fit_score=E, regulatory_score=R,
            competitive_position_score=S, asset_location_score=A,
        ))
        candidates.append(row)
    db.commit()

    # ── Viability engine: D, F from Table 2; C, E, R, S, A from Table 1 ─────
    scored = []
    for row in candidates:
        g = db.query(IdeaGlobalFactors).filter(IdeaGlobalFactors.idea_id == row.id).one()
        u = (
            db.query(UserSessionFactors)
            .filter(UserSessionFactors.request_id == request_id, UserSessionFactors.idea_id == row.id)
            .one()
        )
        v = ve.calculate_viability(
            D=g.demand_score, F=g.financial_score,
            C=u.capital_fit_score, E=u.execution_fit_score, R=u.regulatory_score,
            S=u.competitive_position_score, A=u.asset_location_score,
        )
        scored.append((v, row))  # V lives in memory only -- never persisted

    if not scored:
        return []
    best_v, winner = max(scored, key=lambda t: t[0])
    winner.shown_to_user = True
    # Keep the winner's Table 1 row permanently (the simulation engine reads its
    # C/E/R/S/A baseline); discard the two unshown losing candidates' rows.
    db.query(UserSessionFactors).filter(
        UserSessionFactors.request_id == request_id,
        UserSessionFactors.idea_id != winner.id,
    ).delete(synchronize_session=False)
    db.commit()
    db.refresh(winner)
    return [_row_to_result(winner, best_v, is_new=True)]


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
