import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.business_idea import BusinessIdea
from app.schemas import (
    IdeaOut,
    IdeaFeedback,
    IdeaGenerateRequest,
    IdeaGenerateResponse,
    IdeaDetailOut,
)
from app.security import get_current_user, get_current_admin
from app.services import kip_engine_v2
from app.services.kip_prompt_v2 import IDEA_SCHEMA
from app.data.town_coordinates import nearest_town

router = APIRouter()

# The full set of structured-schema field names, used to flatten each idea's
# structured_data JSON blob into CSV columns for the admin export below.
STRUCTURED_FIELDS = list(IDEA_SCHEMA["properties"].keys())


@router.get("/", response_model=List[IdeaOut])
def get_my_ideas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return all business ideas generated for this user."""
    ideas = db.query(BusinessIdea).filter(
        BusinessIdea.user_id == current_user.id
    ).order_by(BusinessIdea.created_at.desc()).all()
    return ideas


@router.post("/generate", response_model=IdeaGenerateResponse)
def generate_idea(
    payload: IdeaGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    K-BIG-2: run the New Idea wizard's structured profile through the
    generate-3-ideas -> add-to-shared-dataset -> re-rank-entire-dataset
    pipeline (kip_engine_v2.py) and return the top-viability results.
    """
    profile = {
        "capital_available": payload.capital_available,
        "location": payload.location,
        "skills": payload.skills,
        "assets": payload.assets,
    }
    try:
        results = kip_engine_v2.generate_structured_ideas(profile, current_user, db)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"ideas": results}


@router.get("/export")
def export_dataset(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin-only: CSV export of the entire k-big-2 shared idea dataset -- every
    structured business idea KIP has generated across every user. This is
    the investor-facing proprietary dataset asset, not any one user's ideas;
    no per-user personal information is included in the export.
    """
    ideas = (
        db.query(BusinessIdea)
        .filter(
            BusinessIdea.generated_by_kip == True,  # noqa: E712
            BusinessIdea.structured_data.isnot(None),
        )
        .order_by(BusinessIdea.created_at.desc())
        .all()
    )

    core_fields = [
        "id", "idea_name", "category", "viability_score", "demand_score",
        "financial_score", "capital_fit_score", "execution_fit_score",
        "regulatory_score", "competitive_score", "asset_location_score",
        "min_capital", "recommended_capital_min", "recommended_capital_max",
        "created_at",
    ]
    # A handful of structured-schema field names duplicate a promoted core
    # column (category, min_capital, recommended_capital_min/max) -- skip
    # those to avoid emitting the same value twice under two column headers.
    extra_structured_fields = [f for f in STRUCTURED_FIELDS if f not in core_fields]
    header = core_fields + extra_structured_fields

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    for idea in ideas:
        data = idea.structured_data or {}
        row = []
        for field in core_fields:
            value = getattr(idea, field, "")
            row.append(value.isoformat() if isinstance(value, datetime) else value)
        for field in extra_structured_fields:
            value = data.get(field, "")
            if isinstance(value, list):
                value = "; ".join(str(v) for v in value)
            row.append(value)
        writer.writerow(row)

    buffer.seek(0)
    filename = f"kip_kbig2_dataset_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/nearest-town")
def get_nearest_town(
    lat: float,
    lon: float,
    current_user: User = Depends(get_current_user),
):
    """
    Slide 2 of the New Idea wizard ("Use my location"): resolves raw GPS
    coordinates to the nearest known town/area in the existing town
    coordinate registry, so the wizard can auto-fill Location without a
    third-party geocoding dependency.
    """
    key, coord, distance_km = nearest_town(lat, lon)
    if not key:
        raise HTTPException(status_code=404, detail="No known location data to match against.")
    return {
        "town": key,
        "province": coord.get("province"),
        "distance_km": round(distance_km, 1),
    }


@router.get("/{idea_id}", response_model=IdeaDetailOut)
def get_idea_detail(
    idea_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full structured detail for a single idea (all k-big-2 schema fields + scores)."""
    idea = db.query(BusinessIdea).filter(
        BusinessIdea.id == idea_id,
        BusinessIdea.user_id == current_user.id,
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found.")
    return idea


@router.post("/{idea_id}/feedback")
def submit_feedback(
    idea_id: int,
    feedback: IdeaFeedback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accept or decline a business idea.
    If declined, captures the reason for KIP's continuous learning.
    """
    idea = db.query(BusinessIdea).filter(
        BusinessIdea.id == idea_id,
        BusinessIdea.user_id == current_user.id
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found.")
    idea.accepted = feedback.accepted
    if not feedback.accepted and feedback.decline_reason:
        idea.decline_reason = feedback.decline_reason
    db.commit()
    return {"status": "feedback recorded", "idea_id": idea_id}
