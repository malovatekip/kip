"""
KIP BizSim Engine — Simulation Core
Handles: demand function, double-entry ledger, cash flow,
         solvency checks, competitor simulation, market state.
"""
import random, math, os, json
from datetime import datetime, date
from typing import Optional

import anthropic

from app.routes.language_support import language_instruction

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

# ── Business stories, debt, and named rivals ──────────────────────────────────

BUSINESS_STORIES = {
    "grocery": {
        "story_id": "grocery",
        "narrative": (
            "Your grandmother Mama Bupe ran this market stall for 30 years. "
            "When she passed last month, she left it to you — but also left "
            "a K8,000 debt to Mr. Kamau, the local Kaloba lender. He gives "
            "you 30 days to pay it back, or he takes the stall. You have "
            "K3,000. The stall opens tomorrow."
        ),
        "debt_lender": "Mr. Kamau (Kaloba lender)",
        "debt_original": 8000, "debt_rate": 60.0, "debt_due_day": 30,
        "debt_type": "compounding_loan",
        "debt_schedule": [
            {"day": 30, "label": "Full Kaloba repayment to Mr. Kamau", "amount": 8000},
        ],
        "rival_name": "Mulenga", "rival_personality": "aggressive",
        "rival_intro_dialogue": (
            "Ah, Mama Bupe's grandchild! Welcome. Don't worry, I'll take "
            "care of your customers when you close down. It won't be long."
        ),
    },
    "poultry": {
        "story_id": "poultry",
        "narrative": (
            "Your uncle Cosmas ran this broiler farm for 15 years before "
            "drought killed half his flock. He borrowed K15,000 from DBZ to "
            "restock. The farm is yours now — so is the loan. DBZ charges "
            "12% p.a. You have 30 days before the first repayment is due. "
            "The farm has 50 birds today. Make them count."
        ),
        "debt_lender": "DBZ (Development Bank of Zambia)",
        "debt_original": 15000, "debt_rate": 12.0, "debt_due_day": 30,
        "debt_type": "installment_loan",
        "debt_schedule": [
            {"day": 15, "label": "First DBZ repayment due"},
            {"day": 30, "label": "Final DBZ repayment due"},
        ],
        "rival_name": "Blessings Farm", "rival_personality": "aggressive",
        "rival_intro_dialogue": (
            "New farm, eh? Fridays are undercut days around here. Good luck."
        ),
    },
    "restaurant": {
        "story_id": "restaurant",
        "narrative": (
            "You quit your government job to open this restaurant with "
            "your cousin Priscilla. She contributed K10,000 in savings — "
            "your share was supposed to be K10,000 too, but you only had "
            "K4,000. Priscilla agreed to wait for her share of the profit. "
            "If you can't show her K6,000 in profit within 30 days, she's "
            "pulling out and taking her K10,000 back. The restaurant opens "
            "Monday."
        ),
        "debt_lender": "Priscilla (business partner)",
        "debt_original": 6000, "debt_rate": 0.0, "debt_due_day": 30,
        "debt_type": "profit_target",
        "debt_schedule": [
            {"day": 30, "label": "K6,000 cumulative profit owed to Priscilla"},
        ],
        "rival_name": "Chef Mulilo's Kitchen", "rival_personality": "aggressive",
        "rival_intro_dialogue": (
            "Heard you and Priscilla opened up. Cute. My menu's cheaper and faster."
        ),
    },
    "transport": {
        "story_id": "transport",
        "narrative": (
            "You bought a secondhand minibus with K20,000 from a "
            "microfinance company (Bayport). Monthly repayments are "
            "K2,400. Day 15 and Day 30 are repayment days. If you miss a "
            "payment, Bayport sends someone to repossess the bus. You have "
            "K8,000 for fuel and operations. The route starts today."
        ),
        "debt_lender": "Bayport Microfinance",
        "debt_original": 4800, "debt_rate": 0.0, "debt_due_day": 30,
        "debt_type": "installment_loan",
        "debt_schedule": [
            {"day": 15, "label": "Bayport repayment due", "amount": 2400},
            {"day": 30, "label": "Bayport repayment due", "amount": 2400},
        ],
        "rival_name": "Freddy's Express", "rival_personality": "consistent",
        "rival_intro_dialogue": (
            "New bus on the route? Mine's newer and I charge less. We'll see."
        ),
    },
    "phone": {
        "story_id": "phone",
        "narrative": (
            "Your older brother Kelvin flew to Dubai and shipped you "
            "K30,000 worth of phone accessories on credit. He trusted you. "
            "He needs the K30,000 back in 30 days — he has a mortgage "
            "payment in Dubai that depends on it. Exchange rate today: "
            "K27.50/USD. Every time it moves, your restock costs change. "
            "Your brother is watching your progress."
        ),
        "debt_lender": "Kelvin (brother, Dubai inventory credit)",
        "debt_original": 30000, "debt_rate": 0.0, "debt_due_day": 30,
        "debt_type": "inventory_credit",
        "debt_schedule": [
            {"day": 30, "label": "K30,000 owed back to Kelvin", "amount": 30000},
        ],
        "rival_name": "iTech Accessories", "rival_personality": "premium",
        "rival_intro_dialogue": (
            "Nice little setup. My display looks better though. Good luck competing."
        ),
    },
    "food_stall": {
        "story_id": "food_stall",
        "narrative": (
            "You are the sole provider for your mother, two younger "
            "sisters, and your sister's baby. K800 goes to rent and school "
            "fees every 15 days — non-negotiable. Miss it and the landlord "
            "kicks you all out. You have K2,000. The stall is borrowed "
            "from Mrs. Phiri next door. She charges K100/day to use it. If "
            "you can save K5,000 in 30 days, you can sign your own lease "
            "and stop paying Mrs. Phiri."
        ),
        "debt_lender": "Mrs. Phiri (rent + stall fee)",
        "debt_original": 1600, "debt_rate": 0.0, "debt_due_day": 30,
        "debt_type": "rent_recurring",
        "debt_schedule": [
            {"day": 15, "label": "Rent + fees due", "amount": 800},
            {"day": 30, "label": "Rent + fees due", "amount": 800},
        ],
        "rival_name": "Mama Janet's Kitchen", "rival_personality": "premium",
        "rival_intro_dialogue": (
            "Sweetie, everyone trusts my kitchen. You'll need more than a "
            "smile to compete."
        ),
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
    elif personality in ("follower", "reactive"):
        # Follows/mirrors player price with a lag
        target = player_price * random.uniform(0.98, 1.05)
    else:  # balanced / consistent
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


# ── Event card system ─────────────────────────────────────────────────────────
# Server-authoritative: consequences live here, never trusted from the client.
# Choice fields: cash_delta (applied immediately at /event/choose), reputation_delta
# and family_reputation_delta (immediate, clamped 0-100), demand_mult (deferred —
# folded into the day's demand multiplier by run_day), skip_day (deferred — forces
# units_sold=0 for the day).

EVENT_DEFINITIONS = [
    # ── ZAMBIAN REALITY ────────────────────────────────────────────────────────
    {
        "id": "load_shedding", "category": "zambian_reality", "title": "Load Shedding!",
        "flavour": "ZESCO just switched off your area. 8 hours of darkness.",
        "choices": [
            {"id": "A", "label": "Buy generator fuel (K150)", "cash_delta": -150, "demand_mult": 0.9},
            {"id": "B", "label": "Wait it out", "demand_mult": 0.6},
            {"id": "C", "label": "Close early", "skip_day": True},
        ],
    },
    {
        "id": "water_cuts", "category": "zambian_reality", "title": "Water Cuts",
        "flavour": "No water for 4 hours. Your business cannot operate normally.",
        "choices": [
            {"id": "A", "label": "Buy bottled water (K80)", "cash_delta": -80, "demand_mult": 0.85},
            {"id": "B", "label": "Partner with the next stall for shared supply", "cash_delta": -60},
            {"id": "C", "label": "Close for the day", "skip_day": True},
        ],
    },
    {
        "id": "fuel_price_hike", "category": "zambian_reality", "title": "Fuel Price Hike",
        "flavour": "Your supplier's delivery costs just rose. Restocking will cost more for the next few days.",
        "choices": [
            {"id": "A", "label": "Stock up now before prices rise further (K100)", "cash_delta": -100},
            {"id": "B", "label": "Wait and see", "cash_delta": -150},
        ],
    },
    {
        "id": "pothole_season", "category": "zambian_reality", "title": "Pothole Season",
        "flavour": "The road to your stall is full of potholes after the rains. Deliveries are getting damaged and delayed.",
        "choices": [
            {"id": "A", "label": "Pay K150 for a repair/detour kit", "cash_delta": -150},
            {"id": "B", "label": "Risk it and carry on", "demand_mult": 0.85},
        ],
    },
    {
        "id": "market_council_fee", "category": "zambian_reality", "title": "Market Council Renovation Fee",
        "flavour": "The Market Council says stalls must pay a renovation fee this week or lose their spot.",
        "choices": [
            {"id": "A", "label": "Pay K250 now", "cash_delta": -250, "reputation_delta": 5},
            {"id": "B", "label": "Delay payment", "reputation_delta": -10},
        ],
    },
    {
        "id": "mobile_money_outage", "category": "zambian_reality", "title": "Mobile Money Network Outage",
        "flavour": "MTN and Airtel mobile money are down across Lusaka. Customers can't pay you the way they're used to.",
        "choices": [
            {"id": "A", "label": "Cash-only today", "demand_mult": 0.8},
            {"id": "B", "label": "Offer informal IOUs", "cash_delta": -50},
        ],
    },

    # ── SOCIAL / FAMILY ────────────────────────────────────────────────────────
    {
        "id": "cousins_wedding", "category": "social_family", "title": "The Cousin's Wedding",
        "flavour": "Your cousin Chanda is getting married in Ndola on Saturday. The family expects K500 from you.",
        "choices": [
            {"id": "A", "label": "Pay K500", "cash_delta": -500, "family_reputation_delta": 15},
            {"id": "B", "label": "Send K200", "cash_delta": -200, "family_reputation_delta": 5},
            {"id": "C", "label": "Refuse", "family_reputation_delta": -20},
        ],
    },
    {
        "id": "uncles_request", "category": "social_family", "title": "The Uncle's Request",
        "flavour": "Uncle Sata needs K300 to fix his taxi. He says he'll repay you in two weeks. He hasn't repaid anything since 2019.",
        "choices": [
            {"id": "A", "label": "Give K300", "cash_delta": -300, "family_reputation_delta": 10},
            {"id": "B", "label": "Give K100", "cash_delta": -100, "family_reputation_delta": 4},
            {"id": "C", "label": "Refuse", "family_reputation_delta": -10},
        ],
    },
    {
        "id": "school_fees_season", "category": "social_family", "title": "School Fees Season",
        "flavour": "Your younger sister's school fees are due. K450. Mum is asking.",
        "choices": [
            {"id": "A", "label": "Pay K450", "cash_delta": -450, "family_reputation_delta": 20},
            {"id": "B", "label": "Negotiate for next week", "family_reputation_delta": 0},
            {"id": "C", "label": "Refuse", "family_reputation_delta": -30},
        ],
    },
    {
        "id": "church_harambee", "category": "social_family", "title": "Church Harambee Appeal",
        "flavour": "Your church is raising funds for a new roof. The pastor calls your name out during the announcement.",
        "choices": [
            {"id": "A", "label": "Give K200", "cash_delta": -200, "family_reputation_delta": 10},
            {"id": "B", "label": "Give K50", "cash_delta": -50, "family_reputation_delta": 3},
            {"id": "C", "label": "Decline", "family_reputation_delta": -12},
        ],
    },
    {
        "id": "sisters_graduation", "category": "social_family", "title": "Sister's Graduation",
        "flavour": "Your sister is graduating from college. The family is planning a celebration and expects your contribution.",
        "choices": [
            {"id": "A", "label": "Give K350", "cash_delta": -350, "family_reputation_delta": 18},
            {"id": "B", "label": "Give K150", "cash_delta": -150, "family_reputation_delta": 6},
            {"id": "C", "label": "Skip it", "family_reputation_delta": -15},
        ],
    },
    {
        "id": "neighbours_funeral", "category": "social_family", "title": "Neighbour's Funeral Contribution",
        "flavour": "A neighbour has passed away. Tradition expects a contribution and your presence at the funeral house.",
        "choices": [
            {"id": "A", "label": "Give K200 and attend", "cash_delta": -200, "family_reputation_delta": 12, "demand_mult": 0.9},
            {"id": "B", "label": "Give K50, send apologies", "cash_delta": -50, "family_reputation_delta": 4},
            {"id": "C", "label": "Don't attend", "family_reputation_delta": -20},
        ],
    },

    # ── MARKET SHOCKS ──────────────────────────────────────────────────────────
    {
        "id": "cheap_knockoffs", "category": "market_shocks", "title": "Cheap Knockoffs",
        "flavour": "A new vendor is selling fake versions of your product at 40% less.",
        "choices": [
            {"id": "A", "label": "Slash prices to match", "cash_delta": -100, "demand_mult": 1.15},
            {"id": "B", "label": "Market your authenticity (K100)", "cash_delta": -100},
            {"id": "C", "label": "Ignore it", "demand_mult": 0.85},
        ],
    },
    {
        "id": "viral_moment", "category": "market_shocks", "title": "Viral Moment",
        "flavour": "Someone posted a video of your stall online and it's getting views.",
        "choices": [
            {"id": "A", "label": "Capitalise — buy extra supplies (K50)", "cash_delta": -50, "demand_mult": 1.4},
            {"id": "B", "label": "Do nothing", "demand_mult": 1.2},
        ],
    },
    {
        "id": "supplier_strike", "category": "market_shocks", "title": "Supplier Strike",
        "flavour": "Your main supplier's workers are striking. No delivery today.",
        "choices": [
            {"id": "A", "label": "Buy from an emergency supplier", "cash_delta": -80},
            {"id": "B", "label": "Sell out of existing stock"},
            {"id": "C", "label": "Close for the day", "skip_day": True},
        ],
    },
    {
        "id": "rival_poaches_customer", "category": "market_shocks", "title": "Rival Poaches Your Best Customer",
        "flavour": "Your rival is offering steep discounts to lure away one of your best regular customers.",
        "choices": [
            {"id": "A", "label": "Offer a K80 loyalty discount", "cash_delta": -80},
            {"id": "B", "label": "Let them go", "demand_mult": 0.95},
        ],
    },
    {
        "id": "bulk_wholesaler", "category": "market_shocks", "title": "Bulk Wholesaler Enters the Market",
        "flavour": "A bulk wholesaler has set up nearby, selling at prices you can't match.",
        "choices": [
            {"id": "A", "label": "Match their price", "cash_delta": -100},
            {"id": "B", "label": "Market to differentiate (K100)", "cash_delta": -100},
            {"id": "C", "label": "Ignore it", "demand_mult": 0.9},
        ],
    },
    {
        "id": "counterfeit_currency", "category": "market_shocks", "title": "Counterfeit Currency Scare",
        "flavour": "Word is going around that fake K100 notes are circulating in the market.",
        "choices": [
            {"id": "A", "label": "Check every note carefully", "demand_mult": 0.9},
            {"id": "B", "label": "Mobile-money only today", "demand_mult": 0.85},
            {"id": "C", "label": "Ignore it", "cash_delta": -60},
        ],
    },

    # ── OPPORTUNITY ────────────────────────────────────────────────────────────
    {
        "id": "cdf_disbursement", "category": "opportunity", "title": "CDF Disbursement",
        "flavour": "Your MP announced CDF funds for small businesses. You qualify.",
        "choices": [
            {"id": "A", "label": "Apply now (spend the morning on paperwork)", "cash_delta": 500, "demand_mult": 0.8},
            {"id": "B", "label": "Skip the paperwork", "cash_delta": 0},
        ],
    },
    {
        "id": "bulk_order_inquiry", "category": "opportunity", "title": "Bulk Order Inquiry",
        "flavour": "A caterer wants to buy a large batch upfront for a weekend wedding.",
        "choices": [
            {"id": "A", "label": "Accept at standard price", "cash_delta": 300},
            {"id": "B", "label": "Negotiate for a premium", "cash_delta": 350},
            {"id": "C", "label": "Decline", "cash_delta": 0},
        ],
    },
    {
        "id": "payday_weekend", "category": "opportunity", "title": "Payday Weekend",
        "flavour": "Government workers just got paid. Spending is up across town this weekend.",
        "choices": [
            {"id": "A", "label": "Prepare extra stock (K100)", "cash_delta": -100, "demand_mult": 1.6},
            {"id": "B", "label": "Business as usual", "demand_mult": 1.5},
        ],
    },
    {
        "id": "radio_interview", "category": "opportunity", "title": "Radio Interview Invite",
        "flavour": "A local radio station wants to interview you about your business for their morning show.",
        "choices": [
            {"id": "A", "label": "Accept the interview", "demand_mult": 0.9, "reputation_delta": 15},
            {"id": "B", "label": "Decline", "cash_delta": 0},
        ],
    },
    {
        "id": "corporate_bulk_contract", "category": "opportunity", "title": "Corporate Bulk Contract Inquiry",
        "flavour": "A corporate office wants a standing weekly order from your business.",
        "choices": [
            {"id": "A", "label": "Accept the contract", "cash_delta": 250},
            {"id": "B", "label": "Negotiate better terms", "cash_delta": 150},
            {"id": "C", "label": "Decline", "cash_delta": 0},
        ],
    },
    {
        "id": "youth_empowerment_grant", "category": "opportunity", "title": "Youth Empowerment Fund Grant",
        "flavour": "The Ministry of Youth is giving out small business grants today. You could qualify.",
        "choices": [
            {"id": "A", "label": "Apply (spend time on paperwork)", "cash_delta": 250, "demand_mult": 0.85},
            {"id": "B", "label": "Skip it", "cash_delta": 0},
        ],
    },

    # ── RISK & CONSEQUENCE ─────────────────────────────────────────────────────
    {
        "id": "health_inspector", "category": "risk_consequence", "title": "The Health Inspector",
        "flavour": "A City Council health inspector visits your stall unannounced.",
        "choices": [
            {"id": "A", "label": "Pay K200 \"informal fee\"", "cash_delta": -200},
            {"id": "B", "label": "Refuse and risk it", "skip_day": True, "reputation_delta": -5},
        ],
    },
    {
        "id": "fire_at_market", "category": "risk_consequence", "title": "Fire at the Market",
        "flavour": "A stall two rows away caught fire. The market closes early while the situation is contained.",
        "choices": [
            {"id": "A", "label": "Evacuate immediately", "demand_mult": 0.6},
            {"id": "B", "label": "Try to keep serving nearby", "demand_mult": 0.75, "reputation_delta": -5},
        ],
    },
    {
        "id": "customer_complaint", "category": "risk_consequence", "title": "A Customer Complaint",
        "flavour": "A customer is threatening to tell everyone your products are fake or overpriced.",
        "choices": [
            {"id": "A", "label": "Refund them", "cash_delta": -50, "reputation_delta": 5},
            {"id": "B", "label": "Replace the product", "cash_delta": -20, "reputation_delta": 8},
            {"id": "C", "label": "Ignore it", "reputation_delta": -15},
        ],
    },
    {
        "id": "till_shortfall", "category": "risk_consequence", "title": "Till Shortfall",
        "flavour": "You count your till at the end of the morning and K150 is missing.",
        "choices": [
            {"id": "A", "label": "Confront your helper", "cash_delta": -75, "family_reputation_delta": -4},
            {"id": "B", "label": "Let it go", "cash_delta": -150},
        ],
    },
    {
        "id": "theft_attempt", "category": "risk_consequence", "title": "Theft Attempt",
        "flavour": "You spot someone slipping stock into their jacket and bolting.",
        "choices": [
            {"id": "A", "label": "Chase them", "cash_delta": -25},
            {"id": "B", "label": "Let it go", "cash_delta": -100},
        ],
    },
    {
        "id": "council_levy_inspection", "category": "risk_consequence", "title": "Council Multiple-Levy Inspection",
        "flavour": "Council officers arrive demanding multiple \"levies\" before you can keep trading today.",
        "choices": [
            {"id": "A", "label": "Pay K300 \"assistance fee\"", "cash_delta": -300},
            {"id": "B", "label": "Insist on doing it properly", "demand_mult": 0.5, "reputation_delta": 10},
        ],
    },
]

GUARANTEED_EVENTS = [
    {
        "id": "debt_reminder_day15", "category": "debt", "title": "A Reminder From Your Lender",
        "flavour": "Fifteen days in. Your lender wants you to know exactly where things stand.",
        "choices": [{"id": "A", "label": "Understood"}],
    },
    {
        "id": "debt_final_warning_day29", "category": "debt", "title": "Final Warning",
        "flavour": "One day left before your debt comes due. There is no more room to wait.",
        "choices": [{"id": "A", "label": "Understood"}],
    },
]


def get_event_definition(event_id: str) -> Optional[dict]:
    return next((e for e in EVENT_DEFINITIONS if e["id"] == event_id), None) or \
           next((e for e in GUARANTEED_EVENTS if e["id"] == event_id), None)


def event_card_payload(event_id: str) -> dict:
    """Client-facing view of an event: strips consequence numbers from choices."""
    event = get_event_definition(event_id)
    if not event:
        return None
    return {
        "id": event["id"], "category": event["category"], "title": event["title"],
        "flavour": event["flavour"],
        "choices": [{"id": c["id"], "label": c["label"]} for c in event["choices"]],
    }


def select_event_for_day(day: int, debt_balance: float, session_id: int) -> list:
    """Returns 0-2 event dicts scheduled for this day (Part 6 scheduling rules).
    Deterministic per (session_id, day) so repeated calls before a choice is made
    return the same result without needing a 'no event today' sentinel row."""
    rng = random.Random(f"{session_id}-{day}")

    if day == 15 and debt_balance > 0:
        return [e for e in GUARANTEED_EVENTS if e["id"] == "debt_reminder_day15"]
    if day == 29 and debt_balance > 0:
        return [e for e in GUARANTEED_EVENTS if e["id"] == "debt_final_warning_day29"]

    if day <= 7:
        chance, max_events, bias = 0.40, 1, ["opportunity", "zambian_reality", "market_shocks"]
    elif day <= 15:
        chance, max_events, bias = 0.55, 1, None
    elif day <= 22:
        chance, max_events, bias = 0.65, 2, None
    else:
        chance, max_events, bias = 0.75, 2, ["risk_consequence", "social_family"]

    picked = []
    for _ in range(max_events):
        if rng.random() < chance:
            pool = [e for e in EVENT_DEFINITIONS if not bias or e["category"] in bias] or EVENT_DEFINITIONS
            picked.append(rng.choice(pool))
    return picked


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
                                balance_sheet: dict, phase: int, lang: str = "en") -> str:
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

    prompt += "\n\n" + language_instruction(lang)

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


async def generate_market_event(biz_type: str, session_data: dict, day: int, lang: str = "en") -> dict:
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

    prompt += "\n\n" + language_instruction(lang)

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


async def ai_supplier_negotiation(biz_type: str, player_offer: str, context: dict, lang: str = "en") -> str:
    """Simulate a supplier negotiation conversation."""
    b = BUSINESS_TYPES[biz_type]
    prompt = f"""You are a Zambian supplier of {b['unit']}s. The player is negotiating with you.

Current context:
- Your standard price: K{b['cogs_per_unit']} per {b['unit']}
- Player's cash: K{context.get('cash', 0):,.0f}
- Player's message: "{player_offer}"

Respond as a real Zambian supplier would — firm but fair. You can offer small discounts (max 10%) for bulk orders (20+ units) or loyal customers. Reference real Zambian suppliers or market reality. Keep it under 60 words. End with a counter-offer or acceptance."""
    prompt += "\n\n" + language_instruction(lang)

    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        resp   = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=120,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.content[0].text
    except Exception:
        return f"My brother, K{b['cogs_per_unit']} is already my best price. For 20+ units I can do K{int(b['cogs_per_unit'] * 0.93)}. Take it or leave it."
