"""
briefings.py  —  FastAPI router
────────────────────────────────
Mounts under the existing /api/news prefix.

Research is generated once on a schedule (see main.py's briefing scheduler)
and shared by every user via these read-only endpoints — no user request
triggers new research, so token usage doesn't scale with traffic.

Endpoints:
  GET  /api/news/briefings          — fetch today's cached briefings
  GET  /api/news/briefings/status   — metadata about the most recent run
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import get_current_user   # adjust to your auth dependency
from app.models.user import User
from app.models.models_briefing import EconomicBriefing
from app.services import briefing_service

router = APIRouter()


@router.get("/briefings")
async def get_briefings(
    date: Optional[str] = Query(None, description="YYYY-MM-DD — defaults to today"),
    db:   Session       = Depends(get_db),
    _user               = Depends(get_current_user),
):
    """
    Return cached briefings for a given date (defaults to today).
    If no briefings exist for today, returns the most recent available day
    so the page is never empty.
    """
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    briefings = (
        db.query(EconomicBriefing)
          .filter(EconomicBriefing.generated_date == target_date)
          .order_by(EconomicBriefing.importance.desc(), EconomicBriefing.id.asc())
          .all()
    )

    # Fall back to most recent date if today has no briefings yet
    if not briefings:
        latest = (
            db.query(EconomicBriefing)
              .order_by(EconomicBriefing.generated_at.desc())
              .first()
        )
        if latest:
            briefings = (
                db.query(EconomicBriefing)
                  .filter(EconomicBriefing.generated_date == latest.generated_date)
                  .order_by(EconomicBriefing.importance.desc(), EconomicBriefing.id.asc())
                  .all()
            )

    return {
        "briefings":      [b.to_dict() for b in briefings],
        "count":          len(briefings),
        "date":           target_date,
        "generated_date": briefings[0].generated_date if briefings else None,
        "generated_at":   briefings[0].generated_at.isoformat() if briefings else None,
    }


@router.get("/briefings/status")
async def briefing_status(
    db:    Session = Depends(get_db),
    _user          = Depends(get_current_user),
):
    """
    Returns metadata about the most recent briefing run.
    Used by the frontend to show 'Last updated X hours ago'.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    count_today = (
        db.query(EconomicBriefing)
          .filter(EconomicBriefing.generated_date == today)
          .count()
    )

    latest = (
        db.query(EconomicBriefing)
          .order_by(EconomicBriefing.generated_at.desc())
          .first()
    )

    return {
        "is_running":      briefing_service._generation_running,
        "count_today":     count_today,
        "last_generated":  latest.generated_at.isoformat() if latest else None,
        "last_date":       latest.generated_date if latest else None,
    }
