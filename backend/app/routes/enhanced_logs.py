"""
KIP Enhanced Log Routes — Sprint 6
All endpoints for daily logs, ML predictions, weekly reviews, and market survey.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.business_dashboard import BusinessLaunchPlan
from app.models.enhanced_logs import (
    EnhancedDailyLog, BusinessLogTemplate, WeeklyReview,
    MLPrediction, MarketSurvey
)
from app.services.ml_engine import run_all_predictions
from app.services.log_service import (
    generate_log_template, generate_daily_coaching, generate_weekly_review
)

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class DailyLogRequest(BaseModel):
    plan_id: int
    # Financial
    total_revenue:          float = 0.0
    cash_received:          float = 0.0
    mobile_money_received:  float = 0.0
    total_expenses:         float = 0.0
    expense_breakdown:      Optional[dict] = None   # {category: amount}
    revenue_by_product:     Optional[dict] = None   # {product: amount}
    # Customers
    total_customers:   int = 0
    new_customers:     int = 0
    repeat_customers:  int = 0
    walk_ins:          int = 0
    conversions:       int = 0
    refunds_count:     int = 0
    refunds_amount:    float = 0.0
    customer_note:     Optional[str] = None
    # Operations
    hours_open:          float = 0.0
    units_produced:      int = 0
    orders_fulfilled:    int = 0
    stock_status:        str = "sufficient"
    stock_movements:     Optional[dict] = None
    downtime_minutes:    int = 0
    downtime_reason:     Optional[str] = None
    custom_metric_value: float = 0.0
    # Marketing
    marketing_actions:   Optional[str] = None
    marketing_spend:     float = 0.0
    leads_generated:     int = 0
    best_channel:        Optional[str] = None
    # Productivity
    hours_worked:    float = 0.0
    time_breakdown:  Optional[dict] = None
    daily_win:       Optional[str] = None
    daily_lesson:    Optional[str] = None


class SurveyRequest(BaseModel):
    plan_id:              Optional[int] = None
    location:             Optional[str] = None
    area_type:            Optional[str] = None
    foot_traffic:         Optional[str] = None
    road_access:          Optional[str] = None
    power_reliability:    Optional[str] = None
    internet_access:      Optional[str] = None
    has_nearby_market:    bool = False
    market_distance_km:   Optional[float] = None
    dominant_income_level: Optional[str] = None
    primary_occupation:   Optional[str] = None
    peak_shopping_time:   Optional[str] = None
    payment_preference:   Optional[str] = None
    avg_spend_per_visit:  Optional[float] = None
    direct_competitors_count: Optional[int] = None
    competition_quality:  Optional[str] = None
    main_competitor_weakness: Optional[str] = None
    market_gaps_noted:    Optional[str] = None
    nearest_wholesale_km: Optional[float] = None
    supplier_reliability: Optional[str] = None
    main_supply_source:   Optional[str] = None
    has_cdf_office:       bool = False
    has_ceec_office:      bool = False
    has_bank_branch:      bool = False
    security_level:       Optional[str] = None
    seasonal_business:    bool = False
    peak_season_months:   Optional[str] = None
    additional_notes:     Optional[str] = None


# ── Log Template ────────────────────────────────────────────────────────────

@router.get("/template/{plan_id}")
async def get_log_template(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get (or generate) the custom log template for this business plan.
    Called when the user opens the daily log form.
    """
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    # Check if template already exists
    existing = db.query(BusinessLogTemplate).filter(
        BusinessLogTemplate.plan_id == plan_id
    ).first()
    if existing:
        return {"plan_id": plan_id, **json.loads(existing.custom_fields)}

    # Generate new template
    from app.models.business_idea import BusinessIdea
    idea = db.query(BusinessIdea).filter(BusinessIdea.id == plan.idea_id).first()
    idea_text = idea.full_response if idea else ""

    template_data = await generate_log_template(plan.business_name, idea_text)

    # Save template
    template = BusinessLogTemplate(
        plan_id=plan_id,
        business_type=template_data.get("business_type", plan.business_name),
        custom_fields=json.dumps(template_data)
    )
    db.add(template)
    db.commit()

    return {"plan_id": plan_id, **template_data}


# ── Daily Log Submission ────────────────────────────────────────────────────

@router.post("/submit")
async def submit_log(
    req: DailyLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit today's log. Triggers ML predictions and coaching generation.
    """
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == req.plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    # Prevent duplicate log for same day
    today = datetime.utcnow().date()
    dup = db.query(EnhancedDailyLog).filter(
        EnhancedDailyLog.plan_id == req.plan_id,
        EnhancedDailyLog.log_date >= datetime(today.year, today.month, today.day)
    ).first()
    if dup:
        raise HTTPException(status_code=400, detail="Already logged today. Come back tomorrow!")

    # Calculate derived fields
    daily_profit  = req.total_revenue - req.total_expenses
    avg_sale      = req.total_revenue / req.total_customers if req.total_customers > 0 else 0

    # Count existing logs for day number
    log_count = db.query(EnhancedDailyLog).filter(
        EnhancedDailyLog.plan_id == req.plan_id
    ).count()

    log = EnhancedDailyLog(
        plan_id=req.plan_id,
        user_id=current_user.id,
        day_number=log_count + 1,
        # Financial
        total_revenue=req.total_revenue,
        cash_received=req.cash_received,
        mobile_money_received=req.mobile_money_received,
        total_expenses=req.total_expenses,
        expense_breakdown=json.dumps(req.expense_breakdown or {}),
        daily_profit=daily_profit,
        revenue_by_product=json.dumps(req.revenue_by_product or {}),
        # Customers
        total_customers=req.total_customers,
        new_customers=req.new_customers,
        repeat_customers=req.repeat_customers,
        walk_ins=req.walk_ins,
        conversions=req.conversions,
        avg_sale_value=round(avg_sale, 2),
        refunds_count=req.refunds_count,
        refunds_amount=req.refunds_amount,
        customer_note=req.customer_note,
        # Operations
        hours_open=req.hours_open,
        units_produced=req.units_produced,
        orders_fulfilled=req.orders_fulfilled,
        stock_status=req.stock_status,
        stock_movements=json.dumps(req.stock_movements or {}),
        downtime_minutes=req.downtime_minutes,
        downtime_reason=req.downtime_reason,
        custom_metric_value=req.custom_metric_value,
        # Marketing
        marketing_actions=req.marketing_actions,
        marketing_spend=req.marketing_spend,
        leads_generated=req.leads_generated,
        best_channel=req.best_channel,
        # Productivity
        hours_worked=req.hours_worked,
        time_breakdown=json.dumps(req.time_breakdown or {}),
        daily_win=req.daily_win,
        daily_lesson=req.daily_lesson,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # ── Load all logs for ML ──
    all_logs = _get_logs_as_dicts(plan_id=req.plan_id, db=db)

    # ── Run ML predictions ──
    ml = run_all_predictions(all_logs, plan.projected_monthly_profit or 0)

    # Save ML prediction record
    pred = MLPrediction(
        plan_id=req.plan_id,
        user_id=current_user.id,
        **{k: v for k, v in ml.items() if k not in ('generated_at', 'log_count')}
    )
    db.add(pred)

    # ── Generate coaching ──
    log_dict = _log_to_dict(log)
    coaching = await generate_daily_coaching(
        log_data=log_dict,
        recent_logs=all_logs,
        ml_predictions=ml,
        business_name=plan.business_name,
        user_name=current_user.full_name,
        projected_monthly_profit=plan.projected_monthly_profit or 0
    )
    log.coaching_response = coaching
    log.coaching_at = datetime.utcnow()
    db.commit()

    # ── Check if weekly review needed (every 7 logs) ──
    total_logs = len(all_logs)
    weekly_review_available = (total_logs % 7 == 0 and total_logs > 0)

    return {
        "log_id":          log.id,
        "day_number":      log.day_number,
        "daily_profit":    round(daily_profit, 2),
        "avg_sale_value":  round(avg_sale, 2),
        "coaching":        coaching,
        "ml_predictions":  ml,
        "weekly_review_available": weekly_review_available,
    }


# ── Log History ─────────────────────────────────────────────────────────────

@router.get("/history/{plan_id}")
def get_log_history(
    plan_id: int,
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    logs = db.query(EnhancedDailyLog).filter(
        EnhancedDailyLog.plan_id == plan_id
    ).order_by(EnhancedDailyLog.log_date.desc()).limit(limit).all()

    return [_log_to_dict(l) for l in logs]


@router.get("/predictions/{plan_id}")
def get_predictions(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get latest ML predictions for a plan."""
    pred = db.query(MLPrediction).filter(
        MLPrediction.plan_id == plan_id,
        MLPrediction.user_id == current_user.id
    ).order_by(MLPrediction.generated_at.desc()).first()
    if not pred:
        return {}
    return {
        "revenue_forecast_7d":    json.loads(pred.revenue_forecast_7d or '[]'),
        "forecast_confidence":    pred.forecast_confidence,
        "customer_trend":         pred.customer_trend,
        "customer_trend_pct":     pred.customer_trend_pct,
        "peak_day_of_week":       pred.peak_day_of_week,
        "days_until_stockout":    pred.days_until_stockout,
        "low_stock_items":        json.loads(pred.low_stock_items or '[]'),
        "expense_anomaly":        pred.expense_anomaly,
        "anomaly_detail":         pred.anomaly_detail,
        "breakeven_progress_pct": pred.breakeven_progress_pct,
        "days_to_breakeven":      pred.days_to_breakeven,
        "generated_at":           pred.generated_at.isoformat(),
    }


# ── Weekly Review ───────────────────────────────────────────────────────────

@router.post("/weekly-review/{plan_id}")
async def trigger_weekly_review(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate or retrieve the weekly review."""
    plan = db.query(BusinessLaunchPlan).filter(
        BusinessLaunchPlan.id == plan_id,
        BusinessLaunchPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    # Get this week's logs
    week_start = datetime.utcnow() - timedelta(days=7)
    current_logs = db.query(EnhancedDailyLog).filter(
        EnhancedDailyLog.plan_id == plan_id,
        EnhancedDailyLog.log_date >= week_start
    ).order_by(EnhancedDailyLog.log_date.asc()).all()

    if len(current_logs) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 logs this week for a review.")

    # Previous week
    prev_start = week_start - timedelta(days=7)
    prev_logs = db.query(EnhancedDailyLog).filter(
        EnhancedDailyLog.plan_id == plan_id,
        EnhancedDailyLog.log_date >= prev_start,
        EnhancedDailyLog.log_date < week_start
    ).all()

    result = await generate_weekly_review(
        logs=[_log_to_dict(l) for l in current_logs],
        business_name=plan.business_name,
        user_name=current_user.full_name,
        prev_week_logs=[_log_to_dict(l) for l in prev_logs] if prev_logs else None
    )

    # Save weekly review
    review = WeeklyReview(
        plan_id=plan_id,
        user_id=current_user.id,
        week_start=week_start,
        week_end=datetime.utcnow(),
        total_revenue=result.get("total_revenue", 0),
        total_expenses=result.get("total_expenses", 0),
        net_profit=result.get("net_profit", 0),
        avg_daily_customers=result.get("avg_daily_customers", 0),
        avg_sale_value=result.get("avg_sale_value", 0),
        total_logs_filed=len(current_logs),
        revenue_change_pct=result.get("revenue_change_pct"),
        customer_change_pct=result.get("customer_change_pct"),
        peak_day=result.get("peak_day"),
        biggest_expense_cat=result.get("biggest_expense_category"),
        trend_status=result.get("trend_status", "neutral"),
        kip_summary=result.get("kip_narrative", ""),
    )
    db.add(review)
    db.commit()

    return result


# ── Market Survey ───────────────────────────────────────────────────────────

@router.post("/survey")
async def submit_survey(
    req: SurveyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit or update market survey for a location/plan."""
    existing = db.query(MarketSurvey).filter(
        MarketSurvey.user_id == current_user.id,
        MarketSurvey.plan_id == req.plan_id
    ).first()

    data = req.dict()
    data['user_id'] = current_user.id
    data['completed_at'] = datetime.utcnow()

    if existing:
        for k, v in data.items():
            if hasattr(existing, k) and v is not None:
                setattr(existing, k, v)
        existing.updated_at = datetime.utcnow()
        db.commit()
        from app.services.survey_json import save_survey_json
        save_survey_json(req.location or "", {c.name: getattr(survey_obj, c.name) for c in survey_obj.__table__.columns}, "market_survey")
        return {"status": "updated", "survey_id": existing.id}
    else:
        survey = MarketSurvey(**data)
        db.add(survey)
        db.commit()
        db.refresh(survey)
        return {"status": "created", "survey_id": survey.id}


@router.get("/survey/{plan_id}")
def get_survey(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    survey = db.query(MarketSurvey).filter(
        MarketSurvey.user_id == current_user.id,
        MarketSurvey.plan_id == plan_id
    ).first()
    if not survey:
        return None
    return {c.name: getattr(survey, c.name) for c in survey.__table__.columns}


@router.get("/survey")
def get_user_surveys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all surveys submitted by this user (across all businesses)."""
    surveys = db.query(MarketSurvey).filter(
        MarketSurvey.user_id == current_user.id
    ).order_by(MarketSurvey.created_at.desc()).all()
    return [{c.name: getattr(s, c.name) for c in s.__table__.columns} for s in surveys]


# ── Helpers ─────────────────────────────────────────────────────────────────

def _log_to_dict(log: EnhancedDailyLog) -> dict:
    return {
        "id": log.id,
        "log_date": log.log_date.isoformat() if log.log_date else None,
        "day_number": log.day_number,
        "total_revenue": log.total_revenue,
        "cash_received": log.cash_received,
        "mobile_money_received": log.mobile_money_received,
        "total_expenses": log.total_expenses,
        "expense_breakdown": log.expense_breakdown,
        "daily_profit": log.daily_profit,
        "revenue_by_product": log.revenue_by_product,
        "total_customers": log.total_customers,
        "new_customers": log.new_customers,
        "repeat_customers": log.repeat_customers,
        "walk_ins": log.walk_ins,
        "conversions": log.conversions,
        "avg_sale_value": log.avg_sale_value,
        "refunds_count": log.refunds_count,
        "refunds_amount": log.refunds_amount,
        "customer_note": log.customer_note,
        "hours_open": log.hours_open,
        "units_produced": log.units_produced,
        "stock_status": log.stock_status,
        "downtime_minutes": log.downtime_minutes,
        "downtime_reason": log.downtime_reason,
        "custom_metric_value": log.custom_metric_value,
        "marketing_actions": log.marketing_actions,
        "marketing_spend": log.marketing_spend,
        "leads_generated": log.leads_generated,
        "best_channel": log.best_channel,
        "hours_worked": log.hours_worked,
        "daily_win": log.daily_win,
        "daily_lesson": log.daily_lesson,
        "coaching_response": log.coaching_response,
    }


def _get_logs_as_dicts(plan_id: int, db: Session) -> list:
    logs = db.query(EnhancedDailyLog).filter(
        EnhancedDailyLog.plan_id == plan_id
    ).order_by(EnhancedDailyLog.log_date.asc()).all()
    return [_log_to_dict(l) for l in logs]
# submit_survey()