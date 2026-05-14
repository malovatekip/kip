from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.news import NewsArticle, LiveRate, KipAlert
from app.models.business_idea import BusinessIdea
from app.security import get_current_user
from app.models.user import User
from app.services.news_service import (
    scrape_news, fetch_usd_zmw, fetch_fuel_prices,
    generate_alerts_for_user
)

router = APIRouter()


# ── Rates ──────────────────────────────────────────────────────────

@router.get("/rates")
def get_rates(db: Session = Depends(get_db)):
    """Return the latest live economic rates."""
    rates = {}
    for rate_type in ["usd_zmw", "petrol", "diesel", "copper"]:
        row = db.query(LiveRate)\
            .filter(LiveRate.rate_type == rate_type)\
            .order_by(LiveRate.fetched_at.desc()).first()
        if row:
            rates[rate_type] = {
                "value":      row.value,
                "unit":       row.unit,
                "direction":  row.direction,
                "previous":   row.previous,
                "fetched_at": row.fetched_at.isoformat(),
                "stale":      (datetime.utcnow() - row.fetched_at) > timedelta(hours=6),
            }
    return rates


@router.post("/rates/refresh")
def refresh_rates(db: Session = Depends(get_db)):
    """Manually trigger a rates refresh. Called by the scheduler or admin."""
    updated = []

    # USD/ZMW
    rate = fetch_usd_zmw()
    if rate:
        existing = db.query(LiveRate)\
            .filter(LiveRate.rate_type == "usd_zmw")\
            .order_by(LiveRate.fetched_at.desc()).first()
        prev = existing.value if existing else None
        direction = "stable"
        if prev:
            direction = "up" if rate["value"] > prev else ("down" if rate["value"] < prev else "stable")

        db.add(LiveRate(
            rate_type="usd_zmw", value=rate["value"],
            unit="ZMW per 1 USD", direction=direction, previous=prev
        ))
        updated.append("usd_zmw")

    # Fuel prices
    fuel = fetch_fuel_prices()
    if fuel:
        for fuel_type in ["petrol", "diesel"]:
            val = fuel.get(fuel_type)
            if val:
                existing = db.query(LiveRate)\
                    .filter(LiveRate.rate_type == fuel_type)\
                    .order_by(LiveRate.fetched_at.desc()).first()
                prev = existing.value if existing else None
                direction = "stable"
                if prev:
                    direction = "up" if val > prev else ("down" if val < prev else "stable")
                db.add(LiveRate(
                    rate_type=fuel_type, value=val,
                    unit="ZMW per litre", direction=direction, previous=prev
                ))
        updated.extend(["petrol", "diesel"])

    db.commit()
    return {"updated": updated, "timestamp": datetime.utcnow().isoformat()}


# ── News articles ──────────────────────────────────────────────────

@router.get("/articles")
def get_articles(
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Return news articles with optional category filter."""
    q = db.query(NewsArticle).filter(NewsArticle.is_active == True)
    if category and category != "all":
        q = q.filter(NewsArticle.category == category)
    total = q.count()
    articles = q.order_by(NewsArticle.fetched_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "articles": [
            {
                "id":           a.id,
                "headline":     a.headline,
                "summary":      a.summary,
                "url":          a.url,
                "source_name":  a.source_name,
                "category":     a.category,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "fetched_at":   a.fetched_at.isoformat(),
            }
            for a in articles
        ]
    }


@router.post("/articles/refresh")
def refresh_articles(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger news scrape in background. Returns immediately."""
    background_tasks.add_task(_run_news_refresh, db)
    return {"status": "refresh started"}


def _run_news_refresh(db: Session):
    """Background task: scrape news, save new articles, generate alerts."""
    articles = scrape_news()
    new_count = 0

    for a in articles:
        # Skip duplicates by URL
        exists = db.query(NewsArticle).filter(NewsArticle.url == a["url"]).first()
        if exists:
            continue
        db.add(NewsArticle(
            headline=a["headline"],
            summary=a.get("summary", ""),
            url=a["url"],
            source_name=a["source_name"],
            category=a["category"],
            published_at=a.get("published_at"),
        ))
        new_count += 1

    db.commit()

    # Generate alerts for all users with business ideas
    if new_count > 0:
        _generate_alerts_for_all_users(db, articles)

    print(f"[News] Refresh complete: {new_count} new articles")


def _generate_alerts_for_all_users(db: Session, new_articles: list):
    """Generate KIP alerts for every user based on their business ideas."""
    from app.models.user import User
    users = db.query(User).filter(User.is_active == True).all()

    for user in users:
        ideas = db.query(BusinessIdea)\
            .filter(BusinessIdea.user_id == user.id)\
            .order_by(BusinessIdea.created_at.desc()).limit(5).all()

        if not ideas:
            continue

        idea_dicts = [{"idea_name": i.idea_name} for i in ideas]
        alerts = generate_alerts_for_user(idea_dicts, new_articles)

        for alert_data in alerts[:3]:  # max 3 alerts per refresh per user
            db.add(KipAlert(
                user_id=user.id,
                headline=alert_data["headline"],
                kip_message=alert_data["kip_message"],
                business_name=alert_data.get("business_name"),
                category=alert_data.get("category"),
            ))

    db.commit()


# ── KIP Alerts ────────────────────────────────────────────────────

@router.get("/alerts")
def get_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return unread KIP alerts for the current user."""
    alerts = db.query(KipAlert)\
        .filter(KipAlert.user_id == current_user.id)\
        .order_by(KipAlert.created_at.desc()).limit(20).all()
    return [
        {
            "id":            a.id,
            "headline":      a.headline,
            "kip_message":   a.kip_message,
            "business_name": a.business_name,
            "category":      a.category,
            "is_read":       a.is_read,
            "created_at":    a.created_at.isoformat(),
        }
        for a in alerts
    ]


@router.get("/alerts/count")
def get_alert_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return count of unread alerts — used for the nav badge."""
    count = db.query(KipAlert)\
        .filter(KipAlert.user_id == current_user.id, KipAlert.is_read == False)\
        .count()
    return {"unread": count}


@router.patch("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a KIP alert as read."""
    alert = db.query(KipAlert).filter(
        KipAlert.id == alert_id, KipAlert.user_id == current_user.id
    ).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"status": "ok"}


@router.patch("/alerts/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all alerts as read."""
    db.query(KipAlert).filter(
        KipAlert.user_id == current_user.id, KipAlert.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}
