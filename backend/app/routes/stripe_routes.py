"""
KIP Stripe Routes — Sprint 15
Endpoints: create checkout session, webhook handler, billing portal, status.
"""
import os
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.subscription_models import PaymentRecord
from app.services.subscription_service import (
    activate_premium, cancel_premium, get_usage_summary,
    PREMIUM_PRICE_ZMW, ensure_subscription_tables
)

router = APIRouter()

STRIPE_SECRET_KEY       = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET   = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PREMIUM_PRICE_ID = os.getenv("STRIPE_PREMIUM_PRICE_ID", "")  # price_xxx from Stripe dashboard
FRONTEND_URL            = os.getenv("FRONTEND_URL", "http://localhost:3000")

# ZMW to USD approximate rate for Stripe (Stripe doesn't support ZMW)
# Update this periodically — or fetch from news/rate API
ZMW_TO_USD_RATE = 0.037   # K49 ≈ $1.80 USD — Stripe requires minimum $0.50


def _stripe():
    """Lazy import stripe so app starts even if stripe is not installed."""
    try:
        import stripe as _stripe_lib
        _stripe_lib.api_key = STRIPE_SECRET_KEY
        return _stripe_lib
    except ImportError:
        raise HTTPException(status_code=503, detail="Stripe not installed. Run: pip install stripe")


# ── Create checkout session ───────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    months:        int = 1
    success_url:   Optional[str] = None
    cancel_url:    Optional[str] = None


@router.post("/create-checkout")
async def create_checkout_session(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe Checkout session for a KIP Premium subscription.
    Returns the checkout URL — frontend redirects the user to it.
    """
    ensure_subscription_tables(db)

    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured.")

    stripe = _stripe()

    amount_zmw = PREMIUM_PRICE_ZMW * req.months
    # Convert to USD cents for Stripe
    amount_usd_cents = max(int(amount_zmw * ZMW_TO_USD_RATE * 100), 200)  # min $2.00

    success_url = req.success_url or f"{FRONTEND_URL}/billing?success=true"
    cancel_url  = req.cancel_url  or f"{FRONTEND_URL}/billing?cancelled=true"

    try:
        # Get or create Stripe customer
        from app.services.subscription_service import _get_or_create_subscription
        sub = _get_or_create_subscription(current_user, db)

        customer_id = sub.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.full_name,
                metadata={"kip_user_id": str(current_user.id)},
            )
            customer_id = customer.id
            sub.stripe_customer_id = customer_id
            db.commit()

        # Create checkout session
        if STRIPE_PREMIUM_PRICE_ID:
            # Use pre-configured price (recurring subscription)
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{
                    "price":    STRIPE_PREMIUM_PRICE_ID,
                    "quantity": req.months,
                }],
                mode="subscription",
                success_url=success_url + "&session_id={CHECKOUT_SESSION_ID}",
                cancel_url=cancel_url,
                metadata={
                    "kip_user_id": str(current_user.id),
                    "months":      str(req.months),
                    "plan_tier":   "premium",
                },
            )
        else:
            # One-time payment fallback (if no recurring price set up yet)
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency":     "usd",
                        "unit_amount":  amount_usd_cents,
                        "product_data": {
                            "name":        f"KIP Premium — {req.months} month{'s' if req.months > 1 else ''}",
                            "description": f"Unlimited business ideas, AI coaching, ML predictions. K{amount_zmw:.0f} ZMW",
                        },
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url + "&session_id={CHECKOUT_SESSION_ID}",
                cancel_url=cancel_url,
                metadata={
                    "kip_user_id": str(current_user.id),
                    "months":      str(req.months),
                    "plan_tier":   "premium",
                },
            )

        # Record pending payment
        record = PaymentRecord(
            user_id=current_user.id,
            provider="stripe",
            provider_ref=session.id,
            amount_zmw=amount_zmw,
            status="pending",
            months=req.months,
            description=f"KIP Premium {req.months}mo via Stripe",
        )
        db.add(record)
        db.commit()

        return {
            "checkout_url": session.url,
            "session_id":   session.id,
            "amount_zmw":   amount_zmw,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """
    Handles Stripe webhook events.
    Set the webhook URL in Stripe Dashboard to: https://your-api.railway.app/api/stripe/webhook
    Events handled: checkout.session.completed, customer.subscription.deleted
    """
    body = await request.body()

    stripe = _stripe()

    if STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")
    else:
        # No webhook secret configured — parse directly (dev only)
        try:
            event = json.loads(body)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON.")

    event_type = event.get("type", "")
    data_obj   = event.get("data", {}).get("object", {})

    print(f"[Stripe Webhook] {event_type}")

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data_obj, db)

    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        await _handle_subscription_change(data_obj, db)

    elif event_type == "invoice.payment_failed":
        # Could notify the user — implement with email sprint
        kip_user_id = data_obj.get("metadata", {}).get("kip_user_id")
        print(f"[Stripe] Payment failed for user {kip_user_id}")

    return {"status": "ok"}


async def _handle_checkout_completed(session_obj: dict, db: Session):
    metadata   = session_obj.get("metadata", {})
    kip_user_id = metadata.get("kip_user_id")
    months      = int(metadata.get("months", 1))

    if not kip_user_id:
        print("[Stripe] No kip_user_id in metadata.")
        return

    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(UserModel.id == int(kip_user_id)).first()
    if not user:
        print(f"[Stripe] User {kip_user_id} not found.")
        return

    activate_premium(
        user, db,
        months=months,
        payment_method="stripe",
        provider_ref=session_obj.get("id"),
        stripe_customer_id=session_obj.get("customer"),
        stripe_subscription_id=session_obj.get("subscription"),
    )

    # Update payment record
    record = db.query(PaymentRecord).filter(
        PaymentRecord.provider_ref == session_obj.get("id")
    ).first()
    if record:
        record.status = "success"
        db.commit()

    print(f"[Stripe] Premium activated for user {kip_user_id}")


async def _handle_subscription_change(subscription_obj: dict, db: Session):
    status      = subscription_obj.get("status")
    customer_id = subscription_obj.get("customer")

    if status in ("canceled", "unpaid", "past_due"):
        from app.services.subscription_service import _get_or_create_subscription
        from app.models.user import User as UserModel
        # Find user by stripe customer ID
        from app.models.subscription_models import UserSubscription
        sub = db.query(UserSubscription).filter(
            UserSubscription.stripe_customer_id == customer_id
        ).first()
        if sub:
            user = db.query(UserModel).filter(UserModel.id == sub.user_id).first()
            if user:
                cancel_premium(user, db)
                print(f"[Stripe] Subscription cancelled for user {sub.user_id}")


# ── Billing portal ────────────────────────────────────────────────────────────

@router.post("/billing-portal")
async def create_billing_portal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Redirect user to Stripe's self-serve billing portal."""
    ensure_subscription_tables(db)
    stripe = _stripe()

    from app.services.subscription_service import _get_or_create_subscription
    sub = _get_or_create_subscription(current_user, db)

    if not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe subscription found.")

    try:
        portal = stripe.billing_portal.Session.create(
            customer=sub.stripe_customer_id,
            return_url=f"{FRONTEND_URL}/billing",
        )
        return {"portal_url": portal.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return current user's subscription and usage status."""
    ensure_subscription_tables(db)
    summary = get_usage_summary(current_user, db)

    from app.services.subscription_service import _get_or_create_subscription
    sub = _get_or_create_subscription(current_user, db)

    records = db.query(PaymentRecord).filter(
        PaymentRecord.user_id == current_user.id,
        PaymentRecord.status  == "success"
    ).order_by(PaymentRecord.created_at.desc()).limit(5).all()

    return {
        **summary,
        "plan_tier":             sub.plan_tier,
        "status":                sub.status,
        "trial_ends_at":         sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "current_period_end":    sub.current_period_end.isoformat() if sub.current_period_end else None,
        "payment_method":        sub.payment_method,
        "has_stripe":            bool(sub.stripe_customer_id),
        "payment_history": [
            {
                "date":     r.created_at.isoformat(),
                "amount":   f"K{r.amount_zmw:.0f}",
                "provider": r.provider,
                "status":   r.status,
                "months":   r.months,
            }
            for r in records
        ],
    }
