#!/usr/bin/env python3
"""
KIP News Fetch Script
======================
Manually trigger a news and rates refresh.
Run this once after setup, then it runs automatically via the scheduler.

Usage:
  python fetch_news.py           # Fetch news + refresh rates
  python fetch_news.py --rates   # Refresh rates only
  python fetch_news.py --news    # Fetch news only
  python fetch_news.py --status  # Show latest rates and article count
"""
import sys, os, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

from app.database import SessionLocal, engine, Base
from app.models.news import NewsArticle, LiveRate, KipAlert
from app.services.news_service import scrape_news, fetch_usd_zmw, fetch_fuel_prices
from datetime import datetime

Base.metadata.create_all(bind=engine)

def refresh_rates(db):
    print("  Fetching USD/ZMW rate...")
    rate = fetch_usd_zmw()
    if rate:
        existing = db.query(LiveRate).filter(LiveRate.rate_type=="usd_zmw")\
            .order_by(LiveRate.fetched_at.desc()).first()
        prev = existing.value if existing else None
        direction = "stable"
        if prev:
            direction = "up" if rate["value"] > prev else ("down" if rate["value"] < prev else "stable")
        db.add(LiveRate(rate_type="usd_zmw", value=rate["value"],
                        unit="ZMW per 1 USD", direction=direction, previous=prev))
        print(f"  ✓ USD/ZMW: {rate['value']} ({direction})")
    else:
        print("  ✗ USD/ZMW: Could not fetch (check internet connection)")

    print("  Fetching ERB fuel prices...")
    fuel = fetch_fuel_prices()
    if fuel:
        for ft in ["petrol", "diesel"]:
            val = fuel.get(ft)
            if val:
                existing = db.query(LiveRate).filter(LiveRate.rate_type==ft)\
                    .order_by(LiveRate.fetched_at.desc()).first()
                prev = existing.value if existing else None
                direction = "stable"
                if prev:
                    direction = "up" if val > prev else ("down" if val < prev else "stable")
                db.add(LiveRate(rate_type=ft, value=val,
                                unit="ZMW per litre", direction=direction, previous=prev))
                print(f"  ✓ {ft.title()}: K{val}/L ({direction})")
    else:
        print("  ✗ Fuel prices: ZERA page unavailable — using last cached value")

    db.commit()

def fetch_and_store_news(db):
    print("  Scraping Zambian news sources...")
    articles = scrape_news()
    new_count = 0
    for a in articles:
        exists = db.query(NewsArticle).filter(NewsArticle.url == a["url"]).first()
        if exists:
            continue
        db.add(NewsArticle(
            headline=a["headline"], summary=a.get("summary",""),
            url=a["url"], source_name=a["source_name"],
            category=a["category"], published_at=a.get("published_at"),
        ))
        new_count += 1
    db.commit()
    print(f"  ✓ {new_count} new articles added ({len(articles) - new_count} duplicates skipped)")
    return articles, new_count

def show_status(db):
    print("\n── KIP News Status ──────────────────────────────")
    for rt in ["usd_zmw","petrol","diesel"]:
        row = db.query(LiveRate).filter(LiveRate.rate_type==rt)\
            .order_by(LiveRate.fetched_at.desc()).first()
        if row:
            age = (datetime.utcnow() - row.fetched_at).seconds // 60
            arrow = "▲" if row.direction=="up" else ("▼" if row.direction=="down" else "–")
            print(f"  {rt.upper().ljust(12)}: {row.value:.4f} {row.unit}  {arrow}  ({age}m ago)")
        else:
            print(f"  {rt.upper().ljust(12)}: No data yet")
    total = db.query(NewsArticle).count()
    print(f"\n  Total articles in DB : {total}")
    latest = db.query(NewsArticle).order_by(NewsArticle.fetched_at.desc()).first()
    if latest:
        print(f"  Latest article       : {latest.headline[:70]}...")
        print(f"  From                 : {latest.source_name}  ({latest.fetched_at.strftime('%d %b %Y %H:%M')})")
    print("─────────────────────────────────────────────────\n")

def main():
    parser = argparse.ArgumentParser(description="KIP News Fetch Script")
    parser.add_argument("--rates",  action="store_true", help="Refresh rates only")
    parser.add_argument("--news",   action="store_true", help="Fetch news only")
    parser.add_argument("--status", action="store_true", help="Show current status")
    args = parser.parse_args()

    print("\n╔══════════════════════════════════════════════╗")
    print("║   KIP News Feed Refresh                      ║")
    print("╚══════════════════════════════════════════════╝\n")

    db = SessionLocal()
    try:
        if args.status:
            show_status(db); return

        if args.rates or (not args.news and not args.rates):
            refresh_rates(db)

        if args.news or (not args.news and not args.rates):
            fetch_and_store_news(db)

        print("\n✓ Done.")
        show_status(db)
    finally:
        db.close()

if __name__ == "__main__":
    main()
