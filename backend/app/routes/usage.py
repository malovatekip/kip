"""
Admin-only Anthropic API cost reporting, read from the api_usage_logs table
(written by app.services.usage_meter). Gives the real per-feature / per-day /
per-user cost that pricing decisions need.

GET /api/usage/summary?days=30
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.api_usage import ApiUsageLog
from app.security import get_current_admin

router = APIRouter()


@router.get("/summary")
def usage_summary(
    days: int = 30,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Totals and breakdowns of API spend over the last `days` days."""
    days = max(1, min(365, int(days)))
    since = datetime.utcnow() - timedelta(days=days)

    def rows(group_col):
        q = (
            db.query(
                group_col.label("key"),
                func.count(ApiUsageLog.id).label("calls"),
                func.coalesce(func.sum(ApiUsageLog.input_tokens), 0).label("input_tokens"),
                func.coalesce(func.sum(ApiUsageLog.output_tokens), 0).label("output_tokens"),
                func.coalesce(func.sum(ApiUsageLog.cache_read_tokens), 0).label("cache_read_tokens"),
                func.coalesce(func.sum(ApiUsageLog.cache_write_tokens), 0).label("cache_write_tokens"),
                func.coalesce(func.sum(ApiUsageLog.web_searches), 0).label("web_searches"),
                func.coalesce(func.sum(ApiUsageLog.cost_usd), 0.0).label("cost_usd"),
            )
            .filter(ApiUsageLog.created_at >= since)
            .group_by(group_col)
            .order_by(func.sum(ApiUsageLog.cost_usd).desc())
        )
        out = []
        for r in q.all():
            read, write, fresh = int(r.cache_read_tokens), int(r.cache_write_tokens), int(r.input_tokens)
            prompt_total = read + write + fresh   # input_tokens is only the uncached remainder
            out.append({
                "key": r.key, "calls": int(r.calls),
                "input_tokens": fresh, "output_tokens": int(r.output_tokens),
                "cache_read_tokens": read, "cache_write_tokens": write,
                # share of all prompt tokens served from cache -- the "is caching working" number
                "cache_hit_rate": round(read / prompt_total, 3) if prompt_total else 0.0,
                "web_searches": int(r.web_searches), "cost_usd": round(float(r.cost_usd), 4),
            })
        return out

    totals = (
        db.query(
            func.count(ApiUsageLog.id),
            func.coalesce(func.sum(ApiUsageLog.cost_usd), 0.0),
            func.coalesce(func.sum(ApiUsageLog.input_tokens), 0),
            func.coalesce(func.sum(ApiUsageLog.output_tokens), 0),
        )
        .filter(ApiUsageLog.created_at >= since)
        .one()
    )
    day_col = func.strftime("%Y-%m-%d", ApiUsageLog.created_at) \
        if db.bind and db.bind.dialect.name == "sqlite" \
        else func.to_char(ApiUsageLog.created_at, "YYYY-MM-DD")

    return {
        "window_days": days,
        "since": since.isoformat(),
        "totals": {
            "calls": int(totals[0]), "cost_usd": round(float(totals[1]), 4),
            "input_tokens": int(totals[2]), "output_tokens": int(totals[3]),
        },
        "by_feature": rows(ApiUsageLog.feature),
        "by_day": rows(day_col),
        "top_users": rows(ApiUsageLog.user_id)[:20],
    }
