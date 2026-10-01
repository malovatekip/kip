"""
Tests for the K-BIG-2 3-table flow: only the highest-V idea is returned,
Table 1 is cleared after the request (even on failure), and the public
dataset row carries no user data.
"""
import os
import sys
import types
from unittest import mock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# The engine imports the Claude SDK and the Chroma-backed knowledge base at
# module level; neither is needed to test scoring/storage.
sys.modules.setdefault("anthropic", types.ModuleType("anthropic"))
_kb = types.ModuleType("app.services.knowledge_base")
_kb.get_knowledge_base = lambda: None
sys.modules.setdefault("app.services.knowledge_base", _kb)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import user as user_model, conversation  # noqa: F401
from app.models.business_idea import BusinessIdea
from app.models.idea_factors import IdeaGlobalFactors, UserSessionFactors
from app.services import kip_engine_v2 as eng


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    u = user_model.User(email="t@example.com", full_name="T", hashed_password="x")
    session.add(u)
    session.commit()
    yield session, u
    session.close()


def _idea(name, buyers, margin_cogs, exec_fit):
    return {
        "name": name, "category": "retail_and_trade", "description": "d",
        "min_capital": 1000, "recommended_capital_min": 1000, "recommended_capital_max": 2000,
        "total_target_buyers": buyers, "consumption_frequency_per_year": 12,
        "average_unit_price": 50, "monthly_revenue_estimate": 10000,
        "cost_of_goods_sold_monthly": margin_cogs, "break_even_months": 3,
        "operational_risks": ["flooding"], "environmental_risk_score": 4,
        "execution_fit_score": exec_fit, "competitive_position_score": 5,
        "regulatory_risk_score": 5, "asset_location_score": 5,
    }


PROFILE = {"capital_available": 1000, "location": "Lusaka", "skills": ["sales"], "assets": ["shop"]}


def test_only_highest_viability_idea_is_returned(db):
    session, u = db
    ideas = [_idea("weak", 100, 9000, 2), _idea("strong", 100000, 3000, 9), _idea("mid", 5000, 6000, 5)]
    result = eng._score_and_store(ideas, PROFILE, u, session, "req-1")
    assert [r["idea_name"] for r in result] == ["strong"]
    assert session.query(BusinessIdea).count() == 3          # all 3 in public table
    assert session.query(IdeaGlobalFactors).count() == 3     # Table 2 grows
    shown = session.query(BusinessIdea).filter(BusinessIdea.shown_to_user == True).all()  # noqa: E712
    assert [i.idea_name for i in shown] == ["strong"]


def test_public_row_has_no_user_data_or_user_scores(db):
    session, u = db
    eng._score_and_store([_idea("a", 1000, 5000, 7)], PROFILE, u, session, "req-2")
    row = session.query(BusinessIdea).one()
    assert row.location is None and row.capital_amount is None and row.skills is None
    for k in eng.USER_SCORE_FIELDS:
        assert k not in row.structured_data
    assert not hasattr(BusinessIdea, "viability_score")
    assert row.operational_risks == ["flooding"]
    assert row.status == "pending"


def _run_generate(session, u, ideas, score_side_effect=None):
    """Drive generate_structured_ideas with the Claude call mocked out."""
    import json
    block = types.SimpleNamespace(type="text", text=json.dumps({"ideas": ideas}))
    response = types.SimpleNamespace(content=[block], stop_reason="end_turn")
    stream = mock.MagicMock()
    stream.__enter__.return_value.get_final_message.return_value = response
    client = mock.MagicMock()
    client.messages.stream.return_value = stream
    kb = mock.MagicMock()
    kb.search.return_value = ""
    patches = [
        mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "k"}),
        mock.patch.object(eng, "anthropic", create=True),
        mock.patch.object(eng, "get_knowledge_base", return_value=kb),
        mock.patch.object(eng, "get_town_profile", return_value=""),
        mock.patch.object(eng, "get_map_context", return_value=""),
    ]
    if score_side_effect:
        patches.append(mock.patch.object(eng.ve, "calculate_viability", side_effect=score_side_effect))
    from contextlib import ExitStack
    with ExitStack() as st:
        mocks = [st.enter_context(p) for p in patches]
        mocks[1].Anthropic.return_value = client
        return eng.generate_structured_ideas(PROFILE, u, session)


def test_table1_empty_after_generate(db):
    session, u = db
    result = _run_generate(session, u, [_idea("a", 1000, 5000, 7), _idea("b", 9000, 4000, 8)])
    assert len(result) == 1
    assert session.query(UserSessionFactors).count() == 0
    assert session.query(IdeaGlobalFactors).count() == 2


def test_table1_empty_when_scoring_fails(db):
    session, u = db
    with pytest.raises(RuntimeError):
        _run_generate(session, u, [_idea("a", 1000, 5000, 7)], score_side_effect=RuntimeError("boom"))
    assert session.query(UserSessionFactors).count() == 0
