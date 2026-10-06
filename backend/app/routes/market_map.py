"""
Market map API -- what KIP users (and later, B2B clients) see of the ground
truth layer. Ordinary users only ever receive aggregates; raw pins are
admin-only, so the dataset cannot be harvested through the public app.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.data.business_taxonomy import BUSINESS_SUBTYPES
from app.data.town_coordinates import resolve_location
from app.database import get_db
from app.models.ground_truth import BusinessPoint
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
    lat_min, lat_max, lon_min, lon_max = bounding_box(coord["lat"], coord["lon"], max(coord["radius_m"], 5000))
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
                    "market_id": bp.market_id, "is_trap": bool(bp.is_trap),
                    "last_verified": bp.last_verified.isoformat() if bp.last_verified else None,
                },
            }
            for bp in rows
        ],
    }
