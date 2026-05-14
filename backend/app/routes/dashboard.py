from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.business_idea import BusinessIdea
from app.schemas import DashboardStats
from app.security import get_current_user
from app.services.kip_score import calculate_kip_score

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DashboardStats(
        total_conversations=db.query(Conversation).filter(Conversation.user_id==current_user.id).count(),
        total_ideas=db.query(BusinessIdea).filter(BusinessIdea.user_id==current_user.id).count(),
        accepted_ideas=db.query(BusinessIdea).filter(BusinessIdea.user_id==current_user.id, BusinessIdea.accepted==True).count(),
        member_since=current_user.created_at
    )

@router.get("/recent-ideas")
def get_recent_ideas(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.business_dashboard import BusinessLaunchPlan
    ideas = db.query(BusinessIdea).filter(BusinessIdea.user_id==current_user.id).order_by(BusinessIdea.created_at.desc()).limit(3).all()
    result = []
    for i in ideas:
        plan = db.query(BusinessLaunchPlan).filter(BusinessLaunchPlan.idea_id==i.id, BusinessLaunchPlan.user_id==current_user.id).first()
        result.append({"id":i.id,"idea_name":i.idea_name,"location":i.location,
                       "capital_amount":i.capital_amount,"accepted":i.accepted,"plan_id":plan.id if plan else None})
    return result

@router.get("/score")
def get_kip_score(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return calculate_kip_score(current_user.id, db)
