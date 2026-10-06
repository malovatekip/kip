"""
Field data collection API (KIP ground truth map) -- used by the collector
area of the app (/field). Collector role required; review endpoints need a
supervisor. See models/ground_truth.py for what is stored and why.
"""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.data.business_taxonomy import BUSINESS_SUBTYPES, taxonomy_payload
from app.database import get_db
from app.models.ground_truth import BusinessPoint, FieldMedia, Market, Observation, QAReview
from app.models.user import User
from app.schemas import FieldReviewDecision, FieldSyncRequest
from app.security import get_current_collector, get_current_supervisor
from app.services import field_media
from app.services.geo_utils import bounding_box, haversine_m
from app.services.ground_truth import ACTIVE_REVIEW_STATUSES, find_nearby_businesses, ingest_observation

router = APIRouter()

MAX_SYNC_BATCH = 100
# Collectors only ever see pins around where they stand, never a whole town.
MAX_NEARBY_RADIUS_M = 300


@router.get("/taxonomy")
def get_taxonomy(_: User = Depends(get_current_collector)):
    """Business sub-types, structure types, bands and the price basket."""
    return taxonomy_payload()


@router.post("/sync")
def sync_observations(
    payload: FieldSyncRequest,
    current_user: User = Depends(get_current_collector),
    db: Session = Depends(get_db),
):
    """
    Upload a batch of observations captured offline. Idempotent: each
    observation carries a client UUID, so re-sending after a dropped
    connection reports "duplicate" instead of creating a second record.
    """
    if len(payload.observations) > MAX_SYNC_BATCH:
        raise HTTPException(status_code=413, detail=f"Send at most {MAX_SYNC_BATCH} observations per batch.")
    results = [ingest_observation(db, obs.model_dump(), current_user.id) for obs in payload.observations]
    return {"results": results}


@router.post("/media")
async def upload_photo(
    observation_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_collector),
    db: Session = Depends(get_db),
):
    """Attach a frontage photo to an observation."""
    data = await file.read()
    try:
        key, digest = field_media.store_photo(data, file.content_type or "")
    except field_media.MediaRejected as e:
        raise HTTPException(status_code=400, detail=str(e))

    media = db.query(FieldMedia).filter(
        FieldMedia.observation_id == observation_id, FieldMedia.sha256 == digest).first()
    if not media:
        media = FieldMedia(
            id=str(uuid.uuid4()), observation_id=observation_id, storage_key=key, sha256=digest,
            content_type=file.content_type, size_bytes=len(data), uploaded_by=current_user.id,
        )
        db.add(media)
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if obs and obs.kind == "business" and obs.agent_user_id == current_user.id:
        bp = db.query(BusinessPoint).filter(BusinessPoint.id == obs.target_id).first()
        if bp:
            bp.photo_media_id = media.id
    db.commit()
    return {"media_id": media.id}


@router.get("/nearby")
def nearby_pins(
    lat: float, lon: float,
    radius_m: float = Query(100, gt=0, le=MAX_NEARBY_RADIUS_M),
    current_user: User = Depends(get_current_collector),
    db: Session = Depends(get_db),
):
    """Pins already captured around the collector, to avoid double-pinning."""
    return {"pins": [
        {
            "id": bp.id, "lat": bp.lat, "lon": bp.lon, "name": bp.name,
            "subtype": bp.subtype, "label": BUSINESS_SUBTYPES[bp.subtype][0],
            "op_status": bp.op_status, "review_status": bp.review_status,
            "distance_m": round(dist, 1), "mine": bp.created_by == current_user.id,
        }
        for bp, dist in find_nearby_businesses(db, lat, lon, radius_m)
    ]}


@router.get("/markets")
def nearby_markets(
    lat: float, lon: float,
    radius_km: float = Query(5, gt=0, le=20),
    _: User = Depends(get_current_collector),
    db: Session = Depends(get_db),
):
    """Markets around the collector, to attach pins to."""
    lat_min, lat_max, lon_min, lon_max = bounding_box(lat, lon, radius_km * 1000)
    rows = db.query(Market).filter(
        Market.lat.between(lat_min, lat_max), Market.lon.between(lon_min, lon_max),
        Market.review_status.in_(ACTIVE_REVIEW_STATUSES),
    ).all()
    out = [
        {"id": m.id, "name": m.name, "market_type": m.market_type, "lat": m.lat, "lon": m.lon,
         "distance_m": round(haversine_m(lat, lon, m.lat, m.lon))}
        for m in rows
    ]
    out = [m for m in out if m["distance_m"] <= radius_km * 1000]
    out.sort(key=lambda m: m["distance_m"])
    return {"markets": out}


@router.get("/me/stats")
def my_stats(current_user: User = Depends(get_current_collector), db: Session = Depends(get_db)):
    """The collector's own counts -- pay is per verified record."""
    by_status = dict(
        db.query(BusinessPoint.review_status, func.count(BusinessPoint.id))
        .filter(BusinessPoint.created_by == current_user.id)
        .group_by(BusinessPoint.review_status).all()
    )
    since = datetime.utcnow() - timedelta(hours=24)
    last_24h = db.query(func.count(Observation.id)).filter(
        Observation.agent_user_id == current_user.id, Observation.received_at >= since,
        Observation.outcome == "accepted",
    ).scalar()
    return {
        "pins_total": sum(by_status.values()),
        "pins_verified": by_status.get("verified", 0),
        "pins_pending": by_status.get("pending", 0),
        "pins_rejected": by_status.get("rejected", 0) + by_status.get("duplicate", 0),
        "observations_last_24h": last_24h or 0,
        "markets": db.query(func.count(Market.id)).filter(Market.created_by == current_user.id).scalar() or 0,
    }


# ── Supervisor review ─────────────────────────────────────────────────────

@router.get("/review")
def review_queue(
    status: str = Query("pending", pattern="^(pending|verified|rejected|duplicate)$"),
    limit: int = Query(50, gt=0, le=200),
    _: User = Depends(get_current_supervisor),
    db: Session = Depends(get_db),
):
    """Pins awaiting review; flagged ones (possible duplicates) come first."""
    rows = (
        db.query(BusinessPoint, User.full_name)
        .outerjoin(User, User.id == BusinessPoint.created_by)
        .filter(BusinessPoint.review_status == status, BusinessPoint.is_trap == False)  # noqa: E712
        .order_by(BusinessPoint.created_at.desc())
        .limit(limit).all()
    )
    items = [
        {
            "id": bp.id, "name": bp.name, "subtype": bp.subtype,
            "label": BUSINESS_SUBTYPES[bp.subtype][0], "structure_type": bp.structure_type,
            "lat": bp.lat, "lon": bp.lon, "gps_accuracy_m": bp.gps_accuracy_m,
            "op_status": bp.op_status, "qa_flags": bp.qa_flags or [],
            "photo_media_id": bp.photo_media_id, "collector": collector,
            "captured_at": bp.first_seen.isoformat() if bp.first_seen else None,
        }
        for bp, collector in rows
    ]
    items.sort(key=lambda i: not i["qa_flags"])
    return {"items": items}


@router.post("/review/business/{business_id}")
def review_business(
    business_id: str,
    payload: FieldReviewDecision,
    supervisor: User = Depends(get_current_supervisor),
    db: Session = Depends(get_db),
):
    bp = db.query(BusinessPoint).filter(BusinessPoint.id == business_id).first()
    if not bp:
        raise HTTPException(status_code=404, detail="Pin not found.")
    if payload.decision == "duplicate":
        if not payload.merged_into_id or payload.merged_into_id == business_id:
            raise HTTPException(status_code=400, detail="A duplicate needs the id of the pin it duplicates.")
        if not db.query(BusinessPoint.id).filter(BusinessPoint.id == payload.merged_into_id).first():
            raise HTTPException(status_code=404, detail="The pin to merge into was not found.")
    bp.review_status = payload.decision
    db.add(QAReview(
        target_type="business", target_id=business_id, reviewer_user_id=supervisor.id,
        decision=payload.decision, merged_into_id=payload.merged_into_id, note=payload.note,
    ))
    db.commit()
    return {"id": business_id, "review_status": bp.review_status}


@router.get("/media/{media_id}")
def get_photo(media_id: str, _: User = Depends(get_current_supervisor), db: Session = Depends(get_db)):
    media = db.query(FieldMedia).filter(FieldMedia.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Photo not found.")
    try:
        data = field_media.load_photo(media.storage_key)
    except Exception:
        raise HTTPException(status_code=404, detail="Photo file is missing from storage.")
    return Response(content=data, media_type=media.content_type)
