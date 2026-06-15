"""
KIP Flutterwave Routes — Sprint 15
Mobile money payments via Flutterwave (MTN Zambia + Airtel Zambia).
"""
import os
import hmac
import hashlib
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.models.subscription_models import PaymentRecord
from app.services.subscription_service import (
    activate_premium, PREMIUM_PRICE_ZMW, ensure_subscription_tables
)

router = APIRouter()

FLW_SECRET_KEY    = os.getenv("FLW_SECRET_KEY", "")
FLW_PUBLIC_KEY    = os.getenv("FLW_PUBLIC_KEY", "")
FLW_SECRET_HASH   = os.getenv("FLW_SECRET_HASH", "")   # webhook verification
FRONTEND_URL      = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL       = os.getenv("BACKEND_URL", "")

# Zambia network codes
NETWORK_MAP = {
    "mtn":   "MTN",
    "airtel": "ZAMTEL",   # Flutterwave uses ZAMTEL for Airtel Zambia
    "zamtel": "ZAMTEL",
}


class MobileMoneyRequest(BaseModel):
    phone_number: str          # e.g. "0977123456" or "260977123456"
    network:      str          # mtn | airtel | zamtel
    months:       int = 1
    full_name:    Optional[str] = None  # override if different from account name


def _normalise_phone(phone: str) -> str:
    """Convert 09xxxxxxxx or 260xxxxxxxxx to 260xxxxxxxxx."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("0"):
        phone = "260" + phone[1:]
    if not phone.startswith("260"):
        phone = "260" + phone
    return phone


@router.post("/initiate")
async def initiate_mobile_money(
    req: MobileMoneyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate a mobile money payment via Flutterwave.
    The user will receive a USSD push prompt on their phone.
    """
    ensure_subscription_tables(db)

    if not FLW_SECRET_KEY:
        raise HTTPException(status_code=503,
            detail="Flutterwave not configured. Set FLW_SECRET_KEY in environment.")

    network = req.network.lower()
    if network not in NETWORK_MAP:
        raise HTTPException(status_code=400,
            detail=f"Unsupported network '{req.network}'. Use: mtn, airtel, or zamtel.")

    phone      = _normalise_phone(req.phone_number)
    amount_zmw = PREMIUM_PRICE_ZMW * req.months
    tx_ref     = f"kip-{current_user.id}-{int(datetime.utcnow().timestamp())}"

    # Save pending payment record first
    record = PaymentRecord(
        user_id=current_user.id,
        provider="flutterwave",
        provider_ref=tx_ref,
        amount_zmw=amount_zmw,
        status="pending",
        months=req.months,
        description=f"KIP Premium {req.months}mo via {req.network.upper()}",
    )
    db.add(record)
    db.commit()

    payload = {
        "tx_ref":       tx_ref,
        "amount":       amount_zmw,
        "currency":     "ZMW",
        "network":      NETWORK_MAP[network],
        "email":        current_user.email,
        "phone_number": phone,
        "fullname":     req.full_name or current_user.full_name,
        "meta": {
            "kip_user_id": str(current_user.id),
            "months":      str(req.months),
            "plan_tier":   "premium",
        },
        "redirect_url": f"{FRONTEND_URL}/billing?flw=complete",
    }

    headers = {
        "Authorization": f"Bearer {FLW_SECRET_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.flutterwave.com/v3/charges?type=mobile_money_zambia",
                json=payload,
                headers=headers,
            )
        data = resp.json()

        if data.get("status") == "success":
            return {
                "status":   "pending",
                "message":  f"A payment prompt has been sent to {phone}. Approve on your phone to complete payment.",
                "tx_ref":   tx_ref,
                "amount":   f"K{amount_zmw:.0f}",
                "network":  req.network.upper(),
                "flw_ref":  data.get("data", {}).get("flw_ref"),
            }
        else:
            # Mark as failed
            record.status = "failed"
            db.commit()
            raise HTTPException(status_code=400,
                detail=data.get("message", "Flutterwave payment initiation failed."))

    except HTTPException:
        raise
    except Exception as e:
        record.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")


@router.get("/verify/{tx_ref}")
async def verify_payment(
    tx_ref: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify a Flutterwave payment by tx_ref.
    Called by frontend after redirect back from payment.
    """
    ensure_subscription_tables(db)

    record = db.query(PaymentRecord).filter(
        PaymentRecord.provider_ref == tx_ref,
        PaymentRecord.user_id      == current_user.id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if record.status == "success":
        return {"status": "success", "already_activated": True}

    if not FLW_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Flutterwave not configured.")

    headers = {"Authorization": f"Bearer {FLW_SECRET_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://api.flutterwave.com/v3/transactions?tx_ref={tx_ref}",
                headers=headers,
            )
        data = resp.json()
        transactions = data.get("data", [])

        if not transactions:
            return {"status": "pending", "message": "Payment not yet confirmed. Please wait."}

        tx = transactions[0]
        if tx.get("status") == "successful" and tx.get("currency") == "ZMW":
            # Activate premium
            activate_premium(
                current_user, db,
                months=record.months,
                payment_method="flutterwave",
                provider_ref=tx_ref,
                flw_customer_id=str(tx.get("customer", {}).get("id", "")),
            )
            record.status = "success"
            db.commit()
            return {"status": "success", "message": "Payment confirmed. Premium activated!"}
        else:
            return {"status": tx.get("status", "pending"),
                    "message": "Payment not yet confirmed."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def flutterwave_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Flutterwave webhook — called when payment status changes.
    Verify signature and activate premium if payment successful.
    """
    body    = await request.body()
    sig_hdr = request.headers.get("verif-hash", "")

    # Verify webhook signature
    if FLW_SECRET_HASH and sig_hdr != FLW_SECRET_HASH:
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON.")

    if event.get("event") != "charge.completed":
        return {"status": "ignored"}

    tx   = event.get("data", {})
    meta = tx.get("meta", {})

    if tx.get("status") != "successful" or tx.get("currency") != "ZMW":
        return {"status": "not_successful"}

    kip_user_id = meta.get("kip_user_id") or tx.get("meta", {}).get("kip_user_id")
    tx_ref      = tx.get("tx_ref", "")
    months      = int(meta.get("months", 1))

    if not kip_user_id:
        print(f"[FLW Webhook] No kip_user_id in metadata for tx {tx_ref}")
        return {"status": "no_user_id"}

    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(UserModel.id == int(kip_user_id)).first()
    if not user:
        print(f"[FLW Webhook] User {kip_user_id} not found")
        return {"status": "user_not_found"}

    activate_premium(
        user, db,
        months=months,
        payment_method="flutterwave",
        provider_ref=tx_ref,
        flw_customer_id=str(tx.get("customer", {}).get("id", "")),
    )

    record = db.query(PaymentRecord).filter(
        PaymentRecord.provider_ref == tx_ref
    ).first()
    if record:
        record.status = "success"
        db.commit()

    print(f"[FLW Webhook] Premium activated for user {kip_user_id}")
    return {"status": "ok"}
