from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.business_idea import BusinessIdea
from app.schemas import IdeaOut, IdeaFeedback
from app.security import get_current_user

router = APIRouter()

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
