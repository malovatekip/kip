"""
briefings.py  —  FastAPI router
────────────────────────────────
Mounts under the existing /api/news prefix.

ADD to your main.py / app factory:
    from app.routes.briefings import router as briefings_router
    app.include_router(briefings_router, prefix="/api/news", tags=["briefings"])

Also add the daily scheduler call — see SCHEDULER SETUP section at bottom.

Endpoints:
  GET  /api/news/briefings           — fetch today's cached briefings
  GET  /api/news/briefings/history   — fetch briefings from a specific date
  POST /api/news/briefings/refresh   — trigger fresh generation (auth required)
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import get_current_user   # adjust to your auth dependency
from app.models.user import User
# from app.models import EconomicBriefing          # or from app.models_briefing import EconomicBriefing
from app.models.models_briefing import EconomicBriefing
from app.services.briefing_service import run_daily_briefing

router = APIRouter()

# ── In-memory lock: prevent concurrent refresh calls ─────────────────────────
_refresh_running = False


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


@router.post("/briefings/refresh")
async def refresh_briefings(
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    _user                     = Depends(get_current_user),
):
    """
    Trigger a fresh briefing generation run.
    Runs in the background — returns immediately with a 202 Accepted.
    Prevents concurrent runs with a simple in-memory lock.
    """
    global _refresh_running
    if _refresh_running:
        return {
            "status":  "already_running",
            "message": "A refresh is already in progress. Check back in a minute.",
        }

    def _run():
        global _refresh_running
        _refresh_running = True
        try:
            run_daily_briefing(db)
        finally:
            _refresh_running = False

    background_tasks.add_task(_run)
    return {
        "status":  "started",
        "message": "KIP is researching today's top economic stories. Refresh the page in 60–90 seconds.",
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
    global _refresh_running
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
        "is_running":      _refresh_running,
        "count_today":     count_today,
        "last_generated":  latest.generated_at.isoformat() if latest else None,
        "last_date":       latest.generated_date if latest else None,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  SCHEDULER SETUP
#  ─────────────────
#  Add this to your main.py startup event to run the briefing daily at 06:00
#  Zambia time (UTC+2), so it's ready when users wake up.
#
#  Option A — APScheduler (if already installed):
#
#   from apscheduler.schedulers.asyncio import AsyncIOScheduler
#   from apscheduler.triggers.cron import CronTrigger
#   from app.services.briefing_service import run_daily_briefing
#   from app.database import SessionLocal
#
#   scheduler = AsyncIOScheduler()
#
#   @app.on_event("startup")
#   async def start_scheduler():
#       def daily_job():
#           db = SessionLocal()
#           try:
#               run_daily_briefing(db)
#           finally:
#               db.close()
#       # 04:00 UTC = 06:00 Zambia time (CAT, UTC+2)
#       scheduler.add_job(daily_job, CronTrigger(hour=4, minute=0))
#       scheduler.start()
#
#   @app.on_event("shutdown")
#   async def stop_scheduler():
#       scheduler.shutdown()
#
#  Option B — Railway Cron Job (zero code change needed):
#   In Railway, add a new Cron Job service pointing to your backend with:
#   Schedule: 0 4 * * *   (04:00 UTC daily)
#   Command:  python -c "
#     from app.database import SessionLocal
#     from app.services.briefing_service import run_daily_briefing
#     db = SessionLocal()
#     run_daily_briefing(db)
#     db.close()
#   "
# ══════════════════════════════════════════════════════════════════════════════
