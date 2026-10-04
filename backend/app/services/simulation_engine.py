"""
KIP High-Fidelity Multi-Week Simulation Engine
===============================================
A lightweight, offline-first, **deterministic** state machine (sprint:
business_simulation_new_engine.docx). It takes one business idea's static
viability baseline (D, F, C, R, E, S, A) plus its global unit economics and
simulates an n-week horizon (n=4 by default). The player sets 5 levers EVERY
WEEK; each week mutates the core viability variables, and the compiled session
score V_simulated is available after any week (the live "final viability" meter).

Pure Python: depends only on the stdlib and viability_engine (no DB / API /
Anthropic / Chroma), so it is fully unit-testable in isolation.

Session flow:
    engine = SimulationEngine(baseline, horizon_weeks=4, seed=123)
    state  = engine.start()                      # also builds the shock schedule
    trace, state = engine.step(state, levers)    # one week; repeat n times
    result = engine.compile(state)               # compiled scores + V (any time)
`run(levers)` is a convenience loop over step() with the same levers each week.

────────────────────────────────────────────────────────────────────────────
DOCUMENTED INTERPRETATIONS (the sprint doc is precise on formulas but leaves a
few quantities to engineering judgement; each choice is commented inline too):

1. Marketing multiplier M_m IS applied to weekly demand D_w. The doc defines
   M_m as "expands top-of-funnel buyer volume (N)", but its inline D_w formula
   omits it. Omitting it would make the ad_spend lever inert, so M_m is included.
2. `price` lever is the core product's selling price; elasticity compares it
   with the core baseline price P (average_unit_price): M_p = (P / price)^β.
3. Portfolio blend (for M_mix and realized revenue/COGS) is WEIGHTED BY UNITS
   on hand across the core product + selected sub-products. With no stock at all
   it falls back to an equal-weight blend so M_mix stays defined.
4. Base workforce is 1 (owner-operator). `staffing_change` is a hire(+)/fire(-)
   delta applied that week; the head-count persists into later weeks.
5. `stock_ordered` = core-product units BOUGHT this week; each selected
   sub-product carries its own `units` bought this week. Unsold stock CARRIES
   OVER to the next week (so over-ordering locks cash in inventory) and pays the
   category's unsold_waste_penalty_per_unit every week it sits unsold.
6. Initial Cash AC = the requester's capital_available; if that is None
   (limitless) or <=0, fall back to capital_required, then to a small positive
   floor, so the Ending/Initial cash ratios never divide by zero.
7. Shocks: a seeded SCHEDULE names one threat per week up front, drawn from the
   idea's own operational_risks (or "Calm week"), so the player can prepare.
   Whether it hits, and how hard, is rolled during that week from the seed.
   Shocks destroy a fraction L of standing inventory before sales.
8. (1+g)^t market growth uses t in YEARS = (week-1)/52, so a 4-week horizon
   doesn't explode an annual CAGR into a weekly one.
9. E_compiled is the latest week's E (the doc says E is a learning curve, "not
   a passive average"); R_compiled is the mean of weekly R_w (the doc says so).
10. Cash vs profit are separate series. Net cash = revenue - procurement (every
   unit bought) - rent - wages - ad - waste. Net profit = revenue - COGS of units
   sold - rent - wages - ad - waste - value of units destroyed by shocks.
"""
from __future__ import annotations

import json
import math
import os
import random
from dataclasses import dataclass, field, asdict
from typing import Optional

from app.services import viability_engine as ve

_BENCHMARKS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_benchmarks.json")
_benchmarks_cache: Optional[dict] = None

# ── Tunable model constants (documented above) ──────────────────────────────
BASE_STAFF = 1                 # owner-operator baseline
DEFAULT_HORIZON_WEEKS = 4
LIQUIDITY_CRITICAL = 1.50      # LR_w below this = a "crunch" week (doc)
SCORE_FLOOR, SCORE_CEIL = 1.0, 10.0
MAX_SHOCK_FRACTION = 0.40      # worst-case share of standing inventory lost
CORE_KEY = "__core__"          # inventory key for the main product
CALM_WEEK = "Calm week"
# Intra-week shape: share of the week's customers per day (Mon..Sun), weekend-heavy.
DAY_SHAPE = (0.12, 0.12, 0.13, 0.14, 0.16, 0.18, 0.15)


def load_benchmarks() -> dict:
    global _benchmarks_cache
    if _benchmarks_cache is None:
        with open(_BENCHMARKS_PATH, "r", encoding="utf-8") as f:
            _benchmarks_cache = json.load(f)
    return _benchmarks_cache


def get_benchmark(category: Optional[str]) -> dict:
    """Structural constants for a category, falling back to `_default`."""
    data = load_benchmarks()
    if category and category in data:
        return data[category]
    return data["_default"]


def _clamp(x: float, lo: float = SCORE_FLOOR, hi: float = SCORE_CEIL) -> float:
    """Force a compiled score into the permanent [1.0, 10.0] band (sprint PART 4)."""
    if x is None or math.isnan(x) or math.isinf(x):
        return lo
    return round(max(lo, min(hi, x)), 2)


def _safe_div(num: float, den: float, default: float = 0.0) -> float:
    """Division guard (sprint PART 4): no zero/NaN denominators crash the run."""
    if not den:
        return default
    return num / den


def _finite(x: float, cap: float = 999.0) -> float:
    return x if math.isfinite(x) else cap


# ── Inputs ──────────────────────────────────────────────────────────────────
@dataclass
class SimulationLevers:
    """The 5 user-controlled levers (sprint PART 2), set for ONE week."""
    price: float                           # core selling price per unit
    ad_spend: float = 0.0                  # this week's marketing spend (ZMW)
    product_mix_selections: list = field(default_factory=list)  # sub-product dicts (+ `units`)
    stock_ordered: int = 0                 # core units bought this week
    staffing_change: int = 0               # hire(+)/fire(-) this week


@dataclass
class IdeaBaseline:
    """One idea's static viability baseline + global unit economics. Assembled
    from the three permanent tables: D/F from idea_global_factors, C/E/R/S/A from
    the winner's user_session_factors row, and the economics/sub-products/risks
    from idea_global_factors + business_ideas."""
    category: Optional[str]
    D: float
    F: float
    C: float
    R: float
    E: float
    S: float
    A: float
    total_target_buyers: float             # N
    consumption_frequency_per_year: float  # Q
    average_unit_price: float              # P (core product baseline price)
    monthly_revenue_estimate: float
    cost_of_goods_sold_monthly: float
    capital_required: Optional[float]
    capital_available: Optional[float]     # AC source; None == limitless
    environmental_risk_score: float = 5.0  # 1-10, higher = more exposed
    allowed_sub_products: list = field(default_factory=list)
    operational_risks: list = field(default_factory=list)  # named shocks for this idea

    @property
    def baseline_gross_margin(self) -> float:
        """Static target margin of the core blueprint (same basis as F)."""
        m = _safe_div(
            (self.monthly_revenue_estimate or 0) - (self.cost_of_goods_sold_monthly or 0),
            self.monthly_revenue_estimate or 0,
            default=0.0,
        )
        if m <= 0:
            m = _safe_div(self.F, 10.0, default=0.30) or 0.30
        return m

    @property
    def core_unit_cost(self) -> float:
        return (self.average_unit_price or 0) * (1.0 - self.baseline_gross_margin)


# ── Session state (serializable, persisted between weekly API calls) ────────
@dataclass
class SimulationState:
    seed: int
    horizon_weeks: int
    initial_cash: float
    cash: float
    E_w: float
    staff_count: int = BASE_STAFF
    week: int = 0                          # weeks completed
    inventory: dict = field(default_factory=dict)   # product key -> units on hand
    unit_costs: dict = field(default_factory=dict)  # product key -> wholesale cost per unit
    shock_schedule: list = field(default_factory=list)
    sum_D_w: float = 0.0
    sum_D_r: float = 0.0
    cum_revenue: float = 0.0
    cum_cogs: float = 0.0
    cum_profit: float = 0.0
    R_weeks: list = field(default_factory=list)
    weeks_in_crunch: int = 0

    @property
    def finished(self) -> bool:
        return self.week >= self.horizon_weeks

    def next_shock(self) -> Optional[dict]:
        if self.finished or not self.shock_schedule:
            return None
        return self.shock_schedule[self.week]

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "SimulationState":
        return cls(**d)


# ── Output ──────────────────────────────────────────────────────────────────
@dataclass
class WeekTrace:
    week: int
    shock_name: str
    shock_hit: bool
    D_w: float                 # gross demand (walk-ins)
    D_r: float                 # served demand after bottlenecks
    staff_count: int
    staff_capacity: float
    LSI: float                 # labor strain index
    revenue: float
    cogs: float
    procurement: float
    net_cash_flow: float
    net_profit: float
    cash_balance: float
    units_lost: float
    unsold: float              # units left on the shelf (carried over)
    loss_ratio: float
    liquidity_ratio: float
    in_crunch: bool
    R_w: float
    E: float                   # execution fit entering the week
    E_next: float              # execution fit after the week's learning curve
    running_scores: dict = field(default_factory=dict)
    running_viability: float = 0.0
    daily: list = field(default_factory=list)
    advice: list = field(default_factory=list)

    def to_dict(self) -> dict:
        r2 = lambda x: round(x, 2)
        return {
            "week": self.week,
            "shock_name": self.shock_name,
            "shock_hit": self.shock_hit,
            "gross_demand": r2(self.D_w),
            "served_demand": r2(self.D_r),
            "turned_away": r2(max(0.0, self.D_w - self.D_r)),
            "staff_count": self.staff_count,
            "staff_capacity": r2(self.staff_capacity),
            "labor_strain_index": round(_finite(self.LSI), 3),
            "revenue": r2(self.revenue),
            "cogs": r2(self.cogs),
            "procurement": r2(self.procurement),
            "net_cash_flow": r2(self.net_cash_flow),
            "net_profit": r2(self.net_profit),
            "cash_balance": r2(self.cash_balance),
            "units_lost": r2(self.units_lost),
            "unsold": r2(self.unsold),
            "loss_ratio": round(self.loss_ratio, 3),
            "liquidity_ratio": r2(_finite(self.liquidity_ratio)),
            "in_crunch": self.in_crunch,
            "risk_score": r2(self.R_w),
            "execution_fit": r2(self.E),
            "execution_fit_next": r2(self.E_next),
            "running_scores": self.running_scores,
            "running_viability": self.running_viability,
            "daily": self.daily,
            "advice": self.advice,
        }


@dataclass
class SimulationResult:
    horizon_weeks: int
    D_compiled: float
    F_compiled: float
    C_compiled: float
    E_compiled: float
    R_compiled: float
    S_compiled: float
    A_compiled: float
    V_simulated: float
    V_baseline: float
    initial_cash: float
    ending_cash: float
    weeks_in_crunch: int
    weekly_trace: list = field(default_factory=list)

    @property
    def scores(self) -> dict:
        return {"D": self.D_compiled, "F": self.F_compiled, "C": self.C_compiled,
                "E": self.E_compiled, "R": self.R_compiled, "S": self.S_compiled,
                "A": self.A_compiled}

    def to_dict(self) -> dict:
        return {
            "horizon_weeks": self.horizon_weeks,
            "compiled_scores": self.scores,
            "viability_simulated": self.V_simulated,
            "viability_baseline": self.V_baseline,
            "initial_cash": round(self.initial_cash, 2),
            "ending_cash": round(self.ending_cash, 2),
            "weeks_in_crunch": self.weeks_in_crunch,
            "weekly_trace": [w.to_dict() if isinstance(w, WeekTrace) else w for w in self.weekly_trace],
        }


# ── The state machine ────────────────────────────────────────────────────────
class SimulationEngine:
    def __init__(self, baseline: IdeaBaseline, horizon_weeks: int = DEFAULT_HORIZON_WEEKS,
                 seed: Optional[int] = None, benchmarks: Optional[dict] = None):
        self.b = baseline
        self.n = max(1, int(horizon_weeks or DEFAULT_HORIZON_WEEKS))
        self.seed = seed if seed is not None else random.randrange(1, 2**31)
        self.bench = benchmarks if benchmarks is not None else get_benchmark(baseline.category)

    # ---- Session lifecycle ---------------------------------------------------
    def start(self) -> SimulationState:
        AC = self._initial_cash()
        return SimulationState(
            seed=self.seed, horizon_weeks=self.n, initial_cash=AC, cash=AC,
            E_w=self.b.E, staff_count=BASE_STAFF, inventory={},
            shock_schedule=self._build_shock_schedule(),
        )

    def _build_shock_schedule(self) -> list:
        """One named threat per week, revealed before the week (interpretation #7)."""
        rng = random.Random(f"{self.seed}:schedule")
        risk = max(0.0, min(10.0, self.b.environmental_risk_score or 5.0))
        names = [r for r in (self.b.operational_risks or []) if isinstance(r, str) and r.strip()]
        if not names:
            names = ["Supply disruption", "Sudden price war", "Power outage"]
        threat_chance = min(0.85, 0.15 + 0.07 * risk)
        schedule = []
        for week in range(1, self.n + 1):
            if rng.random() < threat_chance:
                hit_prob = round(min(0.9, 0.25 + 0.06 * risk), 2)
                severity = "high" if hit_prob >= 0.65 else "medium" if hit_prob >= 0.45 else "low"
                schedule.append({"week": week, "name": rng.choice(names),
                                 "hit_probability": hit_prob, "severity": severity})
            else:
                schedule.append({"week": week, "name": CALM_WEEK,
                                 "hit_probability": 0.0, "severity": "none"})
        return schedule

    # ---- Lever coupling multipliers (sprint PART 2) -------------------------
    def _price_elasticity(self, price: float) -> float:
        """M_p = (P / price)^β. Raising price above baseline P shrinks N."""
        P = self.b.average_unit_price or 0
        beta = self.bench["base_elasticity"]
        if price <= 0 or P <= 0:
            return 1.0
        return (P / price) ** beta

    def _marketing_expansion(self, ad_spend: float) -> float:
        """M_m = 1 + ln(1 + ad_spend/k) * (A/10)."""
        k = self.bench["diminishing_returns_marketing_scale_k"] or 1.0
        return 1.0 + math.log(1.0 + _safe_div(max(0.0, ad_spend), k)) * (self.b.A / 10.0)

    def _products(self, levers: SimulationLevers) -> list:
        """Core + selected sub-products as {key, price, cost, bought}."""
        core_price = levers.price if levers.price and levers.price > 0 else (self.b.average_unit_price or 0)
        out = [{"key": CORE_KEY, "price": float(core_price), "cost": self.b.core_unit_cost,
                "bought": max(0.0, float(levers.stock_ordered or 0)), "expansion": 0.0}]
        for s in (levers.product_mix_selections or []):
            name = str(s.get("sub_product_name") or "sub-product")
            out.append({"key": name,
                        "price": float(s.get("suggested_price") or 0),
                        "cost": float(s.get("base_cost") or 0),
                        "bought": max(0.0, float(s.get("units") or 0)),
                        "expansion": float(s.get("demand_expansion_factor") or 0)})
        return out

    def _m_mix(self, products: list, weights: list) -> float:
        """M_mix = blended portfolio gross margin% / baseline gross margin%,
        weighted by units on hand (interpretation #3)."""
        if sum(weights) <= 0:
            weights = [1.0] * len(products)
        revenue = sum(p["price"] * w for p, w in zip(products, weights))
        cost = sum(p["cost"] * w for p, w in zip(products, weights))
        blended = _safe_div(revenue - cost, revenue, default=0.0)
        return _safe_div(blended, self.b.baseline_gross_margin, default=1.0) or 1.0

    def _staff_capacity(self, staff_count: int, E_w: float) -> float:
        """Staff capacity = staff_count * base_worker_throughput_weekly * (E/10)."""
        return max(0, staff_count) * self.bench["base_worker_throughput_weekly"] * (E_w / 10.0)

    @staticmethod
    def _next_execution_fit(E_w: float, LSI: float) -> float:
        """Execution-fit learning curve (sprint PART 3.2)."""
        if LSI < 0.8:                                    # Idle: skills atrophy slowly
            return max(1.0, E_w - 0.05)
        if LSI <= 1.25:                                  # Learning: productive stretch
            return min(10.0, E_w + 0.3 * math.log(1.0 + LSI))
        return max(1.0, E_w - 0.5 * (LSI - 1.25) ** 2)   # Burnout: strain destroys E

    def _initial_cash(self) -> float:
        ca = self.b.capital_available
        if ca is not None and ca > 0:
            return float(ca)
        if self.b.capital_required and self.b.capital_required > 0:
            return float(self.b.capital_required)
        return 1.0

    # ---- One week ------------------------------------------------------------
    def step(self, state: SimulationState, levers: SimulationLevers) -> tuple[WeekTrace, SimulationState]:
        if state.finished:
            raise ValueError("Simulation session already finished")
        b = self.b
        week = state.week + 1
        wrng = random.Random(f"{state.seed}:{week}")
        shock = state.shock_schedule[week - 1] if state.shock_schedule else \
            {"name": CALM_WEEK, "hit_probability": 0.0, "severity": "none"}

        # Workforce: hire/fire delta persists (interpretation #4).
        staff_count = max(0, state.staff_count + int(levers.staffing_change or 0))

        # Products + inventory: carried stock + this week's purchases.
        # Only products selected this week are on sale; carried stock of an
        # unselected sub-product stays on the shelf (and still pays waste fees).
        on_sale = self._products(levers)
        inventory = dict(state.inventory)
        unit_costs = dict(state.unit_costs)
        procurement = 0.0
        for p in on_sale:
            procurement += p["bought"] * p["cost"]
            inventory[p["key"]] = inventory.get(p["key"], 0.0) + p["bought"]
            unit_costs[p["key"]] = p["cost"]

        # Shock: destroys a fraction L of standing inventory BEFORE sales.
        hit = wrng.random() < float(shock.get("hit_probability") or 0)
        risk = max(0.0, min(10.0, b.environmental_risk_score or 5.0))
        L = (0.25 + 0.75 * wrng.random()) * MAX_SHOCK_FRACTION * max(0.3, risk / 10.0) if hit else 0.0
        total_before = sum(inventory.values())
        units_lost = loss_cost = 0.0
        for key in list(inventory.keys()):
            lost = inventory[key] * L
            inventory[key] -= lost
            units_lost += lost
            loss_cost += lost * unit_costs.get(key, b.core_unit_cost)
        stock_on_sale = [inventory.get(p["key"], 0.0) for p in on_sale]
        total_available = sum(stock_on_sale)

        # Gross demand D_w (interpretation #1 includes M_m).
        g = ve.get_cagr(b.category)
        N_w = _safe_div((b.total_target_buyers or 0) * (b.consumption_frequency_per_year or 0), 52.0)
        mix_expansion = 1.0 + sum(p["expansion"] for p in on_sale)
        D_w = (N_w * (1.0 + g) ** ((week - 1) / 52.0)
               * self._marketing_expansion(levers.ad_spend)
               * mix_expansion * self._price_elasticity(levers.price))

        # Bottleneck: served = min(demand, stock on sale, staff capacity).
        staff_capacity = self._staff_capacity(staff_count, state.E_w)
        D_r = min(D_w, total_available, staff_capacity)
        LSI = _safe_div(D_w, staff_capacity, default=float("inf") if D_w > 0 else 0.0)

        # Sales split across products by stock share.
        revenue = cogs = 0.0
        for p, stock in zip(on_sale, stock_on_sale):
            sold = D_r * _safe_div(stock, total_available)
            revenue += sold * p["price"]
            cogs += sold * p["cost"]
            inventory[p["key"]] = max(0.0, inventory.get(p["key"], 0.0) - sold)
        unsold = sum(inventory.values())

        # Weekly settlement (sprint PART 3.4 + interpretation #10).
        rent = self.bench["fixed_weekly_rent_baseline"]
        wages = staff_count * self.bench["weekly_wage_per_worker"]
        ad = max(0.0, float(levers.ad_spend or 0))
        waste_cost = unsold * self.bench["unsold_waste_penalty_per_unit"]
        net_cash = revenue - (procurement + rent + wages + ad + waste_cost)
        net_profit = revenue - (cogs + rent + wages + ad + waste_cost + loss_cost)
        cash = state.cash + net_cash

        # Risk (sprint PART 3.1), weighted by the portfolio actually stocked.
        M_mix = self._m_mix(on_sale, stock_on_sale)
        L_ratio = _safe_div(units_lost, total_before, default=0.0)
        R_w = (b.R * M_mix) * (1.0 - L_ratio)

        # Liquidity vs next week's committed overheads.
        LR = _safe_div(cash, rent + wages + ad, default=float("inf"))
        in_crunch = LR < LIQUIDITY_CRITICAL

        E_next = self._next_execution_fit(state.E_w, _finite(LSI, 2.0))

        new_state = SimulationState(
            seed=state.seed, horizon_weeks=state.horizon_weeks,
            initial_cash=state.initial_cash, cash=cash, E_w=E_next,
            staff_count=staff_count, week=week, inventory=inventory,
            unit_costs=unit_costs, shock_schedule=state.shock_schedule,
            sum_D_w=state.sum_D_w + D_w, sum_D_r=state.sum_D_r + D_r,
            cum_revenue=state.cum_revenue + revenue, cum_cogs=state.cum_cogs + cogs,
            cum_profit=state.cum_profit + net_profit,
            R_weeks=state.R_weeks + [R_w],
            weeks_in_crunch=state.weeks_in_crunch + (1 if in_crunch else 0),
        )
        running = self.compile(new_state)

        trace = WeekTrace(
            week=week, shock_name=shock.get("name", CALM_WEEK), shock_hit=hit,
            D_w=D_w, D_r=D_r, staff_count=staff_count, staff_capacity=staff_capacity,
            LSI=LSI, revenue=revenue, cogs=cogs, procurement=procurement,
            net_cash_flow=net_cash, net_profit=net_profit, cash_balance=cash,
            units_lost=units_lost, unsold=unsold, loss_ratio=L_ratio,
            liquidity_ratio=LR, in_crunch=in_crunch, R_w=R_w,
            E=state.E_w, E_next=E_next,
            running_scores=running.scores, running_viability=running.V_simulated,
        )
        trace.daily = self._daily_ticks(trace, state.cash, rent, wages, ad, waste_cost, loss_cost, wrng)
        trace.advice = self.advise(trace, new_state)
        return trace, new_state

    @staticmethod
    def _daily_ticks(t: WeekTrace, opening_cash: float, rent: float, wages: float,
                     ad: float, waste_cost: float, loss_cost: float, rng: random.Random) -> list:
        """Split the week into 7 days for live charts. Purchases and rent land on
        day 1, ads spread evenly, wages on payday (day 7), waste on day 7; sales
        follow a weekend-heavy shape with a little seeded jitter."""
        shape = [s * (0.9 + 0.2 * rng.random()) for s in DAY_SHAPE]
        total = sum(shape)
        shape = [s / total for s in shape]
        days, cash, profit = [], opening_cash, 0.0
        cogs_ratio = _safe_div(t.cogs, t.revenue, default=0.0)
        for i, share in enumerate(shape):
            revenue = t.revenue * share
            out = ad / 7.0
            if i == 0:
                out += t.procurement + rent
            if i == 6:
                out += wages + waste_cost
            cash += revenue - out
            day_profit = revenue * (1 - cogs_ratio) - ad / 7.0 - (rent if i == 0 else 0) \
                - (wages + waste_cost if i == 6 else 0) - (loss_cost if i == 0 else 0)
            profit += day_profit
            days.append({
                "day": i + 1,
                "demand": round(t.D_w * share, 2),
                "served": round(t.D_r * share, 2),
                "cash_balance": round(cash, 2),
                "profit_to_date": round(profit, 2),
            })
        return days

    # ---- Advisor (rule-based; AI wiring comes later) -------------------------
    def advise(self, t: WeekTrace, state: SimulationState) -> list:
        tips = []
        nxt = state.next_shock()
        if t.in_crunch:
            tips.append(("crunch", f"Cash is thin: you hold less than {LIQUIDITY_CRITICAL}x next week's fixed costs. "
                                   "Order less stock or cut ad spend until sales catch up."))
        if t.LSI > 1.25:
            tips.append(("burnout", f"Your team is overloaded (strain {_finite(t.LSI):.2f}). "
                                    "Hire at least one more worker or execution will keep falling."))
        turned_away = max(0.0, t.D_w - t.D_r)
        if turned_away > 0.15 * max(t.D_w, 1) and t.LSI <= 1.25:
            tips.append(("stockout", f"You turned away about {turned_away:.0f} customers. "
                                     "Stock more units next week."))
        if t.unsold > 0.5 * max(t.D_r, 1):
            tips.append(("overstock", f"{t.unsold:.0f} units are still on the shelf and cost you waste fees. "
                                      "Order less until they sell."))
        if nxt and nxt.get("severity") in ("medium", "high"):
            tips.append(("shock", f"Next week's threat: {nxt['name']} "
                                  f"({int(nxt['hit_probability'] * 100)}% chance). Keep stock lean to limit losses."))
        if 0 < t.LSI < 0.8:
            tips.append(("idle", "Your staff are idle most of the week. Spend on marketing to bring in more customers."))
        if not tips:
            tips.append(("steady", "A steady week. Try a small price rise and watch whether demand holds."))
        return [{"kind": k, "text": txt} for k, txt in tips[:2]]

    # ---- Compile (any time) --------------------------------------------------
    def compile(self, state: SimulationState) -> SimulationResult:
        b = self.b
        V_baseline = ve.calculate_viability(D=b.D, F=b.F, C=b.C, E=b.E, R=b.R, S=b.S, A=b.A)
        if state.week == 0:
            return SimulationResult(
                horizon_weeks=state.horizon_weeks,
                D_compiled=_clamp(b.D), F_compiled=_clamp(b.F), C_compiled=_clamp(b.C),
                E_compiled=_clamp(b.E), R_compiled=_clamp(b.R), S_compiled=_clamp(b.S),
                A_compiled=_clamp(b.A), V_simulated=V_baseline, V_baseline=V_baseline,
                initial_cash=state.initial_cash, ending_cash=state.cash, weeks_in_crunch=0,
            )
        cash_ratio = _safe_div(state.cash, state.initial_cash, default=0.0)
        D_c = _clamp(b.D * _safe_div(state.sum_D_r, state.sum_D_w, default=0.0))
        F_c = _clamp(_safe_div(state.cum_revenue - state.cum_cogs, state.cum_revenue, default=0.0) * 10.0 * cash_ratio)
        C_c = _clamp((b.C * cash_ratio) - (state.weeks_in_crunch * 1.5))
        R_c = _clamp(_safe_div(sum(state.R_weeks), len(state.R_weeks), default=b.R))
        E_c = _clamp(state.E_w)
        S_c, A_c = _clamp(b.S), _clamp(b.A)
        V = ve.calculate_viability(D=D_c, F=F_c, C=C_c, E=E_c, R=R_c, S=S_c, A=A_c)
        return SimulationResult(
            horizon_weeks=state.horizon_weeks,
            D_compiled=D_c, F_compiled=F_c, C_compiled=C_c, E_compiled=E_c,
            R_compiled=R_c, S_compiled=S_c, A_compiled=A_c,
            V_simulated=V, V_baseline=V_baseline,
            initial_cash=state.initial_cash, ending_cash=state.cash,
            weeks_in_crunch=state.weeks_in_crunch,
        )

    # ---- Convenience: whole run with fixed levers ---------------------------
    def run(self, levers: SimulationLevers) -> SimulationResult:
        state = self.start()
        trace = []
        for week in range(self.n):
            wk = SimulationLevers(
                price=levers.price, ad_spend=levers.ad_spend,
                product_mix_selections=levers.product_mix_selections,
                stock_ordered=levers.stock_ordered,
                staffing_change=levers.staffing_change if week == 0 else 0,
            )
            t, state = self.step(state, wk)
            trace.append(t)
        result = self.compile(state)
        result.weekly_trace = trace
        return result
