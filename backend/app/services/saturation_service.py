"""
Saturation and market-gap analysis over KIP's own field-collected map.

Answers the question the OSM cache cannot: how many businesses of this kind
already trade around this point? Everything returned here is an aggregate
(counts, bands, medians) -- raw pins never leave the admin endpoints.
"""
import statistics
from collections import Counter
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.data.business_taxonomy import BUSINESS_SUBTYPES
from app.data.town_coordinates import resolve_location
from app.models.ground_truth import BusinessPoint, Market, Vacancy
from app.services.geo_utils import bounding_box, geohash_center, haversine_m
from app.services.ground_truth import ACTIVE_REVIEW_STATUSES, find_nearby_businesses
from app.services.map_service import saturation_level

DEFAULT_RADIUS_M = 500
# Below this many pins an area is treated as not yet surveyed: an empty map
# must not be mistaken for an empty market.
MIN_POINTS_FOR_COVERAGE = 25
# Cells with fewer pins are withheld from public aggregates so a single
# trader cannot be singled out.
MIN_CELL_COUNT = 3
TRADING_STATUSES = ("open", "seasonal")


def saturation_at(
    db: Session, lat: float, lon: float, radius_m: float = DEFAULT_RADIUS_M,
    category: Optional[str] = None,
) -> dict:
    hits = [
        (bp, d) for bp, d in find_nearby_businesses(db, lat, lon, radius_m, category=category)
        if bp.op_status in TRADING_STATUSES
    ]
    by_subtype = Counter(bp.subtype for bp, _ in hits)
    by_category = Counter(bp.category for bp, _ in hits)

    lat_min, lat_max, lon_min, lon_max = bounding_box(lat, lon, radius_m)
    box = lambda model: (model.lat.between(lat_min, lat_max), model.lon.between(lon_min, lon_max))  # noqa: E731

    markets = []
    for m in db.query(Market).filter(*box(Market), Market.review_status.in_(ACTIVE_REVIEW_STATUSES)).all():
        dist = haversine_m(lat, lon, m.lat, m.lon)
        if dist <= radius_m:
            markets.append({
                "name": m.name, "market_type": m.market_type, "distance_m": round(dist),
                "stall_count": m.stall_count, "occupied_stalls": m.occupied_stalls,
                "daily_levy_zmw": m.daily_levy_zmw,
                "rent_min_zmw": m.rent_min_zmw, "rent_max_zmw": m.rent_max_zmw,
            })
    markets.sort(key=lambda m: m["distance_m"])

    rents = [
        v.asking_rent_zmw
        for v in db.query(Vacancy).filter(*box(Vacancy), Vacancy.status == "available").all()
        if haversine_m(lat, lon, v.lat, v.lon) <= radius_m
    ]
    asking = [r for r in rents if r]

    last_verified = max((bp.last_verified for bp, _ in hits if bp.last_verified), default=None)
    return {
        "radius_m": radius_m,
        "surveyed": len(hits) >= MIN_POINTS_FOR_COVERAGE,
        "total_businesses": len(hits),
        "by_category": dict(by_category.most_common()),
        "by_subtype": [
            {"code": code, "label": BUSINESS_SUBTYPES[code][0], "count": n, "level": saturation_level(n)}
            for code, n in by_subtype.most_common()
        ],
        "not_observed": [
            {"code": code, "label": label}
            for code, (label, cat, _) in BUSINESS_SUBTYPES.items()
            if code != "other" and code not in by_subtype and (not category or cat == category)
        ],
        "markets": markets,
        "vacancies": {
            "count": len(rents),
            "median_asking_rent_zmw": statistics.median(asking) if asking else None,
        },
        "last_verified": last_verified.date().isoformat() if last_verified else None,
    }


def get_ground_truth_context(db: Session, location_string: str) -> str:
    """
    Prompt-ready summary of KIP's own survey data for a user's location, or ""
    when the area has not been surveyed enough to trust (the caller then falls
    back to the OSM cache).
    """
    location_key, coord = resolve_location(location_string)
    if not location_key:
        return ""
    summary = saturation_at(db, coord["lat"], coord["lon"], coord["radius_m"])
    if not summary["surveyed"]:
        return ""

    lines = [
        f"KIP FIELD SURVEY: {location_key.title()} ({coord.get('province', 'Unknown')} Province)",
        f"Source: KIP's own agents counted businesses on the ground within {coord['radius_m']}m. "
        f"Last verified: {summary['last_verified']}.",
        f"Trading businesses counted: {summary['total_businesses']}",
        "",
        "BUSINESSES ALREADY TRADING (count, saturation):",
    ]
    for row in summary["by_subtype"][:20]:
        lines.append(f"  • {row['label']}: {row['count']} [{row['level'].replace('_', ' ').upper()}]")

    if summary["not_observed"]:
        lines.append("")
        lines.append("NOT FOUND IN THIS AREA (possible gaps -- check there is demand before recommending):")
        for row in summary["not_observed"][:12]:
            lines.append(f"  ◆ {row['label']}")

    for m in summary["markets"][:3]:
        parts = [f"MARKET: {m['name']}"]
        if m["stall_count"]:
            occ = f", {m['occupied_stalls']} occupied" if m["occupied_stalls"] is not None else ""
            parts.append(f"{m['stall_count']} stalls{occ}")
        if m["daily_levy_zmw"]:
            parts.append(f"levy K{m['daily_levy_zmw']:g}/day")
        if m["rent_min_zmw"] or m["rent_max_zmw"]:
            parts.append(f"stall rent K{m['rent_min_zmw'] or 0:g}-K{m['rent_max_zmw'] or 0:g}/month")
        lines.append("")
        lines.append(" | ".join(parts))

    vac = summary["vacancies"]
    if vac["count"]:
        rent = f", median asking rent K{vac['median_asking_rent_zmw']:g}/month" if vac["median_asking_rent_zmw"] else ""
        lines.append("")
        lines.append(f"VACANT UNITS: {vac['count']} available{rent}")

    lines.append("")
    lines.append("USE THIS DATA: these are real counts, not estimates. Do not recommend a business type "
                 "marked HIGH or VERY HIGH unless the idea is clearly differentiated; prefer the gaps.")
    return "\n".join(lines)


def town_cells(db: Session, location_string: str, category: Optional[str] = None) -> Optional[dict]:
    """Heat-map cells (geohash6) for a town; small cells are suppressed."""
    location_key, coord = resolve_location(location_string)
    if not location_key:
        return None
    # Wider than the survey radius so the map shows the town's surroundings.
    lat_min, lat_max, lon_min, lon_max = bounding_box(coord["lat"], coord["lon"], max(coord["radius_m"], 5000))
    q = db.query(BusinessPoint.geohash6, func.count(BusinessPoint.id)).filter(
        BusinessPoint.lat.between(lat_min, lat_max),
        BusinessPoint.lon.between(lon_min, lon_max),
        BusinessPoint.review_status.in_(ACTIVE_REVIEW_STATUSES),
        BusinessPoint.op_status.in_(TRADING_STATUSES),
        BusinessPoint.is_trap == False,  # noqa: E712
    )
    if category:
        q = q.filter(BusinessPoint.category == category)
    cells = []
    for gh, n in q.group_by(BusinessPoint.geohash6).all():
        if n >= MIN_CELL_COUNT:
            c_lat, c_lon = geohash_center(gh)
            cells.append({"cell": gh, "lat": round(c_lat, 5), "lon": round(c_lon, 5), "count": n})
    return {"location": location_key, "center": {"lat": coord["lat"], "lon": coord["lon"]}, "cells": cells}
