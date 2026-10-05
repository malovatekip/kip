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
MARKET & OPERATIONS MODEL (v2 -- "realistic" rewrite)

1. Reachable demand. A new micro-business does not face its whole addressable
   market on day one. Weekly demand is
       D_w = N_w * share_cap(S) * awareness * goodwill * M_p * mix_expansion
   - N_w = N*Q/52 grown by the category CAGR ((1+g)^(years elapsed)).
   - share_cap(S): competitive position caps the share of the market a shop can
     win (fragmented markets; S=5 -> 50%).
   - awareness: Bass-diffusion style adoption. Starts from location/assets (A),
     grows each week by ad reach (innovation, p) and word of mouth from
     satisfied customers (imitation, q).
   - goodwill: customer retention. Stockouts and over-pricing push it down
     (retail studies: ~30-40% of shoppers hitting a stockout switch store);
     consistently full shelves at a fair price push it slightly above 1.
   - M_p = (P/price)^beta, the category price elasticity (clamped).
2. Reference demand D_ref is the same market served by a competent operator at
   the baseline price, no ads, full service. The static score implicitly
   assumes this operator, so the compiled Demand score compares against it.
3. Working capital. Stock is paid for in cash up front (Zambian MSMEs get very
   little supplier credit). The week's purchases are capped at cash on hand
   after rent, ads and severance; an over-budget order is scaled down pro rata.
4. Labour. Base workforce is 1 (owner-operator). New hires work at 50% in their
   first week (onboarding); each fired worker costs one week's wage. A week
   that ends overdrawn (wages unpaid) knocks 0.5 off execution fit.
5. Perishability. After sales a category share of unsold stock spoils
   (spoilage_rate_weekly in industry_benchmarks.json). The rest carries over
   and pays the holding/waste fee.
6. Shocks: a seeded SCHEDULE names one threat per week up front, drawn from the
   idea's operational_risks (or "Calm week"). Whether it hits and how hard is
   rolled during the week; a hit destroys a fraction of standing stock.
7. Scoring (compile) uses the SAME basis as the static score, weighted toward
   later weeks (week t has weight t) so the trajectory counts more than the
   cold start:
   - D: baseline D x fill-rate score (95% in-stock = perfect) x sqrt(reach vs D_ref)
   - F: realised gross margin after spoilage and shock losses (static F basis)
   - C: baseline C moved by log2 net-worth growth (cash + stock at cost),
        minus cash-crunch weeks (thin closing cash, or no payroll reserve left
        after buying stock) and overdrawn weeks
   - E: the learning-curve execution fit after the last week
   - R: baseline R minus the share of stock lost, plus diversification and
        an always-liquid bonus
   - S: baseline S moved by end-of-run goodwill (reputation)
   - A: baseline (location/assets don't move in a few weeks)
"""
from __future__ import annotations

import json
import math
import os
import random
from dataclasses import dataclass, field, asdict, fields
from typing import Optional

from app.services import viability_engine as ve

_BENCHMARKS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_benchmarks.json")
_benchmarks_cache: Optional[dict] = None

# ── Tunable model constants (documented above) ──────────────────────────────
BASE_STAFF = 1                 # owner-operator baseline
DEFAULT_HORIZON_WEEKS = 4
LIQUIDITY_CRITICAL = 1.50      # cash below this many weeks of fixed costs = a "crunch" week
SCORE_FLOOR, SCORE_CEIL = 1.0, 10.0
MAX_SHOCK_FRACTION = 0.40      # worst-case share of standing inventory lost
CORE_KEY = "__core__"          # inventory key for the main product
CALM_WEEK = "Calm week"
# Intra-week shape: share of the week's customers per day (Mon..Sun), weekend-heavy.
DAY_SHAPE = (0.12, 0.12, 0.13, 0.14, 0.16, 0.18, 0.15)

SHARE_CAP_BASE, SHARE_CAP_PER_S = 0.15, 0.07      # S=5 -> 50% of the market winnable
AWARENESS_BASE, AWARENESS_PER_A = 0.20, 0.04      # A=5 -> 40% aware on opening day
WORD_OF_MOUTH_Q = 0.35                            # weekly imitation coefficient
AD_REACH_SCALE = 0.20                             # share of the unaware an ad budget reaches
PRICE_MULT_MIN, PRICE_MULT_MAX = 0.20, 1.60       # clamp on (P/price)^beta
GOODWILL_MEMORY = 0.70                            # weight of last week's goodwill
GOODWILL_MIN, GOODWILL_MAX = 0.30, 1.15
FILL_TARGET = 0.95                                # in-stock rate treated as perfect service
NEW_HIRE_PRODUCTIVITY = 0.50                      # first-week output of a new hire
SEVERANCE_WEEKS = 1.0                             # wages owed per fired worker
OVERDRAWN_E_PENALTY = 0.5
REACH_CAP = 1.25                                  # max credit for out-growing the reference
C_GROWTH_PER_DOUBLING = 1.0
C_DELTA_MIN, C_DELTA_MAX = -6.0, 2.0
C_CRUNCH_PENALTY, C_OVERDRAWN_PENALTY = 1.0, 3.0
R_LOSS_WEIGHT, R_LINE_BONUS, R_LINE_BONUS_CAP, R_LIQUID_BONUS = 4.0, 0.5, 1.0, 0.5
R_DELTA_MIN, R_DELTA_MAX = -4.0, 1.5
S_GOODWILL_WEIGHT = 1.5
S_DELTA_MIN, S_DELTA_MAX = -2.0, 1.5

# Solver ("Run with Kip") candidate grid. Kept small so a full plan is sub-second.
SOLVER_PRICE_MULTS = (0.9, 0.95, 1.0, 1.05, 1.1, 1.2)
SOLVER_AD_MULTS = (0.0, 0.25, 0.5, 1.0)       # multiples of the category marketing scale k
SOLVER_HIRES = (0, 1, 2)
SOLVER_STOCK_COVERS = (0.85, 1.0, 1.2)        # fraction of serveable demand to stock
SOLVER_PASSES = 2                             # coordinate-descent passes over the dimensions


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


def _bound(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


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
    # v2 market/operations state. Defaults let pre-v2 persisted sessions load;
    # None awareness means "not initialised yet" and is filled on the next step.
    awareness: Optional[float] = None
    ref_awareness: Optional[float] = None
    goodwill: float = 1.0
    w_served: float = 0.0                  # sum of week-weighted served demand
    w_demand: float = 0.0                  # sum of week-weighted reachable demand
    w_ref_demand: float = 0.0              # sum of week-weighted reference demand
    cum_procurement: float = 0.0
    cum_spoil_cost: float = 0.0
    cum_loss_cost: float = 0.0
    overdrawn_weeks: int = 0
    product_lines_max: int = 0

    @property
    def finished(self) -> bool:
        return self.week >= self.horizon_weeks

    def next_shock(self) -> Optional[dict]:
        if self.finished or not self.shock_schedule:
            return None
        return self.shock_schedule[self.week]

    def inventory_value(self) -> float:
        return sum(units * (self.unit_costs.get(k) or 0.0) for k, units in self.inventory.items())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "SimulationState":
        known = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in known})


# ── Output ──────────────────────────────────────────────────────────────────
@dataclass
class WeekTrace:
    week: int
    shock_name: str
    shock_hit: bool
    D_w: float                 # reachable demand (walk-ins)
    D_r: float                 # served demand after bottlenecks
    D_ref: float               # reference demand (competent operator)
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
    units_requested: float = 0.0
    units_bought: float = 0.0
    order_capped: bool = False
    purchase_budget: float = 0.0
    units_spoiled: float = 0.0
    spoilage_cost: float = 0.0
    severance: float = 0.0
    overdrawn: bool = False
    awareness: float = 0.0     # awareness after this week
    goodwill: float = 1.0      # goodwill after this week
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
            "reference_demand": r2(self.D_ref),
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
            "units_requested": r2(self.units_requested),
            "units_bought": r2(self.units_bought),
            "order_capped": self.order_capped,
            "purchase_budget": r2(self.purchase_budget),
            "units_spoiled": r2(self.units_spoiled),
            "spoilage_cost": r2(self.spoilage_cost),
            "severance": r2(self.severance),
            "overdrawn": self.overdrawn,
            "awareness": round(self.awareness, 3),
            "goodwill": round(self.goodwill, 3),
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
        a0 = self.initial_awareness()
        return SimulationState(
            seed=self.seed, horizon_weeks=self.n, initial_cash=AC, cash=AC,
            E_w=self.b.E, staff_count=BASE_STAFF, inventory={},
            shock_schedule=self._build_shock_schedule(),
            awareness=a0, ref_awareness=a0,
        )

    def _build_shock_schedule(self) -> list:
        """One named threat per week, revealed before the week."""
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

    # ---- Market model ---------------------------------------------------------
    def share_cap(self) -> float:
        """Share of the addressable market this shop can win, from competitive position S."""
        return _bound(SHARE_CAP_BASE + SHARE_CAP_PER_S * (self.b.S or 0), 0.05, 0.95)

    def initial_awareness(self) -> float:
        """Opening-day awareness, from location/assets A."""
        return _bound(AWARENESS_BASE + AWARENESS_PER_A * (self.b.A or 0), 0.05, 0.95)

    def _price_elasticity(self, price: float) -> float:
        """M_p = (P / price)^beta, clamped. Raising price above baseline P shrinks demand."""
        P = self.b.average_unit_price or 0
        beta = self.bench["base_elasticity"]
        if not price or price <= 0 or P <= 0:
            return 1.0
        return _bound((P / price) ** beta, PRICE_MULT_MIN, PRICE_MULT_MAX)

    def _price_fairness(self, price: float) -> float:
        """Value-for-money perception: 1.0 at the baseline price, lower when dearer."""
        P = self.b.average_unit_price or 0
        if not price or price <= 0 or P <= 0:
            return 1.0
        return _bound(math.sqrt(P / price), 0.0, 1.15)

    def ad_reach(self, ad_spend: float) -> float:
        """Share of the still-unaware market an ad budget reaches this week (diminishing returns)."""
        k = self.bench["diminishing_returns_marketing_scale_k"] or 1.0
        return _bound(AD_REACH_SCALE * math.log(1.0 + _safe_div(max(0.0, ad_spend or 0), k))
                      * ((self.b.A or 0) / 10.0), 0.0, 0.9)

    def market_weekly(self, week: int) -> float:
        """Addressable buyers this week: N*Q/52 grown by the category CAGR."""
        g = ve.get_cagr(self.b.category)
        N_w = _safe_div((self.b.total_target_buyers or 0) * (self.b.consumption_frequency_per_year or 0), 52.0)
        return N_w * (1.0 + g) ** ((week - 1) / 52.0)

    def forecast_demand(self, state: SimulationState, price: Optional[float] = None,
                        ad_spend: float = 0.0, mix_expansion: float = 1.0) -> float:
        """Expected reachable demand for the coming week under these levers."""
        a = state.awareness if state.awareness is not None else self.initial_awareness()
        a_eff = min(1.0, a + (1.0 - a) * self.ad_reach(ad_spend))
        price = price if price and price > 0 else self.b.average_unit_price
        return (self.market_weekly(state.week + 1) * self.share_cap() * a_eff * state.goodwill
                * self._price_elasticity(price) * mix_expansion)

    def purchase_budget(self, state: SimulationState, ad_spend: float = 0.0, fired: int = 0) -> float:
        """Cash left for stock after this week's rent, ads and severance."""
        sev = max(0, fired) * SEVERANCE_WEEKS * self.bench["weekly_wage_per_worker"]
        return max(0.0, state.cash - self.bench["fixed_weekly_rent_baseline"] - max(0.0, ad_spend or 0) - sev)

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

    def _staff_capacity(self, staff_count: float, E_w: float) -> float:
        """Staff capacity = effective staff * base_worker_throughput_weekly * (E/10)."""
        return max(0.0, staff_count) * self.bench["base_worker_throughput_weekly"] * (E_w / 10.0)

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
        b, bench = self.b, self.bench
        week = state.week + 1
        weight = float(week)
        wrng = random.Random(f"{state.seed}:{week}")
        shock = state.shock_schedule[week - 1] if state.shock_schedule else \
            {"name": CALM_WEEK, "hit_probability": 0.0, "severity": "none"}
        awareness = state.awareness if state.awareness is not None else self.initial_awareness()
        ref_awareness = state.ref_awareness if state.ref_awareness is not None else awareness

        # 1. Workforce: hire/fire delta persists; new hires onboard at half output,
        #    fired workers are owed severance.
        staff_count = max(0, state.staff_count + int(levers.staffing_change or 0))
        hired = max(0, staff_count - state.staff_count)
        fired = max(0, state.staff_count - staff_count)
        wage = bench["weekly_wage_per_worker"]
        severance = fired * SEVERANCE_WEEKS * wage
        rent = bench["fixed_weekly_rent_baseline"]
        ad = max(0.0, float(levers.ad_spend or 0))

        # 2. Working capital: stock is paid in cash up front; scale an over-budget order.
        on_sale = self._products(levers)
        requested_units = sum(p["bought"] for p in on_sale)
        requested_cost = sum(p["bought"] * p["cost"] for p in on_sale)
        budget = self.purchase_budget(state, ad, fired)
        order_capped = requested_cost > budget + 1e-9
        if order_capped:
            scale = _safe_div(budget, requested_cost, default=0.0)
            for p in on_sale:
                p["bought"] = float(math.floor(p["bought"] * scale))
        inventory = dict(state.inventory)
        unit_costs = dict(state.unit_costs)
        procurement = 0.0
        for p in on_sale:
            procurement += p["bought"] * p["cost"]
            inventory[p["key"]] = inventory.get(p["key"], 0.0) + p["bought"]
            unit_costs[p["key"]] = p["cost"]
        units_bought = sum(p["bought"] for p in on_sale)

        # 3. Shock: destroys a fraction L of standing inventory BEFORE sales.
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

        # 4. Demand: reachable market this week vs the competent-operator reference.
        market = self.market_weekly(week) * self.share_cap()
        a_eff = min(1.0, awareness + (1.0 - awareness) * self.ad_reach(ad))
        mix_expansion = 1.0 + sum(p["expansion"] for p in on_sale)
        D_w = market * a_eff * state.goodwill * self._price_elasticity(levers.price) * mix_expansion
        D_ref = market * ref_awareness

        # 5. Bottleneck: served = min(demand, stock on sale, staff capacity).
        effective_staff = staff_count - hired * (1.0 - NEW_HIRE_PRODUCTIVITY)
        staff_capacity = self._staff_capacity(effective_staff, state.E_w)
        D_r = min(D_w, total_available, staff_capacity)
        LSI = _safe_div(D_w, staff_capacity, default=float("inf") if D_w > 0 else 0.0)

        revenue = cogs = 0.0
        for p, stock in zip(on_sale, stock_on_sale):
            sold = D_r * _safe_div(stock, total_available)
            revenue += sold * p["price"]
            cogs += sold * p["cost"]
            inventory[p["key"]] = max(0.0, inventory.get(p["key"], 0.0) - sold)
        product_lines = sum(1 for s in stock_on_sale if s > 0)

        # 6. Perishability: a share of unsold stock spoils; the rest pays holding fees.
        spoil_rate = float(bench.get("spoilage_rate_weekly", 0.0) or 0.0)
        units_spoiled = spoil_cost = 0.0
        for key in list(inventory.keys()):
            spoiled = inventory[key] * spoil_rate
            inventory[key] -= spoiled
            units_spoiled += spoiled
            spoil_cost += spoiled * unit_costs.get(key, b.core_unit_cost)
        unsold = sum(inventory.values())

        # 7. Weekly settlement. Net cash counts every unit bought; profit counts
        #    units sold plus everything destroyed or spoiled.
        wages = staff_count * wage
        waste_cost = unsold * bench["unsold_waste_penalty_per_unit"]
        net_cash = revenue - (procurement + rent + wages + ad + waste_cost + severance)
        net_profit = revenue - (cogs + rent + wages + ad + waste_cost + severance + loss_cost + spoil_cost)
        cash = state.cash + net_cash
        overdrawn = cash < 0

        # Crunch: either the week ends with under LIQUIDITY_CRITICAL weeks of fixed
        # costs in hand, or the mid-week low point (after paying for stock, rent
        # and ads) left no reserve to cover this week's payroll.
        LR = _safe_div(cash, rent + wages + ad, default=float("inf"))
        low_point = state.cash - procurement - rent - ad - severance
        in_crunch = LR < LIQUIDITY_CRITICAL or low_point < wages

        E_next = self._next_execution_fit(state.E_w, _finite(LSI, 2.0))
        if overdrawn:
            E_next = max(1.0, E_next - OVERDRAWN_E_PENALTY)

        # 8. Goodwill and awareness for next week.
        fill = _safe_div(D_r, D_w, default=1.0)
        fill_score = min(1.0, fill / FILL_TARGET)
        fairness = self._price_fairness(levers.price)
        goodwill = _bound(GOODWILL_MEMORY * state.goodwill
                          + (1.0 - GOODWILL_MEMORY) * (0.3 + 0.8 * fill_score) * fairness,
                          GOODWILL_MIN, GOODWILL_MAX)
        awareness_next = min(1.0, a_eff + (1.0 - a_eff) * WORD_OF_MOUTH_Q * a_eff * fill_score * fairness)
        ref_next = min(1.0, ref_awareness + (1.0 - ref_awareness) * WORD_OF_MOUTH_Q * ref_awareness)

        new_state = SimulationState(
            seed=state.seed, horizon_weeks=state.horizon_weeks,
            initial_cash=state.initial_cash, cash=cash, E_w=E_next,
            staff_count=staff_count, week=week, inventory=inventory,
            unit_costs=unit_costs, shock_schedule=state.shock_schedule,
            sum_D_w=state.sum_D_w + D_w, sum_D_r=state.sum_D_r + D_r,
            cum_revenue=state.cum_revenue + revenue, cum_cogs=state.cum_cogs + cogs,
            cum_profit=state.cum_profit + net_profit,
            R_weeks=list(state.R_weeks),
            weeks_in_crunch=state.weeks_in_crunch + (1 if in_crunch else 0),
            awareness=awareness_next, ref_awareness=ref_next, goodwill=goodwill,
            w_served=state.w_served + weight * D_r,
            w_demand=state.w_demand + weight * D_w,
            w_ref_demand=state.w_ref_demand + weight * D_ref,
            cum_procurement=state.cum_procurement + procurement,
            cum_spoil_cost=state.cum_spoil_cost + spoil_cost,
            cum_loss_cost=state.cum_loss_cost + loss_cost,
            overdrawn_weeks=state.overdrawn_weeks + (1 if overdrawn else 0),
            product_lines_max=max(state.product_lines_max, product_lines),
        )
        running = self.compile(new_state)
        new_state.R_weeks.append(running.R_compiled)

        trace = WeekTrace(
            week=week, shock_name=shock.get("name", CALM_WEEK), shock_hit=hit,
            D_w=D_w, D_r=D_r, D_ref=D_ref, staff_count=staff_count, staff_capacity=staff_capacity,
            LSI=LSI, revenue=revenue, cogs=cogs, procurement=procurement,
            net_cash_flow=net_cash, net_profit=net_profit, cash_balance=cash,
            units_lost=units_lost, unsold=unsold,
            loss_ratio=_safe_div(units_lost, total_before, default=0.0),
            liquidity_ratio=LR, in_crunch=in_crunch, R_w=running.R_compiled,
            E=state.E_w, E_next=E_next,
            units_requested=requested_units, units_bought=units_bought,
            order_capped=order_capped, purchase_budget=budget,
            units_spoiled=units_spoiled, spoilage_cost=spoil_cost, severance=severance,
            overdrawn=overdrawn, awareness=awareness_next, goodwill=goodwill,
            running_scores=running.scores, running_viability=running.V_simulated,
        )
        trace.daily = self._daily_ticks(trace, state.cash, rent, wages, ad,
                                        waste_cost + severance, loss_cost + spoil_cost, wrng)
        trace.advice = self.advise(trace, new_state)
        return trace, new_state

    @staticmethod
    def _daily_ticks(t: WeekTrace, opening_cash: float, rent: float, wages: float,
                     ad: float, end_costs: float, loss_cost: float, rng: random.Random) -> list:
        """Split the week into 7 days for live charts. Purchases and rent land on
        day 1, ads spread evenly, wages/waste/severance on day 7; sales follow a
        weekend-heavy shape with a little seeded jitter."""
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
                out += wages + end_costs
            cash += revenue - out
            day_profit = revenue * (1 - cogs_ratio) - ad / 7.0 - (rent if i == 0 else 0) \
                - (wages + end_costs + loss_cost if i == 6 else 0)
            profit += day_profit
            days.append({
                "day": i + 1,
                "demand": round(t.D_w * share, 2),
                "served": round(t.D_r * share, 2),
                "cash_balance": round(cash, 2),
                "profit_to_date": round(profit, 2),
            })
        return days

    # ---- Advisor (rule-based fallback for the AI advisor) --------------------
    def advise(self, t: WeekTrace, state: SimulationState) -> list:
        tips = []
        nxt = state.next_shock()
        if t.overdrawn:
            tips.append(("overdrawn", "You ended the week overdrawn and could not pay wages in full. "
                                      "Your team's morale took a hit. Order less stock until cash recovers."))
        if t.order_capped:
            tips.append(("order_capped", f"You only had K{t.purchase_budget:,.0f} for stock after rent and ads, "
                                         f"so your order was cut to {t.units_bought:.0f} of {t.units_requested:.0f} units."))
        if t.in_crunch and not t.overdrawn:
            tips.append(("crunch", f"Cash is thin: you hold less than {LIQUIDITY_CRITICAL}x next week's fixed costs. "
                                   "Order less stock or cut ad spend until sales catch up."))
        if t.LSI > 1.25:
            tips.append(("burnout", f"Your team is overloaded (strain {_finite(t.LSI):.2f}). "
                                    "Hire at least one more worker or execution will keep falling."))
        turned_away = max(0.0, t.D_w - t.D_r)
        if turned_away > 0.15 * max(t.D_w, 1) and t.LSI <= 1.25:
            tips.append(("stockout", f"You turned away about {turned_away:.0f} customers, and some won't come back. "
                                     "Stock more units next week."))
        if t.units_spoiled > 0.1 * max(t.D_r, 1):
            tips.append(("spoilage", f"{t.units_spoiled:.0f} units spoiled on the shelf this week. "
                                     "Order closer to what you actually sell."))
        if t.unsold > 0.5 * max(t.D_r, 1):
            tips.append(("overstock", f"{t.unsold:.0f} units are still on the shelf and cost you holding fees. "
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

        # D: service quality (95% fill = perfect) x reach vs the reference operator.
        fill = _safe_div(state.w_served, state.w_demand, default=1.0)
        fill_score = min(1.0, fill / FILL_TARGET)
        reach = _safe_div(state.w_demand, state.w_ref_demand, default=1.0)
        D_c = _clamp(b.D * fill_score * math.sqrt(_bound(reach, 0.0, REACH_CAP)))

        # F: realised gross margin after spoilage and shock write-offs.
        if state.cum_revenue > 0:
            margin = (state.cum_revenue - state.cum_cogs - state.cum_spoil_cost - state.cum_loss_cost) \
                / state.cum_revenue
            F_c = _clamp(margin * 10.0)
        else:
            F_c = _clamp(b.F - 2.0)

        # C: net-worth growth (stock counts as an asset), minus liquidity failures.
        net_worth = state.cash + state.inventory_value()
        growth = _safe_div(net_worth, state.initial_cash, default=0.0)
        c_delta = _bound(C_GROWTH_PER_DOUBLING * math.log2(max(growth, 0.01)), C_DELTA_MIN, C_DELTA_MAX)
        C_c = _clamp(b.C + c_delta - C_CRUNCH_PENALTY * state.weeks_in_crunch
                     - C_OVERDRAWN_PENALTY * state.overdrawn_weeks)

        # R: resilience -- losses hurt, diversification and liquidity help.
        loss_share = _safe_div(state.cum_spoil_cost + state.cum_loss_cost, state.cum_procurement, default=0.0)
        r_delta = (-R_LOSS_WEIGHT * loss_share
                   + min(R_LINE_BONUS_CAP, R_LINE_BONUS * max(0, state.product_lines_max - 1))
                   + (R_LIQUID_BONUS if state.weeks_in_crunch == 0 and state.overdrawn_weeks == 0 else 0.0))
        R_c = _clamp(b.R + _bound(r_delta, R_DELTA_MIN, R_DELTA_MAX))

        E_c = _clamp(state.E_w)
        S_c = _clamp(b.S + _bound(S_GOODWILL_WEIGHT * (state.goodwill - 1.0), S_DELTA_MIN, S_DELTA_MAX))
        A_c = _clamp(b.A)
        V = ve.calculate_viability(D=D_c, F=F_c, C=C_c, E=E_c, R=R_c, S=S_c, A=A_c)
        return SimulationResult(
            horizon_weeks=state.horizon_weeks,
            D_compiled=D_c, F_compiled=F_c, C_compiled=C_c, E_compiled=E_c,
            R_compiled=R_c, S_compiled=S_c, A_compiled=A_c,
            V_simulated=V, V_baseline=V_baseline,
            initial_cash=state.initial_cash, ending_cash=state.cash,
            weeks_in_crunch=state.weeks_in_crunch,
        )

    # ---- Prudent reference policy -------------------------------------------
    def prudent_levers(self, state: SimulationState) -> SimulationLevers:
        """A safe, solvent play: baseline price, no ads or hires, stock only what
        the current team can serve of the forecast demand and the cash can buy.
        Used as the lever default and as the roll-out continuation for the solver."""
        b, bench = self.b, self.bench
        throughput = bench["base_worker_throughput_weekly"] * state.E_w / 10.0
        capacity = state.staff_count * throughput
        budget = self.purchase_budget(state) - state.staff_count * bench["weekly_wage_per_worker"]
        need = max(0.0, min(self.forecast_demand(state), capacity) - state.inventory.get(CORE_KEY, 0.0))
        cost = b.core_unit_cost
        units = min(need, max(0.0, budget) / cost) if cost > 0 else need
        return SimulationLevers(price=round(b.average_unit_price or 0, 2),
                                stock_ordered=int(max(0, math.floor(units))))

    # ---- Solver: let Kip pick the levers ------------------------------------
    def _sub_sets(self) -> list:
        """Sub-product archetypes the solver tries: none, best-margin, all."""
        subs = self.b.allowed_sub_products or []
        sets = [[]]
        if subs:
            best = max(subs, key=lambda s: _safe_div((s.get("suggested_price") or 0) - (s.get("base_cost") or 0),
                                                     s.get("suggested_price") or 0))
            sets.append([best])
            if len(subs) > 1:
                sets.append(list(subs))
        return sets

    def _lever_from_params(self, state: SimulationState, pm: float, ad_mult: float,
                           hire: int, sub_set: list, cover: float) -> SimulationLevers:
        """One lever set from solver parameters. Stock is sized to the chosen cover
        of serveable demand, then held within the cash left after payroll so the
        order is never one the business cannot finance."""
        b, bench = self.b, self.bench
        price = round((b.average_unit_price or 1.0) * pm, 2)
        ad = round(ad_mult * (bench["diminishing_returns_marketing_scale_k"] or 1.0), 2)
        throughput = bench["base_worker_throughput_weekly"] * state.E_w / 10.0
        cap_eff = (state.staff_count + NEW_HIRE_PRODUCTIVITY * hire) * throughput
        budget = max(0.0, self.purchase_budget(state, ad) - (state.staff_count + hire) * bench["weekly_wage_per_worker"])
        mix_exp = 1.0 + sum((s.get("demand_expansion_factor") or 0) for s in sub_set)
        sub_frac = (mix_exp - 1.0) / mix_exp if mix_exp > 1 else 0.0
        demand = self.forecast_demand(state, price=price, ad_spend=ad, mix_expansion=mix_exp)
        target = max(0.0, min(demand, cap_eff) * cover - sum(state.inventory.values()))
        core_units = target * (1.0 - sub_frac)
        sub_each = _safe_div(target * sub_frac, len(sub_set)) if sub_set else 0.0
        cost = core_units * b.core_unit_cost + sum(sub_each * (s.get("base_cost") or 0) for s in sub_set)
        scale = min(1.0, _safe_div(budget, cost, default=1.0)) if cost > 0 else 1.0
        sel = [dict(s, units=int(math.floor(sub_each * scale))) for s in sub_set]
        return SimulationLevers(
            price=price, ad_spend=ad, stock_ordered=int(math.floor(core_units * scale)),
            staffing_change=hire, product_mix_selections=[s for s in sel if s["units"] > 0])

    def _rollout_value(self, levers: SimulationLevers, state: SimulationState) -> tuple:
        """Final viability if this week's levers are played and the rest of the
        horizon continues prudently; ending net worth breaks ties (favours the
        setup that also banks more)."""
        _, s = self.step(state, levers)
        while not s.finished:
            _, s = self.step(s, self.prudent_levers(s))
        return (self.compile(s).V_simulated, round(s.cash + s.inventory_value(), 2))

    def plan_week(self, state: SimulationState) -> SimulationLevers:
        """Kip's choice for the coming week. Coordinate descent over the lever
        dimensions (each scored by rolling the choice out to the horizon and
        continuing prudently), so a full plan stays well under a second."""
        if state.finished:
            return self.prudent_levers(state)
        dims = [("pm", SOLVER_PRICE_MULTS), ("hire", SOLVER_HIRES), ("sub_set", self._sub_sets()),
                ("ad_mult", SOLVER_AD_MULTS), ("cover", SOLVER_STOCK_COVERS)]
        cur = {"pm": 1.0, "ad_mult": 0.0, "hire": 0, "sub_set": [], "cover": 1.0}

        def value(params):
            return self._rollout_value(self._lever_from_params(state, **params), state)

        best_key = value(cur)
        for _ in range(SOLVER_PASSES):
            improved = False
            for dim, options in dims:
                for opt in options:
                    if opt == cur[dim]:
                        continue
                    trial = {**cur, dim: opt}
                    key = value(trial)
                    if key > best_key:
                        best_key, cur, improved = key, trial, True
            if not improved:
                break
        return self._lever_from_params(state, **cur)

    def autopilot(self, state: SimulationState):
        """Play every remaining week with plan_week. Yields (levers, trace, state)."""
        while not state.finished:
            levers = self.plan_week(state)
            trace, state = self.step(state, levers)
            yield levers, trace, state

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
