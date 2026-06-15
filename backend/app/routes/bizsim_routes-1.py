"""
KIP BizSim Routes — FastAPI endpoints
POST /api/bizsim/start         - start new game session
GET  /api/bizsim/session/{id}  - get full game state
POST /api/bizsim/day/run       - run one day's simulation
GET  /api/bizsim/statements    - P&L, balance sheet, cash flow
POST /api/bizsim/loan/apply    - apply for a loan (Phase 3)
POST /api/bizsim/negotiate     - AI supplier negotiation
GET  /api/bizsim/market        - global market state
GET  /api/bizsim/leaderboard   - top players
GET  /api/bizsim/missions      - missions + progress
POST /api/bizsim/restart       - restart current session
"""
import json, random
from datetime import datetime
from typing import Optional, List

from fastapi           import APIRouter, Depends, HTTPException
from sqlalchemy.orm    import Session
from sqlalchemy        import text
from pydantic          import BaseModel

from app.database  import get_db
from app.security  import get_current_user
from app.models.user import User
from app.routes.bizsim_engine import (
    BUSINESS_TYPES, MISSIONS, ACCOUNTS,
    calculate_demand, apply_unique_mechanics,
    get_market_state, simulate_competitor_day,
    check_phase_unlock, check_missions,
    record_transaction, get_balance_sheet,
    generate_ai_coaching, generate_market_event,
    ai_supplier_negotiation,
)

router = APIRouter()

# ── DB table creation ─────────────────────────────────────────────────────────

def ensure_tables(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS bizsim_sessions (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id           INTEGER NOT NULL,
            biz_type          TEXT NOT NULL,
            biz_name          TEXT NOT NULL,
            phase             INTEGER DEFAULT 1,
            day               INTEGER DEFAULT 1,
            cash              REAL DEFAULT 0,
            inventory         INTEGER DEFAULT 0,
            inventory_value   REAL DEFAULT 0,
            total_revenue     REAL DEFAULT 0,
            total_expenses    REAL DEFAULT 0,
            total_profit      REAL DEFAULT 0,
            total_customers   INTEGER DEFAULT 0,
            loan_balance      REAL DEFAULT 0,
            loan_interest_rate REAL DEFAULT 0,
            employees         INTEGER DEFAULT 0,
            employee_cost     REAL DEFAULT 0,
            market_state      TEXT DEFAULT '{}',
            competitors       TEXT DEFAULT '[]',
            completed_missions TEXT DEFAULT '[]',
            history           TEXT DEFAULT '[]',
            status            TEXT DEFAULT 'active',
            flock_size        INTEGER DEFAULT 0,
            phase_unlocked    INTEGER DEFAULT 1,
            score             REAL DEFAULT 0,
            created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at        TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS bizsim_ledger (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  INTEGER NOT NULL,
            day         INTEGER NOT NULL,
            description TEXT NOT NULL,
            account     TEXT NOT NULL,
            debit       REAL DEFAULT 0,
            credit      REAL DEFAULT 0,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS bizsim_market (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            day          INTEGER NOT NULL,
            demand_index REAL DEFAULT 1.0,
            weather_factor REAL DEFAULT 1.0,
            fuel_price   REAL DEFAULT 1.0,
            usd_zmw_rate REAL DEFAULT 1.0,
            volatility   REAL DEFAULT 0.12,
            cogs_mult    REAL DEFAULT 1.0,
            event_json   TEXT,
            updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS bizsim_messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  INTEGER NOT NULL,
            sender      TEXT NOT NULL,
            content     TEXT NOT NULL,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.commit()


def _get_session(user_id: int, db: Session):
    row = db.execute(text(
        "SELECT * FROM bizsim_sessions WHERE user_id=:uid AND status='active'"
    ), {"uid": user_id}).fetchone()
    return row


def _session_to_dict(row) -> dict:
    if row is None:
        return None
    keys = ["id","user_id","biz_type","biz_name","phase","day","cash","inventory",
            "inventory_value","total_revenue","total_expenses","total_profit",
            "total_customers","loan_balance","loan_interest_rate","employees",
            "employee_cost","market_state","competitors","completed_missions",
            "history","status","flock_size","phase_unlocked","score",
            "created_at","updated_at"]
    d = dict(zip(keys, row))
    for k in ["market_state","competitors","completed_missions","history"]:
        try:
            d[k] = json.loads(d[k] or "[]" if k != "market_state" else d[k] or "{}")
        except Exception:
            d[k] = {} if k == "market_state" else []
    return d


# ── Schemas ───────────────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    biz_type: str
    biz_name: str

class DayRequest(BaseModel):
    stock_buy:      int
    price:          float
    marketing:      float = 0
    save_amount:    float = 0
    hire_employee:  bool  = False
    take_loan:      Optional[float] = None   # Phase 3

class NegotiateRequest(BaseModel):
    message: str

class LoanRequest(BaseModel):
    amount:   float
    provider: str = "CEEC"   # CEEC, DBZ, ZANACO, kaloba


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/business-types")
def get_business_types():
    """Return all playable business types."""
    return {
        "businesses": [
            {
                "id":          k,
                "name":        v["name"],
                "location":    v["location"],
                "emoji":       v["emoji"],
                "colour":      v["colour"],
                "capital":     v["phase1_capital"],
                "description": v["description"],
                "teaches":     v["teaches"],
                "mechanic":    v["unique_mechanic"],
                "unit":        v["unit"],
            }
            for k, v in BUSINESS_TYPES.items()
        ]
    }


@router.post("/start")
def start_game(
    req: StartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)

    if req.biz_type not in BUSINESS_TYPES:
        raise HTTPException(400, "Invalid business type.")

    b           = BUSINESS_TYPES[req.biz_type]
    start_cash  = b["phase1_capital"]

    # End any existing active session
    db.execute(text(
        "UPDATE bizsim_sessions SET status='abandoned' WHERE user_id=:uid AND status='active'"
    ), {"uid": current_user.id})
    db.commit()

    # Create new session
    db.execute(text("""
        INSERT INTO bizsim_sessions
          (user_id, biz_type, biz_name, cash, inventory, market_state,
           competitors, completed_missions, history, status, flock_size, updated_at)
        VALUES
          (:uid, :bt, :bn, :cash, 10, :ms, :comps, '[]', '[]', 'active', :flock, :now)
    """), {
        "uid":   current_user.id,
        "bt":    req.biz_type,
        "bn":    req.biz_name,
        "cash":  start_cash,
        "ms":    json.dumps({"demand_index": 1.0, "weather_factor": 1.0,
                              "fuel_price": 1.0, "usd_zmw_rate": 1.0,
                              "volatility": 0.12, "cogs_mult": 1.0}),
        "comps": json.dumps([
            {"id": "comp_1", "name": "Bwalya's Shop",     "personality": "aggressive",
             "biz_type": req.biz_type, "price": b["cogs_per_unit"] * b["optimal_markup"] * 0.92,
             "revenue": 0, "customers": 0},
            {"id": "comp_2", "name": "Mwanza Brothers",   "personality": "premium",
             "biz_type": req.biz_type, "price": b["cogs_per_unit"] * b["optimal_markup"] * 1.25,
             "revenue": 0, "customers": 0},
        ]),
        "flock": 20 if req.biz_type == "poultry" else 0,
        "now":   datetime.utcnow().isoformat(),
    })
    db.commit()

    session_row = _get_session(current_user.id, db)
    session     = _session_to_dict(session_row)

    # Opening balance sheet entry
    record_transaction(db, session["id"], "Opening capital", [
        {"account": "cash",   "debit":  start_cash, "credit": 0},
        {"account": "equity", "debit":  0,           "credit": start_cash},
    ], day=0)
    # Initial inventory
    inventory_value = 10 * b["cogs_per_unit"]
    record_transaction(db, session["id"], "Initial inventory purchase", [
        {"account": "inventory", "debit":  inventory_value, "credit": 0},
        {"account": "cash",      "debit":  0, "credit": inventory_value},
    ], day=0)
    db.execute(text("UPDATE bizsim_sessions SET cash=:c, inventory_value=:iv WHERE id=:sid"), {
        "c":   start_cash - inventory_value,
        "iv":  inventory_value,
        "sid": session["id"],
    })
    db.commit()

    return {"session": _session_to_dict(_get_session(current_user.id, db)),
            "business": b, "message": f"Welcome! Your {req.biz_name} is open for business."}


@router.get("/session")
def get_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    row = _get_session(current_user.id, db)
    if not row:
        return {"session": None}
    s = _session_to_dict(row)
    bs = get_balance_sheet(db, s["id"])
    return {"session": s, "balance_sheet": bs}


@router.post("/day/run")
async def run_day(
    req: DayRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    row = _get_session(current_user.id, db)
    if not row:
        raise HTTPException(404, "No active game session.")
    s = _session_to_dict(row)

    if s["status"] != "active":
        raise HTTPException(400, "Game session is not active.")

    b       = BUSINESS_TYPES[s["biz_type"]]
    day     = s["day"]
    phase   = s["phase"]

    # ── 1. Update market state ────────────────────────────────────────────────
    market_state, macro_event = get_market_state(day, s["market_state"])

    # 15% chance of AI-generated event on non-macro days
    ai_event = None
    if not macro_event and random.random() < 0.15:
        ai_event = await generate_market_event(s["biz_type"], s, day)

    active_event = macro_event or ai_event

    # ── 2. Apply COGS multiplier ──────────────────────────────────────────────
    effective_cogs = b["cogs_per_unit"] * market_state.get("cogs_mult", 1.0)

    # Validate price (must be positive)
    if req.price <= 0:
        raise HTTPException(400, "Selling price must be greater than 0.")

    # ── 3. Stock purchase ─────────────────────────────────────────────────────
    max_can_buy = int(s["cash"] / effective_cogs)
    stock_buy   = min(req.stock_buy, max_can_buy)
    stock_cost  = stock_buy * effective_cogs

    if stock_cost > s["cash"]:
        stock_buy  = max_can_buy
        stock_cost = stock_buy * effective_cogs

    # ── 4. Calculate demand ───────────────────────────────────────────────────
    competitors = s["competitors"]
    for comp in competitors:
        comp.update(simulate_competitor_day(comp, market_state, req.price))

    demand_result = calculate_demand(
        biz_type=s["biz_type"],
        price=req.price,
        marketing_spend=req.marketing,
        market_state=market_state,
        competitors=competitors,
        phase=phase,
        day=day,
    )

    # ── 5. Apply event demand modifier ───────────────────────────────────────
    event_demand_mult = 1.0
    event_cash_bonus  = 0
    if active_event:
        if isinstance(active_event, dict):
            event_demand_mult = active_event.get("demand_impact", active_event.get("demand_index", 1.0))
            event_cash_bonus  = active_event.get("cash_bonus", active_event.get("grant", 0))

    units_sold = min(
        int(demand_result["demand"] * event_demand_mult),
        s["inventory"] + stock_buy,
    )
    units_sold = max(0, units_sold)

    # ── 6. Apply unique business mechanics ───────────────────────────────────
    stock_after = s["inventory"] + stock_buy - units_sold
    adjustments = apply_unique_mechanics(
        s["biz_type"], s, stock_after, units_sold, market_state
    )

    # Handle breakdown override
    if adjustments.get("revenue_override") == 0:
        units_sold = 0

    # ── 7. Calculate financials ───────────────────────────────────────────────
    revenue    = units_sold * req.price
    marketing  = req.marketing
    cogs_total = units_sold * effective_cogs
    fixed_cost = 0

    if phase >= 2:
        fixed_cost += b["fixed_cost_ph2"]
        if s["employees"] > 0:
            fixed_cost += s["employee_cost"]

    # Loan interest (Phase 3)
    interest = 0
    if phase >= 3 and s["loan_balance"] > 0:
        daily_rate = (s["loan_interest_rate"] / 100) / 30
        interest   = round(s["loan_balance"] * daily_rate, 2)

    total_expenses = stock_cost + marketing + fixed_cost + interest + abs(adjustments["cash_delta"])
    gross_profit   = revenue - cogs_total
    net_profit     = revenue - total_expenses

    # Save amount (can't save more than revenue)
    save_amount = min(req.save_amount, max(0, revenue))

    # ── 8. Update cash ────────────────────────────────────────────────────────
    new_cash = (s["cash"]
                - stock_cost
                - marketing
                - fixed_cost
                - interest
                + revenue
                + event_cash_bonus
                + adjustments.get("cash_delta", 0)
                - save_amount)

    # ── 9. Check solvency ─────────────────────────────────────────────────────
    bankrupt = new_cash < 0

    # ── 10. Double-entry ledger ───────────────────────────────────────────────
    if stock_buy > 0:
        record_transaction(db, s["id"], f"Day {day}: Inventory purchase", [
            {"account": "inventory", "debit":  stock_cost, "credit": 0},
            {"account": "cash",      "debit":  0,          "credit": stock_cost},
        ], day)
    if revenue > 0:
        record_transaction(db, s["id"], f"Day {day}: Sales revenue", [
            {"account": "cash",    "debit":  revenue,    "credit": 0},
            {"account": "revenue", "debit":  0,          "credit": revenue},
        ], day)
        record_transaction(db, s["id"], f"Day {day}: Cost of goods sold", [
            {"account": "cogs",      "debit":  cogs_total, "credit": 0},
            {"account": "inventory", "debit":  0,          "credit": cogs_total},
        ], day)
    if marketing > 0:
        record_transaction(db, s["id"], f"Day {day}: Marketing", [
            {"account": "marketing", "debit":  marketing, "credit": 0},
            {"account": "cash",      "debit":  0,          "credit": marketing},
        ], day)
    if fixed_cost > 0:
        record_transaction(db, s["id"], f"Day {day}: Fixed costs", [
            {"account": "rent", "debit":  fixed_cost, "credit": 0},
            {"account": "cash", "debit":  0,           "credit": fixed_cost},
        ], day)
    if interest > 0:
        record_transaction(db, s["id"], f"Day {day}: Loan interest", [
            {"account": "interest",      "debit":  interest, "credit": 0},
            {"account": "loan_payable",  "debit":  interest, "credit": 0},
            {"account": "cash",          "debit":  0,         "credit": interest * 2},
        ], day)

    # ── 11. Build day record ──────────────────────────────────────────────────
    day_record = {
        "day":           day,
        "units_sold":    units_sold,
        "stock_bought":  stock_buy,
        "price":         req.price,
        "cogs":          effective_cogs,
        "marketing":     marketing,
        "revenue":       round(revenue, 2),
        "cogs_total":    round(cogs_total, 2),
        "gross_profit":  round(gross_profit, 2),
        "fixed_cost":    round(fixed_cost, 2),
        "interest":      round(interest, 2),
        "total_expenses":round(total_expenses, 2),
        "profit":        round(net_profit, 2),
        "saved":         round(save_amount, 2),
        "cash_after":    round(max(0, new_cash), 2),
        "event":         active_event,
        "demand_factors":demand_result,
        "adjustments":   adjustments,
        "gross_margin_pct": round((gross_profit / revenue * 100) if revenue > 0 else 0, 1),
    }

    # ── 12. Check missions ────────────────────────────────────────────────────
    history          = s["history"] + [day_record]
    completed        = s["completed_missions"]
    newly_completed  = check_missions(history, {**s, "cash": new_cash}, completed)
    mission_rewards  = 0
    for mid in newly_completed:
        m = next((m for m in MISSIONS if m["id"] == mid), None)
        if m:
            mission_rewards += m.get("reward_cash", 0)
            completed.append(mid)

    new_cash += mission_rewards

    # ── 13. Check phase unlock ────────────────────────────────────────────────
    updated_session = {**s, "cash": new_cash, "phase": s["phase"]}
    unlocked_phase  = check_phase_unlock(updated_session, history)

    # ── 14. Check bankruptcy ──────────────────────────────────────────────────
    status = "failed" if bankrupt else "active"
    if bankrupt:
        new_cash = 0

    # ── 15. Persist updates ───────────────────────────────────────────────────
    new_inventory       = max(0, stock_after + adjustments.get("stock_delta", 0))
    new_inventory_value = new_inventory * effective_cogs

    db.execute(text("""
        UPDATE bizsim_sessions SET
            day=:day, cash=:cash, inventory=:inv, inventory_value=:iv,
            total_revenue=:tr, total_expenses=:te, total_profit=:tp,
            total_customers=:tc, market_state=:ms, competitors=:comps,
            completed_missions=:missions, history=:hist,
            status=:status, phase=:phase, phase_unlocked=:pu,
            updated_at=:now
        WHERE id=:sid
    """), {
        "day":      day + 1,
        "cash":     round(new_cash, 2),
        "inv":      new_inventory,
        "iv":       round(new_inventory_value, 2),
        "tr":       round(s["total_revenue"] + revenue, 2),
        "te":       round(s["total_expenses"] + total_expenses, 2),
        "tp":       round(s["total_profit"] + net_profit, 2),
        "tc":       s["total_customers"] + units_sold,
        "ms":       json.dumps(market_state),
        "comps":    json.dumps(competitors),
        "missions": json.dumps(completed),
        "hist":     json.dumps(history[-60:]),   # keep last 60 days
        "status":   status,
        "phase":    unlocked_phase if unlocked_phase else s["phase"],
        "pu":       unlocked_phase if unlocked_phase else s["phase_unlocked"],
        "now":      datetime.utcnow().isoformat(),
        "sid":      s["id"],
    })
    db.commit()

    # ── 16. Weekly AI coaching ────────────────────────────────────────────────
    coaching = None
    if day % 7 == 0:
        week_history = history[-7:]
        bs           = get_balance_sheet(db, s["id"])
        coaching     = await generate_ai_coaching(
            s["biz_type"], day // 7, week_history, bs, s["phase"]
        )

    return {
        "day_result":          day_record,
        "new_cash":            round(max(0, new_cash), 2),
        "new_inventory":       new_inventory,
        "status":              status,
        "bankrupt":            bankrupt,
        "phase_unlocked":      unlocked_phase,
        "newly_completed_missions": newly_completed,
        "mission_rewards":     mission_rewards,
        "coaching":            coaching,
        "competitors":         competitors,
        "market_state":        market_state,
    }


@router.get("/statements")
def get_financial_statements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    row = _get_session(current_user.id, db)
    if not row:
        raise HTTPException(404, "No active session.")
    s  = _session_to_dict(row)
    bs = get_balance_sheet(db, s["id"])

    history = s["history"]
    if not history:
        return {"balance_sheet": bs, "profit_loss": {}, "cash_flow": {}}

    # Profit & Loss
    revenue      = sum(d["revenue"]        for d in history)
    cogs_total   = sum(d.get("cogs_total", 0) for d in history)
    gross_profit = revenue - cogs_total
    marketing    = sum(d.get("marketing",  0) for d in history)
    fixed_costs  = sum(d.get("fixed_cost", 0) for d in history)
    interest     = sum(d.get("interest",   0) for d in history)
    net_profit   = sum(d["profit"]          for d in history)

    pl = {
        "revenue":       round(revenue, 2),
        "cogs":          round(cogs_total, 2),
        "gross_profit":  round(gross_profit, 2),
        "gross_margin":  round((gross_profit / revenue * 100) if revenue > 0 else 0, 1),
        "marketing":     round(marketing, 2),
        "fixed_costs":   round(fixed_costs, 2),
        "interest":      round(interest, 2),
        "net_profit":    round(net_profit, 2),
        "net_margin":    round((net_profit / revenue * 100) if revenue > 0 else 0, 1),
    }

    # Daily cash flow for chart
    running = s.get("cash", 0)
    cash_flow_chart = []
    for d in history:
        cash_flow_chart.append({
            "day":    d["day"],
            "cash":   d["cash_after"],
            "profit": d["profit"],
            "revenue":d["revenue"],
        })

    return {
        "balance_sheet": bs,
        "profit_loss":   pl,
        "cash_flow_chart": cash_flow_chart,
        "daily_history": history,
    }


@router.post("/loan/apply")
async def apply_for_loan(
    req: LoanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    row = _get_session(current_user.id, db)
    if not row:
        raise HTTPException(404, "No active session.")
    s = _session_to_dict(row)
    if s["phase"] < 3:
        raise HTTPException(400, "Loans are available in Phase 3 (Enterprise) only.")
    if s["loan_balance"] > 0:
        raise HTTPException(400, f"You already have an outstanding loan of K{s['loan_balance']:,.0f}. Repay it first.")

    LOAN_RATES = {
        "CEEC":   5.0,
        "DBZ":    12.0,
        "ZANACO": 26.0,
        "kaloba": 60.0,
    }
    rate = LOAN_RATES.get(req.provider, 26.0)

    # Record in ledger
    record_transaction(db, s["id"], f"Loan from {req.provider}", [
        {"account": "cash",         "debit":  req.amount, "credit": 0},
        {"account": "loan_payable", "debit":  0,          "credit": req.amount},
    ], s["day"])

    db.execute(text("""
        UPDATE bizsim_sessions SET
            cash=cash+:amt, loan_balance=:bal, loan_interest_rate=:rate, updated_at=:now
        WHERE id=:sid
    """), {
        "amt":  req.amount,
        "bal":  req.amount,
        "rate": rate,
        "now":  datetime.utcnow().isoformat(),
        "sid":  s["id"],
    })
    db.commit()

    return {
        "approved":   True,
        "amount":     req.amount,
        "provider":   req.provider,
        "rate":       rate,
        "daily_cost": round(req.amount * (rate / 100) / 30, 2),
        "message":    f"K{req.amount:,.0f} loan from {req.provider} approved at {rate}% per annum. Daily interest: K{req.amount * (rate/100) / 30:.2f}.",
    }


@router.post("/negotiate")
async def negotiate_with_supplier(
    req: NegotiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    row = _get_session(current_user.id, db)
    if not row:
        raise HTTPException(404, "No active session.")
    s   = _session_to_dict(row)

    # Save player message
    db.execute(text(
        "INSERT INTO bizsim_messages (session_id, sender, content) VALUES (:sid, 'player', :msg)"
    ), {"sid": s["id"], "msg": req.message})

    reply = await ai_supplier_negotiation(s["biz_type"], req.message, s)

    # Save supplier reply
    db.execute(text(
        "INSERT INTO bizsim_messages (session_id, sender, content) VALUES (:sid, 'supplier', :msg)"
    ), {"sid": s["id"], "msg": reply})
    db.commit()

    # Check if negotiation succeeded (simplified: supplier offers a price)
    import re
    price_match = re.search(r'K(\d+)', reply)
    negotiated_cogs = int(price_match.group(1)) if price_match else None

    return {"reply": reply, "negotiated_cogs": negotiated_cogs}


@router.get("/market")
def get_market(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    row = _get_session(current_user.id, db)
    s   = _session_to_dict(row) if row else {}
    return {"market_state": s.get("market_state", {}), "competitors": s.get("competitors", [])}


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    ensure_tables(db)
    rows = db.execute(text("""
        SELECT s.biz_name, s.biz_type, s.total_profit, s.total_revenue,
               s.day, s.phase, s.cash, u.full_name
        FROM bizsim_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status IN ('active','completed')
        ORDER BY s.total_profit DESC
        LIMIT 20
    """)).fetchall()
    return {
        "leaderboard": [
            {
                "rank":         i + 1,
                "business":     r[0],
                "type":         r[1],
                "emoji":        BUSINESS_TYPES.get(r[1], {}).get("emoji", "🏪"),
                "net_profit":   round(r[2], 2),
                "total_revenue":round(r[3], 2),
                "day":          r[4],
                "phase":        r[5],
                "cash":         round(r[6], 2),
                "owner":        r[7],
            }
            for i, r in enumerate(rows)
        ]
    }


@router.get("/missions")
def get_missions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    row = _get_session(current_user.id, db)
    s   = _session_to_dict(row) if row else {}
    completed = s.get("completed_missions", [])
    return {
        "missions": [
            {
                "id":        m["id"],
                "name":      m["name"],
                "icon":      m["icon"],
                "desc":      m["desc"],
                "reward":    m["reward_cash"],
                "colour":    m["colour"],
                "completed": m["id"] in completed,
            }
            for m in MISSIONS
        ]
    }


@router.post("/restart")
def restart_game(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_tables(db)
    db.execute(text(
        "UPDATE bizsim_sessions SET status='abandoned' WHERE user_id=:uid AND status='active'"
    ), {"uid": current_user.id})
    db.commit()
    return {"status": "ok", "message": "Session ended. Start a new game."}
