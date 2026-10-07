"""
Unit tests for app.services.usage_meter: the cost math, and that record_usage
writes one row and never raises. Runs under pytest or directly:
    python tests/test_usage_meter.py
"""
import glob
import os
import sys
import types

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import usage_meter as um


def _usage(**kw):
    """A stand-in for response.usage with the fields the SDK returns."""
    base = dict(input_tokens=0, output_tokens=0,
                cache_read_input_tokens=0, cache_creation_input_tokens=0)
    base.update(kw)
    return types.SimpleNamespace(**base)


def _response(**kw):
    return types.SimpleNamespace(usage=_usage(**kw), _request_id="req_test")


# ── cost math ────────────────────────────────────────────────────────────────
def test_cost_sonnet5_input_output():
    # 10k in @ $2/1M + 20k out @ $10/1M = 0.02 + 0.20 = 0.22
    u = um.extract_usage(_response(input_tokens=10_000, output_tokens=20_000))
    assert um.estimate_cost("claude-sonnet-5", u) == 0.22


def test_cost_sonnet46_is_pricier():
    u = um.extract_usage(_response(input_tokens=10_000, output_tokens=2_000))
    # 10k @ $3/1M + 2k @ $15/1M = 0.03 + 0.03 = 0.06
    assert um.estimate_cost("claude-sonnet-4-6", u) == 0.06


def test_cost_includes_cache_and_web_search():
    resp = _response(input_tokens=1_000, output_tokens=0, cache_read_input_tokens=100_000)
    resp.usage.server_tool_use = types.SimpleNamespace(web_search_requests=3)
    u = um.extract_usage(resp)
    assert u["web_searches"] == 3
    # 1k in @ $2/1M (0.002) + 100k cache_read @ $0.20/1M (0.02) + 3 * 0.01 (0.03) = 0.052
    assert um.estimate_cost("claude-sonnet-5", u) == 0.052


def test_unknown_model_uses_fallback_price():
    u = um.extract_usage(_response(input_tokens=1_000_000, output_tokens=0))
    assert um.estimate_cost("something-new", u) == 3.0  # fallback input rate


# ── record_usage persistence + safety ────────────────────────────────────────
def _memory_db():
    os.environ["DATABASE_URL"] = "sqlite://"
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    import app.database as database
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.engine = eng
    TL = sessionmaker(bind=eng)
    database.SessionLocal = TL
    from app.database import Base
    import importlib
    for f in glob.glob(os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "models", "*.py")):
        name = os.path.basename(f)[:-3]
        if name != "__init__":
            importlib.import_module(f"app.models.{name}")
    Base.metadata.create_all(eng)
    return TL


def test_record_usage_writes_row():
    TL = _memory_db()
    from app.models.api_usage import ApiUsageLog
    resp = _response(input_tokens=4000, output_tokens=12000)
    um.record_usage("kbig2_structured", "claude-sonnet-5", resp, user_id=7)
    db = TL()
    try:
        rows = db.query(ApiUsageLog).all()
        assert len(rows) == 1
        r = rows[0]
        assert r.feature == "kbig2_structured" and r.user_id == 7
        assert r.input_tokens == 4000 and r.output_tokens == 12000
        assert abs(r.cost_usd - (4000/1e6*2 + 12000/1e6*10)) < 1e-9
    finally:
        db.close()


def test_record_usage_never_raises_on_bad_response():
    _memory_db()
    # No .usage attribute at all -> must not raise and must not write a row.
    before_fail = um.record_usage("kbig1_chat", "claude-sonnet-4-6", object(), user_id=1)
    assert before_fail is None  # swallowed


if __name__ == "__main__":
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"PASS {name}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {name}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
