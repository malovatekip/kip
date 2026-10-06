"""
KIP Ground Truth ingestion: turns field observations into the current state
of the business map (see models/ground_truth.py for the storage shape).

`ingest_observation` is idempotent on the observation's client UUID, so the
collector app can safely re-send a batch after a dropped connection.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.data.business_taxonomy import (
    BUSINESS_SUBTYPES, MARKET_TYPES, OPERATING_STATUS, PRICE_BASKET, STRUCTURE_TYPES,
    kip_category_for,
)
from app.data.town_coordinates import nearest_town
from app.models.ground_truth import (
    BusinessOwnerContact, BusinessPoint, FootfallCount, Market, Observation,
    PriceObservation, Vacancy,
)
from app.services.geo_utils import bounding_box, geohash_encode, haversine_m, in_zambia

# A pin is only useful if it lands on the right stall, so business fixes must
# be tight; market centre points and counts can be looser.
MAX_BUSINESS_ACCURACY_M = float(os.getenv("FIELD_MAX_GPS_ACCURACY_M", "15"))
MAX_OTHER_ACCURACY_M = max(50.0, MAX_BUSINESS_ACCURACY_M)
DUPLICATE_RADIUS_M = 10.0
# Beyond this distance from every known town the pin gets no town_key.
MAX_TOWN_DISTANCE_KM = 25.0
MAX_CLOCK_SKEW = timedelta(minutes=10)

KINDS = ("business", "market", "price", "footfall", "vacancy")
ACTIVE_REVIEW_STATUSES = ("pending", "verified")


class ObservationRejected(Exception):
    """Raised with a short machine-readable reason; recorded on the observation."""


def _naive_utc(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt


def _town_key_for(lat: float, lon: float) -> tuple[Optional[str], Optional[str]]:
    key, coord, dist_km = nearest_town(lat, lon)
    if key is None or dist_km > MAX_TOWN_DISTANCE_KM:
        return None, None
    return key, coord.get("province")


def find_nearby_businesses(
    db: Session, lat: float, lon: float, radius_m: float,
    subtype: Optional[str] = None, category: Optional[str] = None,
    include_traps: bool = False,
) -> list[tuple[BusinessPoint, float]]:
    """Active (not rejected / merged) pins within radius_m, nearest first."""
    lat_min, lat_max, lon_min, lon_max = bounding_box(lat, lon, radius_m)
    q = db.query(BusinessPoint).filter(
        BusinessPoint.lat.between(lat_min, lat_max),
        BusinessPoint.lon.between(lon_min, lon_max),
        BusinessPoint.review_status.in_(ACTIVE_REVIEW_STATUSES),
    )
    if not include_traps:
        q = q.filter(BusinessPoint.is_trap == False)  # noqa: E712
    if subtype:
        q = q.filter(BusinessPoint.subtype == subtype)
    if category:
        q = q.filter(BusinessPoint.category == category)
    hits = []
    for bp in q.all():
        dist = haversine_m(lat, lon, bp.lat, bp.lon)
        if dist <= radius_m:
            hits.append((bp, dist))
    hits.sort(key=lambda h: h[1])
    return hits


def _validate_fix(kind: str, lat, lon, accuracy) -> None:
    if lat is None or lon is None:
        raise ObservationRejected("missing_location")
    if not in_zambia(lat, lon):
        raise ObservationRejected("outside_zambia")
    limit = MAX_BUSINESS_ACCURACY_M if kind == "business" else MAX_OTHER_ACCURACY_M
    if accuracy is None or accuracy > limit:
        raise ObservationRejected(f"gps_accuracy_over_{int(limit)}m")


def _clean_prices(items) -> list[tuple[str, float]]:
    out = []
    for item in items or []:
        code, price = item.get("item_code"), item.get("price_zmw")
        if code in PRICE_BASKET and isinstance(price, (int, float)) and price > 0:
            out.append((code, float(price)))
    return out


def _add_prices(db, obs: Observation, prices, market_id, business_id, town_key):
    for code, price in prices:
        db.add(PriceObservation(
            observation_id=obs.id, item_code=code, unit=PRICE_BASKET[code][1], price_zmw=price,
            market_id=market_id, business_id=business_id, town_key=town_key,
            lat=obs.lat, lon=obs.lon, observed_at=obs.captured_at,
        ))


def _apply_business(db: Session, obs: Observation, p: dict, owner: Optional[dict], user_id: int):
    subtype = p.get("subtype")
    if subtype not in BUSINESS_SUBTYPES:
        raise ObservationRejected("unknown_subtype")
    if p.get("structure_type") and p["structure_type"] not in STRUCTURE_TYPES:
        raise ObservationRejected("unknown_structure_type")
    op_status = p.get("op_status") or "open"
    if op_status not in OPERATING_STATUS:
        raise ObservationRejected("unknown_op_status")
    market_id = p.get("market_id")
    if market_id and not db.query(Market.id).filter(Market.id == market_id).first():
        # The market may still be sitting in another agent's outbox; keep the
        # pin and let it be linked later rather than losing it.
        market_id = None

    bp = db.query(BusinessPoint).filter(BusinessPoint.id == obs.target_id).first()
    is_new = bp is None
    if is_new:
        # Look for neighbours before the new pin joins the session, so it
        # cannot match itself.
        dupes = [
            other.id for other, _ in find_nearby_businesses(
                db, obs.lat, obs.lon, DUPLICATE_RADIUS_M, subtype=subtype, include_traps=True)
        ]
        bp = BusinessPoint(id=obs.target_id, created_by=user_id, first_seen=obs.captured_at)
        if dupes:
            bp.qa_flags = [f"possible_duplicate:{d}" for d in dupes[:3]]

    bp.lat, bp.lon, bp.gps_accuracy_m = obs.lat, obs.lon, obs.gps_accuracy_m
    bp.geohash6 = geohash_encode(obs.lat, obs.lon, 6)
    bp.geohash7 = geohash_encode(obs.lat, obs.lon, 7)
    bp.subtype = subtype
    bp.category = kip_category_for(subtype)
    bp.op_status = op_status
    bp.last_verified = obs.captured_at
    if market_id:
        bp.market_id = market_id
    # A quick pin carries only the essentials; a later full survey fills in the
    # rest. Only overwrite fields the observation actually supplied.
    for field in ("section", "name", "structure_type", "products", "staff_count", "years_operating",
                  "payments", "power_source", "rent_band", "daily_customers_band", "daily_sales_band"):
        if p.get(field) not in (None, "", []):
            setattr(bp, field, p[field])
    if p.get("attributes"):
        bp.attributes = {**(bp.attributes or {}), **p["attributes"]}
    if is_new:
        db.add(bp)

    town_key, _ = _town_key_for(obs.lat, obs.lon)
    _add_prices(db, obs, _clean_prices(p.get("prices")), bp.market_id, bp.id, town_key)

    if owner and owner.get("consent") is True:
        contact = db.query(BusinessOwnerContact).filter(BusinessOwnerContact.business_id == bp.id).first()
        if not contact:
            contact = BusinessOwnerContact(business_id=bp.id)
            db.add(contact)
        contact.first_name = owner.get("first_name")
        contact.gender = owner.get("gender")
        contact.age_band = owner.get("age_band")
        contact.phone = owner.get("phone")
        contact.consent_given = True
        contact.consent_at = obs.captured_at
        contact.recorded_by = user_id


def _apply_market(db: Session, obs: Observation, p: dict, user_id: int):
    name = (p.get("name") or "").strip()
    if not name:
        raise ObservationRejected("market_name_required")
    if p.get("market_type") and p["market_type"] not in MARKET_TYPES:
        raise ObservationRejected("unknown_market_type")

    m = db.query(Market).filter(Market.id == obs.target_id).first()
    is_new = m is None
    if is_new:
        m = Market(id=obs.target_id, created_by=user_id, first_seen=obs.captured_at)
    m.name = name
    m.lat, m.lon = obs.lat, obs.lon
    m.geohash6 = geohash_encode(obs.lat, obs.lon, 6)
    m.town_key, m.province = _town_key_for(obs.lat, obs.lon)
    m.last_verified = obs.captured_at
    for field in ("alt_names", "market_type", "ward", "constituency", "boundary", "stall_count",
                  "occupied_stalls", "daily_levy_zmw", "rent_min_zmw", "rent_max_zmw"):
        if p.get(field) not in (None, "", []):
            setattr(m, field, p[field])
    if p.get("attributes"):
        m.attributes = {**(m.attributes or {}), **p["attributes"]}
    if is_new:
        db.add(m)


def _apply_price(db, obs: Observation, p: dict):
    prices = _clean_prices(p.get("items"))
    if not prices:
        raise ObservationRejected("no_valid_prices")
    town_key, _ = _town_key_for(obs.lat, obs.lon)
    _add_prices(db, obs, prices, p.get("market_id"), p.get("business_id"), town_key)


def _apply_footfall(db, obs: Observation, p: dict):
    duration, count = p.get("duration_min"), p.get("people_count")
    if not isinstance(duration, (int, float)) or duration <= 0 or not isinstance(count, int) or count < 0:
        raise ObservationRejected("invalid_footfall")
    db.add(FootfallCount(
        observation_id=obs.id, market_id=p.get("market_id"), lat=obs.lat, lon=obs.lon,
        started_at=obs.captured_at, duration_min=float(duration), people_count=count,
    ))


def _apply_vacancy(db, obs: Observation, p: dict):
    db.add(Vacancy(
        observation_id=obs.id, market_id=p.get("market_id"), lat=obs.lat, lon=obs.lon,
        geohash6=geohash_encode(obs.lat, obs.lon, 6), unit_type=p.get("unit_type"),
        size_band=p.get("size_band"), asking_rent_zmw=p.get("asking_rent_zmw"),
        observed_at=obs.captured_at,
    ))


def ingest_observation(db: Session, item: dict, user_id: int) -> dict:
    """
    Store one observation and apply it to the current-state tables.

    `item` is a validated FieldObservationIn dict. Returns
    {"id", "status": created|duplicate|rejected, "reason"?}. Rejected
    observations are still logged (outcome="rejected") so a misbehaving
    device or agent is visible in the audit trail.
    """
    obs_id = item["id"]
    if db.query(Observation.id).filter(Observation.id == obs_id).first():
        return {"id": obs_id, "status": "duplicate"}

    payload = dict(item.get("payload") or {})
    # Personal data never enters the append-only log.
    owner = payload.pop("owner", None)
    kind = item["kind"]
    captured_at = _naive_utc(item["captured_at"])

    obs = Observation(
        id=obs_id, kind=kind, target_id=item.get("target_id"), payload=payload,
        agent_user_id=user_id, lat=item.get("lat"), lon=item.get("lon"),
        gps_accuracy_m=item.get("gps_accuracy_m"), captured_at=captured_at,
        app_version=item.get("app_version"),
    )
    db.add(obs)
    # Every _apply_* handler validates before it writes, so a rejection leaves
    # nothing behind except the logged observation itself.
    try:
        if captured_at > datetime.utcnow() + MAX_CLOCK_SKEW:
            raise ObservationRejected("captured_at_in_future")
        _validate_fix(kind, obs.lat, obs.lon, obs.gps_accuracy_m)
        if kind in ("business", "market") and not obs.target_id:
            raise ObservationRejected("target_id_required")
        if kind == "business":
            _apply_business(db, obs, payload, owner, user_id)
        elif kind == "market":
            _apply_market(db, obs, payload, user_id)
        elif kind == "price":
            _apply_price(db, obs, payload)
        elif kind == "footfall":
            _apply_footfall(db, obs, payload)
        elif kind == "vacancy":
            _apply_vacancy(db, obs, payload)
    except ObservationRejected as e:
        obs.outcome, obs.reject_reason = "rejected", str(e)
        db.commit()
        return {"id": obs_id, "status": "rejected", "reason": str(e)}
    db.commit()
    return {"id": obs_id, "status": "created"}
