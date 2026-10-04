"""
KIP High-Fidelity Multi-Week Simulation Engine
===============================================
A lightweight, offline-first, **deterministic** state machine (sprint:
business_simulation_new_engine.docx). It takes one business idea's static
viability baseline (D, F, C, R, E, S, A) plus its global unit economics, applies
5 user-controlled levers, and simulates an n-week horizon (n=4 by default),
mutating the core viability variables into a compiled session score V_simulated.

Pure Python: depends only on the stdlib and viability_engine (no DB / API /
Anthropic / Chroma), so it is fully unit-testable in isolation.

────────────────────────────────────────────────────────────────────────────
DOCUMENTED INTERPRETATIONS (the sprint doc is precise on formulas but leaves a
few quantities to engineering judgement; each choice is commented inline too):

1. Marketing multiplier M_m IS applied to weekly demand D_w. The doc defines
   M_m as "expands top-of-funnel buyer volume (N)", but its inline D_w formula
   omits it. Omitting it would make the ad_spend lever inert, so M_m is included.
2. `price` lever is compared against the core product's baseline price P
   (average_unit_price) in the elasticity term M_p = (P / price)^β.
3. Portfolio blend (for M_mix and realized revenue/COGS) is an EQUAL-WEIGHT mean
   across the core product + the selected sub-products.
4. Base workforce before `staffing_change` is 1 (owner-operator).
5. `stock_ordered` is units available PER WEEK (the bottleneck cap each week).
6. Initial Cash AC = the requester's capital_available; if that is None
   (limitless) or <=0, fall back to capital_required, then to a small positive
   floor, so the Ending/Initial cash ratios never divide by zero.
7. Environmental shocks are seeded (seed => reproducible), magnitude scaled by
   the idea's environmental_risk_score — "deterministic given a seed".
8. (1+g)^t market growth uses t in YEARS = (week-1)/52, so a 4-week horizon
   doesn't explode an annual CAGR into a weekly one.
9. E_compiled is the FINAL week's E (the doc says E is a learning curve, "not a
   passive average"); R_compiled is the mean of weekly R_w (the doc says so).
"""
from __future__ import annotations

import json
import math
import os
import random
from dataclasses import dataclass, field
from typing import Optional

from app.services import viability_engine as ve

_BENCHMARKS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "industry_benchmarks.json")
_benchmarks_cache: Optional[dict] = None

# ── Tunable model constants (documented above) ──────────────────────────────
BASE_STAFF = 1                 # owner-operator baseline before staffing_change
DEFAULT_HORIZON_WEEKS = 4
LIQUIDITY_CRITICAL = 1.50      # LR_w below this = a "crunch" week (doc)
SCORE_FLOOR, SCORE_CEIL = 1.0, 10.0
# Shock model: per week, a shock hits with probability (risk/10 * BASE_SHOCK_PROB)
# and destroys up to MAX_SHOCK_FRACTION of standing inventory, scaled by risk.
BASE_SHOCK_PROB = 0.60
MAX_SHOCK_FRACTION = 0.40


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


# ── Inputs ──────────────────────────────────────────────────────────────────
@dataclass
class SimulationLevers:
    """The 5 user-controlled levers (sprint PART 2). Set once; held across the
    n-week horizon."""
    price: float                           # selling price the user sets per unit
    ad_spend: float = 0.0                  # weekly marketing spend (ZMW)
    product_mix_selections: list = field(default_factory=list)  # list of sub-product dicts
    stock_ordered: int = 0                 # inventory units available per week
    staffing_change: int = 0               # delta to the owner-operator baseline


@dataclass
class IdeaBaseline:
    """One idea's static viability baseline + global unit economics. Assembled
    from the three permanent tables: D/F from idea_global_factors, C/E/R/S/A from
    the winner's user_session_factors row, and the economics/sub-products from
    idea_global_factors + business_ideas."""
    category: Optional[str]
    # Static viability sub-scores (0-10)
    D: float
    F: float
    C: float
    R: float
    E: float
    S: float
    A: float
    # Global unit economics
    total_target_buyers: float             # N
    consumption_frequency_per_year: float  # Q
    average_unit_price: float              # P (core product baseline price)
    monthly_revenue_estimate: float
    cost_of_goods_sold_monthly: float
    capital_required: Optional[float]
    capital_available: Optional[float]     # AC source; None == limitless
    environmental_risk_score: float = 5.0  # 1-10, higher = more exposed
    allowed_sub_products: list = field(default_factory=list)

    @property
    def baseline_gross_margin(self) -> float:
        """Static target margin of the core blueprint (same basis as F): used as
        the M_mix denominator and to derive the core product's wholesale cost."""
        m = _safe_div(
            (self.monthly_revenue_estimate or 0) - (self.cost_of_goods_sold_monthly or 0),
            self.monthly_revenue_estimate or 0,
            default=0.0,
        )
        # Fall back to F/10 if revenue economics are missing; keep it positive so
        # it can be an M_mix denominator.
        if m <= 0:
            m = _safe_div(self.F, 10.0, default=0.30) or 0.30
        return m


# ── Output ──────────────────────────────────────────────────────────────────
@dataclass
class WeekTrace:
    week: int
    D_w: float          # gross demand units (walk-ins)
    D_r: float          # realized/served demand units (after bottlenecks)
    staff_capacity: float
    LSI: float          # labor strain index
    net_cash_flow: float
    cash_balance: float
    R_w: float          # dynamic weekly risk score
    E: float            # execution fit entering the week
    loss_ratio: float   # L this week
    liquidity_ratio: float
    in_crunch: bool

    def to_dict(self) -> dict:
        return {
            "week": self.week,
            "gross_demand": round(self.D_w, 2),
            "served_demand": round(self.D_r, 2),
            "staff_capacity": round(self.staff_capacity, 2),
            "labor_strain_index": round(self.LSI, 3),
            "net_cash_flow": round(self.net_cash_flow, 2),
            "cash_balance": round(self.cash_balance, 2),
            "risk_score": round(self.R_w, 2),
            "execution_fit": round(self.E, 2),
            "loss_ratio": round(self.loss_ratio, 3),
            "liquidity_ratio": round(self.liquidity_ratio, 2),
            "in_crunch": self.in_crunch,
        }


@dataclass
class SimulationResult:
    horizon_weeks: int
    # Compiled, clamped [1,10] scores
    D_compiled: float
    F_compiled: float
    C_compiled: float
    E_compiled: float
    R_compiled: float
    S_compiled: float
    A_compiled: float
    V_simulated: float
    V_baseline: float
    # Session cash summary
    initial_cash: float
    ending_cash: float
    weeks_in_crunch: int
    weekly_trace: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "horizon_weeks": self.horizon_weeks,
            "compiled_scores": {
                "D": self.D_compiled, "F": self.F_compiled, "C": self.C_compiled,
                "E": self.E_compiled, "R": self.R_compiled, "S": self.S_compiled,
                "A": self.A_compiled,
            },
            "viability_simulated": self.V_simulated,
            "viability_baseline": self.V_baseline,
            "initial_cash": round(self.initial_cash, 2),
            "ending_cash": round(self.ending_cash, 2),
            "weeks_in_crunch": self.weeks_in_crunch,
            "weekly_trace": [w.to_dict() for w in self.weekly_trace],
        }


# ── The state machine ────────────────────────────────────────────────────────
class SimulationEngine:
    def __init__(self, baseline: IdeaBaseline, horizon_weeks: int = DEFAULT_HORIZON_WEEKS,
                 seed: Optional[int] = None, benchmarks: Optional[dict] = None):
        self.b = baseline
        self.n = max(1, int(horizon_weeks or DEFAULT_HORIZON_WEEKS))
        self.bench = benchmarks if benchmarks is not None else get_benchmark(baseline.category)
        self.rng = random.Random(seed)

    # ---- Lever coupling multipliers (sprint PART 2) -------------------------
    def _price_elasticity(self, price: float) -> float:
        """M_p = (P / price)^β. Raising price above baseline P shrinks N."""
        P = self.b.average_unit_price or 0
        beta = self.bench["base_elasticity"]
        if price <= 0 or P <= 0:
            return 1.0
        return (P / price) ** beta

    def _marketing_expansion(self, ad_spend: float) -> float:
        """M_m = 1 + ln(1 + ad_spend/k) * (A/10) — diminishing returns on spend,
        amplified by the idea's asset score A."""
        k = self.bench["diminishing_returns_marketing_scale_k"] or 1.0
        return 1.0 + math.log(1.0 + _safe_div(ad_spend, k)) * (self.b.A / 10.0)

    def _portfolio(self, selections: list) -> tuple[float, float, float, float]:
        """Equal-weight blend of core + selected sub-products.
        Returns (blended_unit_price, blended_unit_cost, M_mix, demand_mix_expansion)."""
        P = self.b.average_unit_price or 0
        core_cost = P * (1.0 - self.b.baseline_gross_margin)
        prices = [P]
        costs = [core_cost]
        demand_boost = 0.0
        for s in (selections or []):
            prices.append(float(s.get("suggested_price") or 0))
            costs.append(float(s.get("base_cost") or 0))
            demand_boost += float(s.get("demand_expansion_factor") or 0)

        blended_price = _safe_div(sum(prices), len(prices), default=P)
        blended_cost = _safe_div(sum(costs), len(costs), default=core_cost)
        # M_mix = blended portfolio gross margin% / baseline global gross margin%
        blended_margin = _safe_div(sum(prices) - sum(costs), sum(prices), default=0.0)
        m_mix = _safe_div(blended_margin, self.b.baseline_gross_margin, default=1.0) or 1.0
        demand_mix_expansion = 1.0 + demand_boost
        return blended_price, blended_cost, m_mix, demand_mix_expansion

    def _staff_capacity(self, staff_count: int, E_w: float) -> float:
        """Staff capacity = staff_count * base_worker_throughput_weekly * (E/10)."""
        throughput = self.bench["base_worker_throughput_weekly"]
        return max(0.0, staff_count) * throughput * (E_w / 10.0)

    def _env_shock_loss_ratio(self) -> float:
        """Randomized sector shock → Realized Loss Ratio L (fraction of standing
        inventory lost). Probability and magnitude scale with environmental risk."""
        risk = max(0.0, min(10.0, self.b.environmental_risk_score or 5.0))
        if self.rng.random() > (risk / 10.0) * BASE_SHOCK_PROB:
            return 0.0  # no shock this week
        return self.rng.random() * MAX_SHOCK_FRACTION * (risk / 10.0)

    # ---- Execution-fit learning curve (sprint PART 3.2) ---------------------
    @staticmethod
    def _next_execution_fit(E_w: float, LSI: float) -> float:
        if LSI < 0.8:                                    # Idle: skills atrophy slowly
            return max(1.0, E_w - 0.05)
        if LSI <= 1.25:                                  # Learning: productive stretch
            return min(10.0, E_w + 0.3 * math.log(1.0 + LSI))
        return max(1.0, E_w - 0.5 * (LSI - 1.25) ** 2)   # Burnout: strain destroys E

    # ---- Resolve Initial Cash AC (interpretation #6) ------------------------
    def _initial_cash(self) -> float:
        ca = self.b.capital_available
        if ca is not None and ca > 0:
            return float(ca)
        if self.b.capital_required and self.b.capital_required > 0:
            return float(self.b.capital_required)
        return 1.0  # positive floor so Ending/Initial ratios are safe

    # ---- Main loop ----------------------------------------------------------
    def run(self, levers: SimulationLevers) -> SimulationResult:
        b = self.b
        staff_count = max(0, BASE_STAFF + int(levers.staffing_change or 0))
        AC = self._initial_cash()

        # Lever-derived constants held across the horizon.
        M_p = self._price_elasticity(levers.price)
        M_m = self._marketing_expansion(levers.ad_spend)
        blended_price, blended_cost, M_mix, demand_mix = self._portfolio(levers.product_mix_selections)

        g = ve.get_cagr(b.category)
        N_w_base = _safe_div((b.total_target_buyers or 0) * (b.consumption_frequency_per_year or 0), 52.0)

        rent = self.bench["fixed_weekly_rent_baseline"]
        wages = staff_count * self.bench["weekly_wage_per_worker"]
        ad = max(0.0, float(levers.ad_spend or 0.0))
        waste_penalty = self.bench["unsold_waste_penalty_per_unit"]
        committed_overheads = rent + wages + ad  # fixed weekly costs (for liquidity)

        cash = AC
        E_w = b.E
        sum_D_w = sum_D_r = cum_revenue = cum_cogs = 0.0
        R_weeks: list[float] = []
        weeks_in_crunch = 0
        trace: list[WeekTrace] = []

        for week in range(1, self.n + 1):
            t_years = (week - 1) / 52.0
            market_growth = (1.0 + g) ** t_years

            # Gross demand (walk-ins) — interpretation #1 includes M_m.
            D_w = N_w_base * market_growth * M_m * demand_mix * M_p

            staff_capacity = self._staff_capacity(staff_count, E_w)
            # Bottleneck: served = min(demand, stock available, staff capacity).
            D_r = min(D_w, max(0.0, levers.stock_ordered), staff_capacity)

            # Labor strain drives the execution-fit learning curve.
            LSI = _safe_div(D_w, staff_capacity, default=float("inf") if D_w > 0 else 0.0)

            # Environmental shock on standing inventory.
            L = self._env_shock_loss_ratio()
            units_lost = L * max(0.0, levers.stock_ordered)
            unsold = max(0.0, levers.stock_ordered - D_r - units_lost)

            # Weekly cash settlement (sprint PART 3.4).
            revenue = D_r * blended_price
            cogs = D_r * blended_cost
            loss_cost = units_lost * blended_cost           # destroyed inventory you paid for
            waste_cost = unsold * waste_penalty             # over-stock carrying penalty
            net_cash = revenue - (cogs + rent + wages + ad + waste_cost + loss_cost)
            cash += net_cash

            # Dynamic weekly risk (sprint PART 3.1): high score = safe.
            R_w = (b.R * M_mix) * (1.0 - L)
            R_weeks.append(R_w)

            # Liquidity cushion vs next week's committed overheads (sprint PART 3.4).
            LR = _safe_div(cash, committed_overheads, default=float("inf"))
            in_crunch = LR < LIQUIDITY_CRITICAL
            if in_crunch:
                weeks_in_crunch += 1

            cum_revenue += revenue
            cum_cogs += cogs
            sum_D_w += D_w
            sum_D_r += D_r

            trace.append(WeekTrace(
                week=week, D_w=D_w, D_r=D_r, staff_capacity=staff_capacity,
                LSI=(LSI if math.isfinite(LSI) else 999.0), net_cash_flow=net_cash,
                cash_balance=cash, R_w=R_w, E=E_w, loss_ratio=L,
                liquidity_ratio=(LR if math.isfinite(LR) else 999.0), in_crunch=in_crunch,
            ))

            # Advance execution fit into next week.
            E_w = self._next_execution_fit(E_w, LSI if math.isfinite(LSI) else 2.0)

        # ── Compile the session scores (sprint PART 3) ──────────────────────
        ending_cash = cash
        cash_ratio = _safe_div(ending_cash, AC, default=0.0)

        D_compiled = _clamp(b.D * _safe_div(sum_D_r, sum_D_w, default=0.0))
        F_compiled = _clamp((_safe_div(cum_revenue - cum_cogs, cum_revenue, default=0.0) * 10.0) * cash_ratio)
        C_compiled = _clamp((b.C * cash_ratio) - (weeks_in_crunch * 1.5))
        R_compiled = _clamp(_safe_div(sum(R_weeks), len(R_weeks), default=b.R))
        E_compiled = _clamp(E_w)             # final week's E (not an average)
        S_compiled = _clamp(b.S)             # static pass-through
        A_compiled = _clamp(b.A)             # static pass-through

        V_simulated = ve.calculate_viability(
            D=D_compiled, F=F_compiled, C=C_compiled, E=E_compiled,
            R=R_compiled, S=S_compiled, A=A_compiled,
        )
        V_baseline = ve.calculate_viability(
            D=b.D, F=b.F, C=b.C, E=b.E, R=b.R, S=b.S, A=b.A,
        )

        return SimulationResult(
            horizon_weeks=self.n,
            D_compiled=D_compiled, F_compiled=F_compiled, C_compiled=C_compiled,
            E_compiled=E_compiled, R_compiled=R_compiled, S_compiled=S_compiled,
            A_compiled=A_compiled, V_simulated=V_simulated, V_baseline=V_baseline,
            initial_cash=AC, ending_cash=ending_cash, weeks_in_crunch=weeks_in_crunch,
            weekly_trace=trace,
        )
