from sqlalchemy.orm import Session
from app.models.conversation import Conversation
from app.models.business_idea import BusinessIdea

SCORE_BANDS = [
    (81,100,"Operator","Running and optimising a real business"),
    (61, 80,"Entrepreneur","Active business planning underway"),
    (41, 60,"Planner","Evaluating business options seriously"),
    (21, 40,"Researcher","Gathering ideas and information"),
    (0,  20,"Explorer","Just getting started with KIP"),
]

def calculate_kip_score(user_id: int, db: Session) -> dict:
    score = 0
    try:
        from app.models.business_dashboard import BusinessLaunchPlan, DailyBusinessLog
        plans = db.query(BusinessLaunchPlan).filter(BusinessLaunchPlan.user_id==user_id).count()
        logs  = db.query(DailyBusinessLog).filter(DailyBusinessLog.user_id==user_id).count()
    except Exception:
        plans = 0; logs = 0

    convs    = db.query(Conversation).filter(Conversation.user_id==user_id).count()
    ideas    = db.query(BusinessIdea).filter(BusinessIdea.user_id==user_id).count()
    accepted = db.query(BusinessIdea).filter(BusinessIdea.user_id==user_id, BusinessIdea.accepted==True).count()

    conv_pts   = min(convs*4,  20); score += conv_pts
    idea_pts   = min(ideas*10, 20); score += idea_pts
    accept_pts = min(accepted*20,20); score += accept_pts
    start_pts  = min(plans*25, 25); score += start_pts
    log_pts    = min(logs,     15); score += log_pts

    band_label="Explorer"; band_desc="Just getting started with KIP"
    s = min(score, 100)
    for low,high,label,desc in SCORE_BANDS:
        if low <= s <= high:
            band_label=label; band_desc=desc; break

    return {
        "score": s, "band": band_label, "band_desc": band_desc, "max_score": 100,
        "breakdown": {
            "conversations":    {"points":conv_pts,   "max":20, "count":convs},
            "ideas_generated":  {"points":idea_pts,   "max":20, "count":ideas},
            "ideas_accepted":   {"points":accept_pts, "max":20, "count":accepted},
            "business_started": {"points":start_pts,  "max":25, "count":plans},
            "daily_logs":       {"points":log_pts,    "max":15, "count":logs},
        }
    }
