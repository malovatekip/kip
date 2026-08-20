"""
Full account deletion.

SQLite doesn't enforce FK cascades by default and most models here don't
declare them, so every table that references the user (directly via
user_id, or indirectly via their plans/conversations/enterprises) is
cleared explicitly, children before parents. Keep this in sync when a new
user-owned model is added.
"""
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.token_blocklist import TokenBlocklist
from app.models.conversation import Conversation, Message
from app.models.startup_chat import StartupConversation, StartupMessage
from app.models.business_idea import BusinessIdea
from app.models.news import KipAlert
from app.models.business_dashboard import BusinessLaunchPlan, DailyBusinessLog, CoachingEntry
from app.models.enhanced_logs import (
    BusinessLogTemplate, EnhancedDailyLog, WeeklyReview, MLPrediction, MarketSurvey,
)
from app.models.business_chat_model import BusinessChatMessage, BusinessPlanVersion
from app.models.enterprise_models import EnterpriseBusiness, EnterpriseBranch, BranchNotification


def delete_user_account(user: User, db: Session) -> None:
    """Permanently delete a user and every row they own. Commits on success."""
    uid = user.id

    # Chat conversations and their messages
    conv_ids = [cid for (cid,) in db.query(Conversation.id).filter(Conversation.user_id == uid)]
    if conv_ids:
        db.query(Message).filter(Message.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
        db.query(Conversation).filter(Conversation.id.in_(conv_ids)).delete(synchronize_session=False)

    startup_ids = [cid for (cid,) in db.query(StartupConversation.id).filter(StartupConversation.user_id == uid)]
    if startup_ids:
        db.query(StartupMessage).filter(StartupMessage.conversation_id.in_(startup_ids)).delete(synchronize_session=False)
        db.query(StartupConversation).filter(StartupConversation.id.in_(startup_ids)).delete(synchronize_session=False)

    # Business launch plans and everything keyed to them
    plan_ids = [pid for (pid,) in db.query(BusinessLaunchPlan.id).filter(BusinessLaunchPlan.user_id == uid)]
    if plan_ids:
        for model in (
            BusinessLogTemplate, EnhancedDailyLog, WeeklyReview, MLPrediction,
            BusinessChatMessage, BusinessPlanVersion, CoachingEntry, DailyBusinessLog,
        ):
            db.query(model).filter(model.plan_id.in_(plan_ids)).delete(synchronize_session=False)
        # Branches of *other* owners' enterprises may point at these plans
        db.query(EnterpriseBranch).filter(EnterpriseBranch.plan_id.in_(plan_ids)).update(
            {EnterpriseBranch.plan_id: None}, synchronize_session=False
        )
    db.query(BusinessLaunchPlan).filter(BusinessLaunchPlan.user_id == uid).delete(synchronize_session=False)

    # Enterprises the user owns, with their branches and notifications
    ent_ids = [eid for (eid,) in db.query(EnterpriseBusiness.id).filter(EnterpriseBusiness.owner_user_id == uid)]
    if ent_ids:
        db.query(BranchNotification).filter(BranchNotification.enterprise_id.in_(ent_ids)).delete(synchronize_session=False)
        db.query(EnterpriseBranch).filter(EnterpriseBranch.enterprise_id.in_(ent_ids)).delete(synchronize_session=False)
        db.query(EnterpriseBusiness).filter(EnterpriseBusiness.id.in_(ent_ids)).delete(synchronize_session=False)
    # Detach the user from branches they manage in other people's enterprises
    db.query(EnterpriseBranch).filter(EnterpriseBranch.branch_manager_user_id == uid).update(
        {EnterpriseBranch.branch_manager_user_id: None}, synchronize_session=False
    )

    # Everything else keyed directly by user_id. The plan-child tables are
    # swept again here because e.g. a branch manager files logs against
    # plans owned by the enterprise owner, not themselves.
    for model in (
        EnhancedDailyLog, WeeklyReview, MLPrediction, BusinessChatMessage,
        BusinessPlanVersion, CoachingEntry, DailyBusinessLog,
        MarketSurvey, BusinessIdea, KipAlert, BranchNotification,
        TokenBlocklist,
    ):
        db.query(model).filter(model.user_id == uid).delete(synchronize_session=False)

    db.query(User).filter(User.id == uid).delete(synchronize_session=False)
    db.commit()
