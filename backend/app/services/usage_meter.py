"""
Anthropic API cost metering.

Every Claude call returns `response.usage`; this module turns that into a dollar
figure and records one `ApiUsageLog` row, so real per-feature / per-user / per-day
cost can be read back (see app/routes/usage.py) instead of estimated.

`record_usage()` is deliberately best-effort: it opens its own short-lived DB
session and swallows every error, so cost logging can never break a user request.

Prices are Anthropic first-party USD per 1M tokens (Claude API reference, 2026).
Update PRICES if models or rates change.
"""
import logging

logger = logging.getLogger("kip.usage")

# USD per 1,000,000 tokens. cache_read ~= 0.1x input; cache write ~= 1.25x input.
PRICES = {
    "claude-sonnet-5":    {"in": 2.0,  "out": 10.0, "cache_read": 0.20},
    "claude-sonnet-5-5":  {"in": 2.0,  "out": 10.0, "cache_read": 0.20},
    "claude-sonnet-4-6":  {"in": 3.0,  "out": 15.0, "cache_read": 0.30},
    "claude-haiku-4-5":   {"in": 1.0,  "out": 5.0,  "cache_read": 0.10},
    "claude-opus-5-5":    {"in": 4.0,  "out": 20.0, "cache_read": 0.20},
    "claude-opus-5":      {"in": 5.0,  "out": 25.0, "cache_read": 0.50},
}
_FALLBACK_PRICE = {"in": 3.0, "out": 15.0, "cache_read": 0.30}  # unknown model -> assume Sonnet-4.6 tier
CACHE_WRITE_MULTIPLIER = 1.25     # cache creation costs ~1.25x the input rate
WEB_SEARCH_USD = 0.01             # ~$10 per 1,000 web searches


def _price(model):
    return PRICES.get(model or "", _FALLBACK_PRICE)


def extract_usage(response) -> dict:
    """Pull token/search counts off a Messages response's `.usage`, defensively."""
    u = getattr(response, "usage", None)
    g = lambda name: int(getattr(u, name, 0) or 0) if u is not None else 0
    web = 0
    stu = getattr(u, "server_tool_use", None) if u is not None else None
    if stu is not None:
        web = int(getattr(stu, "web_search_requests", 0) or 0)
    return {
        "input_tokens": g("input_tokens"),
        "output_tokens": g("output_tokens"),
        "cache_read_tokens": g("cache_read_input_tokens"),
        "cache_write_tokens": g("cache_creation_input_tokens"),
        "web_searches": web,
    }


def estimate_cost(model: str, usage: dict) -> float:
    """USD cost of one call from its token/search counts (pure, unit-testable)."""
    p = _price(model)
    return round(
        usage.get("input_tokens", 0) / 1e6 * p["in"]
        + usage.get("output_tokens", 0) / 1e6 * p["out"]
        + usage.get("cache_read_tokens", 0) / 1e6 * p["cache_read"]
        + usage.get("cache_write_tokens", 0) / 1e6 * p["in"] * CACHE_WRITE_MULTIPLIER
        + usage.get("web_searches", 0) * WEB_SEARCH_USD,
        6,
    )


def record_usage(feature: str, model: str, response, user_id=None, request_id=None) -> None:
    """Record one API call's cost. Never raises -- logging must not break a request."""
    try:
        usage = extract_usage(response)
        known = (model or "") in PRICES
        cost = estimate_cost(model, usage) if known else None
        rid = request_id or getattr(response, "_request_id", None)

        logger.info(
            "api_usage feature=%s model=%s in=%d out=%d cache_r=%d cache_w=%d web=%d cost_usd=%s user=%s",
            feature, model, usage["input_tokens"], usage["output_tokens"],
            usage["cache_read_tokens"], usage["cache_write_tokens"], usage["web_searches"],
            f"{cost:.6f}" if cost is not None else "unknown", user_id,
        )

        from app.database import SessionLocal
        from app.models.api_usage import ApiUsageLog
        db = SessionLocal()
        try:
            db.add(ApiUsageLog(
                user_id=user_id, feature=feature, model=model,
                input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
                cache_read_tokens=usage["cache_read_tokens"], cache_write_tokens=usage["cache_write_tokens"],
                web_searches=usage["web_searches"], cost_usd=cost,
                request_id=str(rid)[:64] if rid else None,
            ))
            db.commit()
        finally:
            db.close()
    except Exception as e:  # noqa: BLE001 -- metering is best-effort
        logger.warning("record_usage failed for feature=%s: %s", feature, e)
