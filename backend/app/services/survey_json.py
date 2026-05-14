"""
KIP Survey JSON Patch
Place this file at: backend/app/services/survey_json.py

Import and call save_survey_json() inside the survey POST endpoint
in backend/app/routes/enhanced_logs.py after db.commit().

Usage — add these two lines to your survey endpoint:
    from app.services.survey_json import save_survey_json
    save_survey_json(req.location or "", survey_dict, "market_survey")
"""
import json
import os
import re
from datetime import datetime
from typing import Optional

# Directory: backend/data/surveys/
SURVEY_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    'data', 'surveys'
)
os.makedirs(SURVEY_DIR, exist_ok=True)


def _slug(location: str) -> str:
    s = location.lower().strip()
    s = re.sub(r'[^a-z0-9\s]', '', s)
    s = re.sub(r'\s+', '_', s.strip())
    return s[:60] or 'unknown'


def save_survey_json(
    location: str,
    data: dict,
    survey_type: str = "market_survey"
) -> Optional[str]:
    """
    Append a survey submission to the town's JSON file.
    Returns the filepath, or None on failure.

    File structure:
      backend/data/surveys/riverside_kitwe.json
      {
        "town": "Riverside, Kitwe",
        "slug": "riverside_kitwe",
        "created_at": "...",
        "last_updated": "...",
        "submissions": [...],
        "aggregated": { ... }
      }
    """
    if not location:
        return None

    slug = _slug(location)
    filepath = os.path.join(SURVEY_DIR, f"{slug}.json")

    # Load existing or create
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                town = json.load(f)
        except Exception:
            town = _new_town(location, slug)
    else:
        town = _new_town(location, slug)

    # Strip internal fields before storing
    clean = {
        k: v for k, v in data.items()
        if k not in ('user_id', 'id', 'created_at', 'updated_at', 'completed_at')
        and v is not None
        and v != ""
        and v is not False
    }

    town["submissions"].append({
        "type": survey_type,
        "submitted_at": datetime.utcnow().isoformat(),
        "data": clean,
    })

    town["aggregated"] = _aggregate(town["submissions"])
    town["last_updated"] = datetime.utcnow().isoformat()

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(town, f, indent=2, ensure_ascii=False, default=str)
        print(f"[KIP Survey] Saved → {filepath}")
        return filepath
    except Exception as e:
        print(f"[KIP Survey] Write error: {e}")
        return None


def _new_town(location: str, slug: str) -> dict:
    return {
        "town": location,
        "slug": slug,
        "created_at": datetime.utcnow().isoformat(),
        "last_updated": datetime.utcnow().isoformat(),
        "submissions": [],
        "aggregated": {},
    }


def _aggregate(submissions: list) -> dict:
    """Compute running aggregates across all submissions for this town."""
    agg = {
        "total_submissions":  len(submissions),
        "market_surveys":     sum(1 for s in submissions if s.get("type") == "market_survey"),
        "general_surveys":    sum(1 for s in submissions if s.get("type") == "general_survey"),
    }

    # Numeric fields — compute average
    num_fields = [
        "avg_spend_per_visit", "direct_competitors_count", "nearest_wholesale_km",
        "market_distance_km", "avg_tomato_price_per_kg", "avg_bread_price",
        "avg_phone_data_1gb", "avg_shop_rent_pm", "avg_labor_wage_pm",
        "food_businesses_count", "retail_count", "services_count",
    ]
    for field in num_fields:
        vals = []
        for s in submissions:
            v = s.get("data", {}).get(field)
            try:
                if v not in (None, "", 0):
                    vals.append(float(v))
            except (TypeError, ValueError):
                pass
        if vals:
            agg[f"avg_{field}"]       = round(sum(vals) / len(vals), 2)
            agg[f"samples_{field}"]   = len(vals)

    # Categorical fields — most common value
    cat_fields = [
        "area_type", "foot_traffic", "dominant_income_level", "competition_quality",
        "power_reliability", "payment_preference", "primary_occupation",
        "internet_access", "security_level", "road_access", "road_quality",
        "dominant_income_level",
    ]
    for field in cat_fields:
        vals = [s["data"][field] for s in submissions if s.get("data", {}).get(field)]
        if vals:
            agg[f"most_common_{field}"] = max(set(vals), key=vals.count)
            # Full distribution
            dist = {}
            for v in vals:
                dist[v] = dist.get(v, 0) + 1
            agg[f"distribution_{field}"] = dist

    # Collect all market gap text
    gaps = []
    for s in submissions:
        d = s.get("data", {})
        gap = d.get("market_gaps_noted") or d.get("missing_services")
        if gap:
            gaps.append(gap)
    if gaps:
        agg["market_gaps_all"] = gaps

    # Collect competitor weaknesses
    weaknesses = [
        s["data"]["main_competitor_weakness"]
        for s in submissions
        if s.get("data", {}).get("main_competitor_weakness")
    ]
    if weaknesses:
        agg["competitor_weaknesses"] = weaknesses

    # Business type counts — which sectors dominate
    food_vals = [s["data"].get("food_businesses_count") for s in submissions if s.get("data", {}).get("food_businesses_count")]
    retail_vals = [s["data"].get("retail_count") for s in submissions if s.get("data", {}).get("retail_count")]
    if food_vals:
        agg["estimated_food_businesses"]   = round(sum(float(v) for v in food_vals) / len(food_vals))
    if retail_vals:
        agg["estimated_retail_businesses"] = round(sum(float(v) for v in retail_vals) / len(retail_vals))

    return agg


def list_all_towns() -> list:
    """Return a summary of all town survey files."""
    if not os.path.exists(SURVEY_DIR):
        return []
    towns = []
    for fname in sorted(os.listdir(SURVEY_DIR)):
        if not fname.endswith('.json'):
            continue
        fp = os.path.join(SURVEY_DIR, fname)
        try:
            with open(fp) as f:
                d = json.load(f)
            towns.append({
                "filename":    fname,
                "town":        d.get("town", fname),
                "slug":        d.get("slug", fname.replace('.json', '')),
                "submissions": d.get("aggregated", {}).get("total_submissions", 0),
                "last_updated":d.get("last_updated"),
                "size_kb":     round(os.path.getsize(fp) / 1024, 1),
            })
        except Exception:
            pass
    return towns
