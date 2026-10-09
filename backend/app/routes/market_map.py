"""
Market map API -- what KIP users (and later, B2B clients) see of the ground
truth layer. Ordinary users only ever receive aggregates; raw pins are
admin-only, so the dataset cannot be harvested through the public app.
"""
import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.data.business_taxonomy import BUSINESS_SUBTYPES
from app.data.town_coordinates import nearest_town, resolve_location
from app.database import get_db
from app.models.ground_truth import BusinessPoint, Market
from app.models.user import User
from app.rate_limit import limiter
from app.security import get_current_admin, get_current_user
from app.services.geo_utils import bounding_box
from app.services.saturation_service import saturation_at, town_cells

router = APIRouter()


@router.get("/saturation")
@limiter.limit("30/minute")
def get_saturation(
    request: Request,
    lat: float, lon: float,
    radius_m: float = Query(500, ge=100, le=2000),
    category: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """How many businesses of each kind trade within radius_m of a point."""
    return saturation_at(db, lat, lon, radius_m, category=category)


@router.get("/cells")
@limiter.limit("30/minute")
def get_cells(
    request: Request,
    location: str,
    category: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Heat-map cells for a town (business counts per ~1 km cell)."""
    result = town_cells(db, location, category=category)
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown location.")
    return result


@router.get("/admin/pins.geojson")
def export_pins(
    location: str,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin-only raw pins for one town, as GeoJSON. Includes trap pins (flagged)
    so an admin can tell them apart; owner contact details are never included.
    """
    location_key, coord = resolve_location(location)
    if not location_key:
        raise HTTPException(status_code=404, detail="Unknown location.")
    lat_min, lat_max, lon_min, lon_max = bounding_box(coord["lat"], coord["lon"], max(coord["radius_m"], 15000))
    rows = db.query(BusinessPoint).filter(
        BusinessPoint.lat.between(lat_min, lat_max), BusinessPoint.lon.between(lon_min, lon_max),
    ).all()
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [bp.lon, bp.lat]},
                "properties": {
                    "id": bp.id, "name": bp.name, "category": bp.category, "subtype": bp.subtype,
                    "label": BUSINESS_SUBTYPES[bp.subtype][0], "structure_type": bp.structure_type,
                    "op_status": bp.op_status, "review_status": bp.review_status,
                    "gps_accuracy_m": bp.gps_accuracy_m, "photo_media_id": bp.photo_media_id,
                    "qa_flags": bp.qa_flags or [], "market_id": bp.market_id, "is_trap": bool(bp.is_trap),
                    "last_verified": bp.last_verified.isoformat() if bp.last_verified else None,
                },
            }
            for bp in rows
        ],
    }


@router.get("/admin/markets")
def admin_markets(
    location: str,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin-only market records for one town, with how many pins each holds."""
    location_key, coord = resolve_location(location)
    if not location_key:
        raise HTTPException(status_code=404, detail="Unknown location.")
    lat_min, lat_max, lon_min, lon_max = bounding_box(coord["lat"], coord["lon"], max(coord["radius_m"], 15000))
    markets = db.query(Market).filter(
        Market.lat.between(lat_min, lat_max), Market.lon.between(lon_min, lon_max),
    ).all()
    counts = dict(
        db.query(BusinessPoint.market_id, func.count(BusinessPoint.id))
        .filter(BusinessPoint.market_id.isnot(None), BusinessPoint.is_trap == False)  # noqa: E712
        .group_by(BusinessPoint.market_id).all()
    )
    return {"markets": [
        {
            "id": m.id, "name": m.name, "market_type": m.market_type, "lat": m.lat, "lon": m.lon,
            "stall_count": m.stall_count, "occupied_stalls": m.occupied_stalls,
            "daily_levy_zmw": m.daily_levy_zmw, "rent_min_zmw": m.rent_min_zmw, "rent_max_zmw": m.rent_max_zmw,
            "review_status": m.review_status, "pins": counts.get(m.id, 0),
        }
        for m in markets
    ]}


EXPORT_COLUMNS = [
    "id", "name", "business_type", "category", "subtype", "structure_type", "op_status", "review_status",
    "lat", "lon", "gps_accuracy_m", "nearest_town", "province", "market_name", "section",
    "products", "staff_count", "years_operating", "payments", "power_source", "rent_band",
    "daily_customers_band", "daily_sales_band", "source", "first_seen", "last_verified",
]


@router.get("/admin/export.csv")
def export_pins_csv(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin-only CSV of every business pin KIP has collected, all towns. Owner
    contact details and trap pins are never included.
    """
    markets = dict(db.query(Market.id, Market.name).all())
    rows = (
        db.query(BusinessPoint)
        .filter(BusinessPoint.is_trap == False)  # noqa: E712
        .order_by(BusinessPoint.created_at)
        .all()
    )
    joined = lambda v: "; ".join(str(x) for x in v) if isinstance(v, (list, tuple)) else (v or "")
    day = lambda d: d.strftime("%Y-%m-%d") if d else ""

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(EXPORT_COLUMNS)
    for bp in rows:
        town_key, coord, _km = nearest_town(bp.lat, bp.lon)
        writer.writerow([
            bp.id, bp.name or "", BUSINESS_SUBTYPES[bp.subtype][0], bp.category, bp.subtype,
            bp.structure_type or "", bp.op_status, bp.review_status,
            round(bp.lat, 6), round(bp.lon, 6), round(bp.gps_accuracy_m, 1) if bp.gps_accuracy_m is not None else "",
            (town_key or "").title(), (coord or {}).get("province", ""),
            markets.get(bp.market_id, ""), bp.section or "",
            joined(bp.products), bp.staff_count if bp.staff_count is not None else "",
            bp.years_operating if bp.years_operating is not None else "", joined(bp.payments),
            bp.power_source or "", bp.rent_band or "", bp.daily_customers_band or "", bp.daily_sales_band or "",
            bp.source or "", day(bp.first_seen), day(bp.last_verified),
        ])

    filename = f"kip_ground_truth_pins_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
