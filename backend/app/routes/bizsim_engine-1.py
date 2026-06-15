"""
KIP BizSim Engine — Simulation Core
Handles: demand function, double-entry ledger, cash flow,
         solvency checks, competitor simulation, market state.
"""
import random, math, os, json
from datetime import datetime, date
from typing import Optional

import anthropic

# ── Business type definitions ─────────────────────────────────────────────────

BUSINESS_TYPES = {
    "grocery": {
        "name": "Grocery Kiosk",
        "location": "Riverside, Kitwe",
        "emoji": "🛒",
        "colour": "#1D9E75",
        "phase1_capital": 3000,
        "base_customers": 22,
        "cogs_per_unit": 75,
        "optimal_markup": 1.45,
        "price_elasticity": 1.2,
        "marketing_efficiency": 0.6,
        "perishable_rate": 0.05,   # 5% of unsold stock spoils each day
        "phase": 1,
        "teaches": ["Pricing", "Gross Margin", "Inventory Management", "Perishable Goods"],
        "unit": "box of groceries",
        "description": "Sell mealie meal, cooking oil, sugar, and soap to Riverside residents.",
        "unique_mechanic": "Perishables — unsold stock spoils at 5% per day.",
        "fixed_cost_ph2": 150,   # rent + one casual worker
    },
    "poultry": {
        "name": "Poultry Farm",
        "location": "Chongwe District, Lusaka",
        "emoji": "🐔",
        "colour": "#F59E0B",
        "phase1_capital": 5000,
        "base_customers": 12,
        "cogs_per_unit": 120,    # cost to raise one bird to sale
        "optimal_markup": 1.5,
        "price_elasticity": 0.9,
        "marketing_efficiency": 0.4,
        "mortality_rate": 0.03,  # 3% bird mortality per cycle
        "growth_days": 6,        # birds take 6 days to mature
        "phase": 1,
        "teaches": ["Production Cycles", "Mortality Risk", "Demand Forecasting", "B2B Sales"],
        "unit": "mature bird",
        "description": "Raise broiler chickens and sell to restaurants, markets, and households.",
        "unique_mechanic": "Growth cycle — birds take 6 days to mature. Mortality kills 3% of flock.",
        "fixed_cost_ph2": 200,
    },
    "restaurant": {
        "name": "Restaurant",
        "location": "Cairo Road, Lusaka",
        "emoji": "🍲",
        "colour": "#EF4444",
        "phase1_capital": 4000,
        "base_customers": 35,
        "cogs_per_unit": 18,     # cost of ingredients per plate
        "optimal_markup": 2.0,
        "price_elasticity": 1.4,
        "marketing_efficiency": 0.8,
        "waste_rate": 0.12,      # 12% of prepared food goes to waste daily
        "phase": 1,
        "teaches": ["Waste Management", "Staffing Costs", "Customer Experience", "Operating Leverage"],
        "unit": "plate of food",
        "description": "Serve nshima, rice, and relish to workers and shoppers on Cairo Road.",
        "unique_mechanic": "Waste — 12% of daily prep becomes unsold waste. Over-prepare = loss.",
        "fixed_cost_ph2": 350,   # rent + 2 staff
        "can_buy_from": ["poultry"],  # can buy chicken from poultry farms
    },
    "transport": {
        "name": "Transport Business",
        "location": "Kafue Road, Lusaka",
        "emoji": "🚐",
        "colour": "#3B82F6",
        "phase1_capital": 8000,
        "base_customers": 18,
        "cogs_per_unit": 85,     # fuel + variable cost per trip
        "optimal_markup": 1.6,
        "price_elasticity": 0.8,
        "marketing_efficiency": 0.3,
        "breakdown_rate": 0.04,  # 4% chance of breakdown per day
        "fuel_sensitivity": 1.5, # how much fuel price changes hurt revenue
        "phase": 1,
        "teaches": ["Fuel Cost Management", "Asset Maintenance", "Route Optimization", "Variable Costs"],
        "unit": "trip completed",
        "description": "Run a minibus transporting passengers along Kafue Road routes.",
        "unique_mechanic": "Breakdowns — 4% daily chance. Repair costs K500–K2000. No trips = no revenue.",
        "fixed_cost_ph2": 180,
    },
    "phone": {
        "name": "Phone Accessories Shop",
        "location": "Arcades Shopping Centre, Lusaka",
        "emoji": "📱",
        "colour": "#8B5CF6",
        "phase1_capital": 5000,
        "base_customers": 14,
        "cogs_per_unit": 180,
        "optimal_markup": 1.8,
        "price_elasticity": 1.1,
        "marketing_efficiency": 0.9,
        "trend_volatility": 0.15, # demand shifts with phone trends
        "usd_exposure": 0.7,       # 70% of costs affected by USD/ZMW rate
        "phase": 1,
        "teaches": ["Currency Risk", "Trend Sensitivity", "Import Costs", "Retail Margins"],
        "unit": "accessory sold",
        "description": "Sell chargers, cases, earphones, and screen protectors at Arcades.",
        "unique_mechanic": "Currency risk — stock costs fluctuate with USD/ZMW rate.",
        "fixed_cost_ph2": 220,
    },
    "food_stall": {
        "name": "Food Stall",
        "location": "Kamwala Market, Lusaka",
        "emoji": "🥘",
        "colour": "#10B981",
        "phase1_capital": 2000,
        "base_customers": 45,
        "cogs_per_unit": 12,
        "optimal_markup": 1.9,
        "price_elasticity": 1.6,
        "marketing_efficiency": 0.5,
        "weather_sensitivity": 0.3,
        "daily_prep_waste": 0.08,
        "phase": 1,
        "teaches": ["Working Capital", "Daily Cash Flow", "Price Sensitivity", "Volume vs Margin"],
        "unit": "serving sold",
        "description": "Sell affordable nshima and relish to Kamwala market workers and shoppers.",
        "unique_mechanic": "Weather sensitivity — rain drops customers by up to 30%.",
        "fixed_cost_ph2": 80,
    },
}

# ── Chart of accounts (double-entry ledger) ───────────────────────────────────
ACCOUNTS = {
    "cash":           {"type": "asset",     "normal": "debit"},
    "inventory":      {"type": "asset",     "normal": "debit"},
    "equipment":      {"type": "asset",     "normal": "debit"},
    "accounts_rec":   {"type": "asset",     "normal": "debit"},
    "loan_payable":   {"type": "liability", "normal": "credit"},
    "accounts_pay":   {"type": "liability", "normal": "credit"},
    "equity":         {"type": "equity",    "normal": "credit"},
    "revenue":        {"type": "income",    "normal": "credit"},
    "cogs":           {"type": "expense",   "normal": "debit"},
    "marketing":      {"type": "expense",   "normal": "debit"},
    "rent":           {"type": "expense",   "normal": "debit"},
    "wages":          {"type": "expense",   "normal": "debit"},
    "interest":       {"type": "expense",   "normal": "debit"},
    "misc_expense":   {"type": "expense",   "normal": "debit"},
}


# ── Demand function ───────────────────────────────────────────────────────────

def calculate_demand(
    biz_type: str,
    price: float,
    marketing_spend: float,
    market_state: dict,
    competitors: list,
    phase: int,
    day: int,
) -> dict:
    """
    Returns demand and contributing factors.
    demand = base × price_factor × marketing_factor × market_factor × competitor_factor × volatility
    """
    b   = BUSINESS_TYPES[biz_type]
    cogs = b["cogs_per_unit"]
    optimal_price = cogs * b["optimal_markup"]

    # ── Price factor (demand curve) ───────────────────────────────────────────
    price_ratio = price / optimal_price
    if price_ratio <= 0.9:
        price_factor = 1.6 - (price_ratio * 0.1)  # very cheap → volume surge
    elif price_ratio <= 1.0:
        price_factor = 1.2
    elif price_ratio <= 1.2:
        price_factor = 1.0 - (price_ratio - 1.0) * 1.5
    elif price_ratio <= 1.6:
        price_factor = 0.7 - (price_ratio - 1.2) * 0.8
    elif price_ratio <= 2.0:
        price_factor = 0.3 - (price_ratio - 1.6) * 0.5
    else:
        price_factor = max(0.05, 0.1 - (price_ratio - 2.0) * 0.05)

    # ── Marketing factor (diminishing returns) ────────────────────────────────
    mkt_eff    = b["marketing_efficiency"]
    mkt_factor = 1.0 + mkt_eff * math.log1p(marketing_spend / 100)

    # ── Market conditions ─────────────────────────────────────────────────────
    demand_idx   = market_state.get("demand_index", 1.0)
    weather      = market_state.get("weather_factor", 1.0)
    payday_boost = 1.3 if day % 15 == 0 else 1.0
    market_factor = demand_idx * weather * payday_boost

    # ── Competitor factor ─────────────────────────────────────────────────────
    if competitors:
        avg_comp_price = sum(c.get("price", optimal_price) for c in competitors) / len(competitors)
        if avg_comp_price > 0 and price > 0:
            comp_ratio = price / avg_comp_price
            if comp_ratio < 0.9:
                competitor_factor = 1.2    # undercut competitors
            elif comp_ratio < 1.1:
                competitor_factor = 1.0    # roughly equal
            elif comp_ratio < 1.4:
                competitor_factor = 0.8    # somewhat more expensive
            else:
                competitor_factor = 0.55   # significantly overpriced vs competitors
        else:
            competitor_factor = 1.0
    else:
        competitor_factor = 1.0

    # ── Business-specific modifiers ───────────────────────────────────────────
    special_factor = 1.0
    if biz_type == "transport":
        fuel_price = market_state.get("fuel_price", 1.0)
        special_factor = max(0.5, 1.0 - (fuel_price - 1.0) * b["fuel_sensitivity"] * 0.2)
    elif biz_type == "phone":
        usd_rate = market_state.get("usd_zmw_rate", 1.0)
        special_factor = max(0.7, 1.0 - (usd_rate - 1.0) * b["usd_exposure"] * 0.15)
    elif biz_type == "food_stall":
        special_factor *= (1.0 - b["weather_sensitivity"] * (1.0 - weather))

    # ── Raw demand + volatility ───────────────────────────────────────────────
    base     = b["base_customers"]
    vol      = market_state.get("volatility", 0.12)
    raw      = base * price_factor * mkt_factor * market_factor * competitor_factor * special_factor
    noise    = random.gauss(0, vol * raw)
    demand   = max(0, int(raw + noise))

    return {
        "demand":            demand,
        "price_factor":      round(price_factor, 3),
        "marketing_factor":  round(mkt_factor, 3),
        "market_factor":     round(market_factor, 3),
        "competitor_factor": round(competitor_factor, 3),
        "special_factor":    round(special_factor, 3),
        "optimal_price":     round(optimal_price, 2),
        "raw_demand":        round(raw, 1),
    }


# ── Unique business mechanics ─────────────────────────────────────────────────

def apply_unique_mechanics(biz_type: str, session: dict, stock_on_hand: int, units_sold: int, market_state: dict) -> dict:
    """Apply business-specific mechanics after the day's sales. Returns adjustments."""
    adjustments = {"cash_delta": 0, "stock_delta": 0, "event": None}
    b = BUSINESS_TYPES[biz_type]

    if biz_type == "grocery":
        # Perishable spoilage on UNSOLD stock
        spoiled = int(max(0, stock_on_hand - units_sold) * b["perishable_rate"])
        if spoiled > 0:
            loss = spoiled * b["cogs_per_unit"]
            adjustments["stock_delta"]  = -spoiled
            adjustments["cash_delta"]   = 0   # already paid for
            adjustments["event"] = {"type": "spoilage", "icon": "🗑️",
                "label": f"{spoiled} units spoiled", "impact": f"-K{loss} inventory loss"}

    elif biz_type == "poultry":
        # Mortality on live flock
        flock = session.get("flock_size", 0)
        if flock > 0:
            dead = max(0, int(flock * b["mortality_rate"] * random.uniform(0.5, 2.0)))
            if dead > 0:
                adjustments["stock_delta"] = -dead
                adjustments["event"] = {"type": "mortality", "icon": "💀",
                    "label": f"{dead} birds died today",
                    "impact": f"K{dead * b['cogs_per_unit']} flock loss"}

    elif biz_type == "transport":
        # Random breakdown
        if random.random() < b["breakdown_rate"]:
            repair = random.randint(500, 2000)
            adjustments["cash_delta"] = -repair
            adjustments["event"] = {"type": "breakdown", "icon": "🔧",
                "label": "Vehicle breakdown!",
                "impact": f"-K{repair} repair cost. No trips today." }
            adjustments["revenue_override"] = 0   # no revenue on breakdown day

    elif biz_type == "phone":
        # USD/ZMW movement affects restock cost next buy
        rate_change = random.gauss(0, 0.05)
        new_rate = max(0.8, market_state.get("usd_zmw_rate", 1.0) + rate_change)
        adjustments["usd_rate_update"] = round(new_rate, 3)

    return adjustments


# ── Double-entry ledger ───────────────────────────────────────────────────────

def record_transaction(db, session_id: int, description: str, entries: list, day: int):
    """
    Record a double-entry transaction.
    entries = [{"account": "cash", "debit": 1000, "credit": 0}, ...]
    """
    total_debits  = sum(e.get("debit",  0) for e in entries)
    total_credits = sum(e.get("credit", 0) for e in entries)
    if abs(total_debits - total_credits) > 0.01:
        raise ValueError(f"Ledger imbalance! Debits={total_debits} Credits={total_credits}")

    from sqlalchemy import text
    for entry in entries:
        db.execute(text("""
            INSERT INTO bizsim_ledger
              (session_id, day, description, account, debit, credit, created_at)
            VALUES (:sid, :day, :desc, :acc, :dr, :cr, :ts)
        """), {
            "sid":  session_id,
            "day":  day,
            "desc": description,
            "acc":  entry["account"],
            "dr":   entry.get("debit",  0.0),
            "cr":   entry.get("credit", 0.0),
            "ts":   datetime.utcnow().isoformat(),
        })
    db.commit()


def get_balance_sheet(db, session_id: int) -> dict:
    """Compute balance sheet from the ledger."""
    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT account, SUM(debit) as dr, SUM(credit) as cr
        FROM bizsim_ledger WHERE session_id = :sid
        GROUP BY account
    """), {"sid": session_id}).fetchall()

    balances = {}
    for row in rows:
        acc  = row[0]
        dr   = row[1] or 0
        cr   = row[2] or 0
        info = ACCOUNTS.get(acc, {"normal": "debit"})
        if info["normal"] == "debit":
            balances[acc] = dr - cr
        else:
            balances[acc] = cr - dr

    assets = sum(v for k, v in balances.items()
                 if ACCOUNTS.get(k, {}).get("type") == "asset")
    liabilities = sum(v for k, v in balances.items()
                      if ACCOUNTS.get(k, {}).get("type") == "liability")
    equity = sum(v for k, v in balances.items()
                 if ACCOUNTS.get(k, {}).get("type") in ("equity", "income", "expense"))
    return {
        "balances":    balances,
        "total_assets": round(assets, 2),
        "total_liabilities": round(liabilities, 2),
        "total_equity": round(equity, 2),
        "balanced":     abs(assets - (liabilities + equity)) < 1.0,
    }


# ── Market state ──────────────────────────────────────────────────────────────

MACRO_EVENTS = [
    {"day": 4,  "id": "load_shed",   "label": "Load shedding",         "icon": "⚡", "desc": "8 hours of outages today. Foot traffic drops significantly.", "demand_index": 0.65},
    {"day": 7,  "id": "payday",      "label": "Month-end payday",       "icon": "💸", "desc": "Salaried workers just got paid. Spending is up across the board.", "demand_index": 1.55},
    {"day": 10, "id": "rain",        "label": "Heavy rainfall",          "icon": "🌧️", "desc": "Torrential rain keeps shoppers home.", "demand_index": 0.7, "weather_factor": 0.7},
    {"day": 12, "id": "copper_up",   "label": "Copper price surge",     "icon": "⛏️", "desc": "Record copper prices boost Copperbelt incomes.", "demand_index": 1.35},
    {"day": 15, "id": "inflation",   "label": "Inflation spike",         "icon": "📈", "desc": "ZRA reports 2.3% monthly inflation. Your COGS rises 8%.", "cogs_mult": 1.08},
    {"day": 18, "id": "fuel_up",     "label": "Fuel price increase",    "icon": "⛽", "desc": "ZESCO fuel price rises K2/litre. Transport costs up.", "fuel_price": 1.25},
    {"day": 20, "id": "competitor",  "label": "New competitor",          "icon": "🏪", "desc": "A new business opened 200m from yours.", "competitor_add": True},
    {"day": 22, "id": "cdf",         "label": "CDF disbursement",       "icon": "🏛️", "desc": "CDF funds released to your constituency. K500 grant available.", "grant": 500},
    {"day": 25, "id": "drought",     "label": "Drought warning",         "icon": "☀️", "desc": "Agriculture ministry warns of drought. Food prices rising.", "demand_index": 0.85, "cogs_mult": 1.12},
    {"day": 28, "id": "festive",     "label": "Festive season begins",  "icon": "🎉", "desc": "Christmas/New Year shopping surge.", "demand_index": 1.6},
    {"day": 30, "id": "usd_spike",   "label": "USD/ZMW rate jump",      "icon": "💱", "desc": "Kwacha weakens. Imported goods cost 12% more.", "usd_zmw_rate": 1.12},
]


def get_market_state(day: int, current_state: dict) -> dict:
    state = dict(current_state)
    state.setdefault("demand_index", 1.0)
    state.setdefault("weather_factor", 1.0)
    state.setdefault("fuel_price", 1.0)
    state.setdefault("usd_zmw_rate", 1.0)
    state.setdefault("volatility", 0.12)
    state.setdefault("cogs_mult", 1.0)

    # Check for today's event
    event = next((e for e in MACRO_EVENTS if e["day"] == day), None)
    if event:
        for key in ["demand_index", "weather_factor", "fuel_price", "usd_zmw_rate", "cogs_mult"]:
            if key in event:
                state[key] = event[key]

    # Drift back toward normal after events
    for k, default in [("demand_index", 1.0), ("weather_factor", 1.0)]:
        state[k] = state[k] * 0.85 + default * 0.15

    return state, event


# ── AI Competitor simulation ──────────────────────────────────────────────────

def simulate_competitor_day(competitor: dict, market_state: dict, player_price: float) -> dict:
    """Simulate one day for an AI competitor. They react to player's price."""
    personality = competitor.get("personality", "balanced")
    biz_type    = competitor.get("biz_type", "grocery")
    b           = BUSINESS_TYPES.get(biz_type, BUSINESS_TYPES["grocery"])
    cogs        = b["cogs_per_unit"] * market_state.get("cogs_mult", 1.0)
    optimal     = cogs * b["optimal_markup"]

    # Personality-driven pricing
    if personality == "aggressive":
        # Always tries to undercut player by 5-10%
        target = player_price * random.uniform(0.88, 0.95)
    elif personality == "premium":
        # Maintains premium positioning
        target = optimal * random.uniform(1.3, 1.6)
    elif personality == "follower":
        # Follows player price with a lag
        target = player_price * random.uniform(0.98, 1.05)
    else:  # balanced
        target = optimal * random.uniform(0.95, 1.15)

    comp_price = max(cogs * 1.05, target)

    # Competitor demand (simplified)
    comp_demand = max(0, int(b["base_customers"] * 0.6 * random.gauss(1.0, 0.15)))

    return {
        **competitor,
        "price":    round(comp_price, 2),
        "revenue":  round(comp_demand * comp_price, 2),
        "customers": comp_demand,
    }


# ── Phase unlock logic ────────────────────────────────────────────────────────

def check_phase_unlock(session: dict, history: list) -> Optional[int]:
    """Check if the player has met conditions to unlock next phase."""
    current_phase = session.get("phase", 1)
    if current_phase >= 3:
        return None

    if current_phase == 1:
        # Need: 3 consecutive profitable days AND cash > starting capital
        if len(history) >= 5:
            last5   = history[-5:]
            profits = [d["profit"] for d in last5]
            consec  = sum(1 for p in profits[-3:] if p > 0)
            net_worth = session.get("cash", 0) + session.get("inventory_value", 0)
            start_cap = BUSINESS_TYPES[session["biz_type"]]["phase1_capital"]
            if consec >= 3 and net_worth > start_cap * 1.2:
                return 2

    elif current_phase == 2:
        # Need: Total revenue > 3× starting capital AND profitable for 5 of last 7 days
        start_cap   = BUSINESS_TYPES[session["biz_type"]]["phase1_capital"]
        total_rev   = sum(d["revenue"] for d in history)
        if len(history) >= 7:
            last7       = history[-7:]
            profit_days = sum(1 for d in last7 if d["profit"] > 0)
            if total_rev > start_cap * 3 and profit_days >= 5:
                return 3

    return None


# ── Mission definitions ───────────────────────────────────────────────────────

MISSIONS = [
    {
        "id": "first_profit", "name": "First Profit", "icon": "💰",
        "desc": "Make a profit on any single day.",
        "check": lambda h, s: any(d["profit"] > 0 for d in h),
        "reward_cash": 200,
        "colour": "#10B981",
    },
    {
        "id": "double_capital", "name": "Double Your Capital", "icon": "📈",
        "desc": "Grow your cash to 2× your starting capital.",
        "check": lambda h, s: s.get("cash", 0) >= BUSINESS_TYPES.get(s.get("biz_type","grocery"), {}).get("phase1_capital", 3000) * 2,
        "reward_cash": 500,
        "colour": "#3B82F6",
    },
    {
        "id": "hundred_customers", "name": "100 Customers", "icon": "👥",
        "desc": "Serve 100 cumulative customers.",
        "check": lambda h, s: sum(d.get("customers", 0) for d in h) >= 100,
        "reward_cash": 300,
        "colour": "#8B5CF6",
    },
    {
        "id": "streak_5", "name": "5-Day Streak", "icon": "🔥",
        "desc": "Be profitable 5 days in a row.",
        "check": lambda h, s: len(h) >= 5 and all(d["profit"] > 0 for d in h[-5:]),
        "reward_cash": 400,
        "colour": "#EF4444",
    },
    {
        "id": "survive_shock", "name": "Shock Survivor", "icon": "💪",
        "desc": "Stay solvent through a major market event (load shedding, inflation, etc.)",
        "check": lambda h, s: any(d.get("event") and d["profit"] >= 0 for d in h),
        "reward_cash": 600,
        "colour": "#F59E0B",
    },
]


def check_missions(history: list, session: dict, completed: list) -> list:
    """Returns list of newly completed mission IDs."""
    newly_done = []
    for m in MISSIONS:
        if m["id"] not in completed:
            try:
                if m["check"](history, session):
                    newly_done.append(m["id"])
            except Exception:
                pass
    return newly_done


# ── AI coaching (Claude) ──────────────────────────────────────────────────────

async def generate_ai_coaching(biz_type: str, week_num: int, week_history: list,
                                balance_sheet: dict, phase: int) -> str:
    """Generate personalised coaching from Claude after each week."""
    b = BUSINESS_TYPES[biz_type]
    revenue  = sum(d["revenue"] for d in week_history)
    profit   = sum(d["profit"] for d in week_history)
    cust     = sum(d.get("customers", 0) for d in week_history)
    avg_px   = sum(d.get("price", 0) for d in week_history) / max(len(week_history), 1)
    cash     = balance_sheet["balances"].get("cash", 0)
    margin   = (profit / revenue * 100) if revenue > 0 else 0

    prompt = f"""You are KIP, Zambia's AI business coach. A player just completed Week {week_num} running a virtual {b['name']} in {b['location']} (Phase {phase}).

Week {week_num} Performance:
- Revenue: K{revenue:,.0f}
- Net profit: K{profit:,.0f} ({'loss' if profit < 0 else 'profit'})
- Gross margin: {margin:.1f}%
- Customers served: {cust}
- Average selling price: K{avg_px:.0f} (COGS: K{b['cogs_per_unit']})
- Current cash position: K{cash:,.0f}

Write a coaching message in 2 paragraphs. Be direct, warm, and specific.
Paragraph 1: Diagnose their biggest issue or celebrate their win. Use the actual numbers.
Paragraph 2: Give ONE specific, actionable instruction for next week. Reference Zambian business reality.
Max 130 words. Use ZMW. No greeting or sign-off."""

    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        resp   = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.content[0].text
    except Exception as e:
        return (f"Week {week_num} complete. {'Strong profit margin' if margin > 20 else 'Watch your margins'} — "
                f"you earned K{revenue:,.0f} with {cust} customers. "
                f"Focus on pricing discipline next week: your COGS is K{b['cogs_per_unit']}, "
                f"so aim for at least K{b['cogs_per_unit'] * 1.4:.0f} per unit to stay healthy.")


async def generate_market_event(biz_type: str, session_data: dict, day: int) -> dict:
    """Use Claude to generate a contextual market event based on current performance."""
    b       = BUSINESS_TYPES[biz_type]
    cash    = session_data.get("cash", 0)
    revenue = session_data.get("total_revenue", 0)
    phase   = session_data.get("phase", 1)

    prompt = f"""You are the KIP BizSim market engine for Zambia. Generate a brief, realistic Zambian market event for Day {day}.

Business: {b['name']} in {b['location']}, Phase {phase}
Player cash: K{cash:,.0f}, Total revenue so far: K{revenue:,.0f}

Return ONLY a JSON object (no other text):
{{
  "icon": "<single emoji>",
  "label": "<short event title, max 4 words>",
  "desc": "<one sentence description, Zambia-specific>",
  "demand_impact": <float between 0.5 and 1.8, where 1.0 = no change>,
  "cogs_impact": <float between 0.9 and 1.3, where 1.0 = no change>,
  "cash_bonus": <integer, 0 if no bonus, up to 500 for grants>
}}"""

    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        resp   = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        text   = resp.content[0].text.strip()
        start  = text.find("{")
        end    = text.rfind("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return None


async def ai_supplier_negotiation(biz_type: str, player_offer: str, context: dict) -> str:
    """Simulate a supplier negotiation conversation."""
    b = BUSINESS_TYPES[biz_type]
    prompt = f"""You are a Zambian supplier of {b['unit']}s. The player is negotiating with you.

Current context:
- Your standard price: K{b['cogs_per_unit']} per {b['unit']}
- Player's cash: K{context.get('cash', 0):,.0f}
- Player's message: "{player_offer}"

Respond as a real Zambian supplier would — firm but fair. You can offer small discounts (max 10%) for bulk orders (20+ units) or loyal customers. Reference real Zambian suppliers or market reality. Keep it under 60 words. End with a counter-offer or acceptance."""

    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        resp   = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=120,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.content[0].text
    except Exception:
        return f"My brother, K{b['cogs_per_unit']} is already my best price. For 20+ units I can do K{int(b['cogs_per_unit'] * 0.93)}. Take it or leave it."
