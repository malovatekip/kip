"""
Unit tests for the multi-week simulation engine (market/operations model v2).

Covers determinism, the working-capital limit, spoilage, onboarding, score
bounds, backwards-compatible state loading, and the calibration targets that
keep the game fair: sensible play lands near the static baseline, skilled play
beats it, and reckless play (overstocking, price gouging, firing everyone,
ads with nothing to sell) falls below it.

Runs under pytest, or directly: `python tests/test_simulation_engine.py`.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import viability_engine as ve
from app.services.simulation_engine import (
    SimulationEngine, SimulationLevers, SimulationState, IdeaBaseline, CORE_KEY,
)

SEEDS = range(1, 13)


# ── Fixtures ────────────────────────────────────────────────────────────────
def agri_idea() -> IdeaBaseline:
    revenue = 100_000.0
    return IdeaBaseline(
        category="agriculture", D=10.0, F=6.99, C=5.0, E=5.0, R=5.0, S=5.0, A=5.0,
        total_target_buyers=800.0, consumption_frequency_per_year=48.0, average_unit_price=180.0,
        monthly_revenue_estimate=revenue, cost_of_goods_sold_monthly=revenue * 54.23 / 180.0,
        capital_required=3000.0, capital_available=None, environmental_risk_score=5.0,
        allowed_sub_products=[
            {"sub_product_name": "Bread", "base_cost": 25, "suggested_price": 45, "demand_expansion_factor": 0.08},
            {"sub_product_name": "Honey", "base_cost": 40, "suggested_price": 70, "demand_expansion_factor": 0.1},
        ],
        operational_risks=["Drought", "Pest outbreak"],
    )


def retail_idea() -> IdeaBaseline:
    D, _ = ve.calculate_demand(1500, 52, 25, "retail_and_trade")
    return IdeaBaseline(
        category="retail_and_trade", D=D, F=ve.calculate_financial(100, 72), C=8.0, E=6.0, R=6.0, S=5.0, A=6.0,
        total_target_buyers=1500, consumption_frequency_per_year=52, average_unit_price=25,
        monthly_revenue_estimate=100, cost_of_goods_sold_monthly=72,
        capital_required=10000, capital_available=8000, environmental_risk_score=4.0,
        allowed_sub_products=[
            {"sub_product_name": "Cooking oil", "base_cost": 40, "suggested_price": 52, "demand_expansion_factor": 0.06},
        ],
        operational_risks=["Supplier price hike", "Theft"],
    )


def services_idea() -> IdeaBaseline:
    D, _ = ve.calculate_demand(400, 12, 80, "services_and_care")
    return IdeaBaseline(
        category="services_and_care", D=D, F=ve.calculate_financial(100, 25), C=6.0, E=7.0, R=6.0, S=6.0, A=5.0,
        total_target_buyers=400, consumption_frequency_per_year=12, average_unit_price=80,
        monthly_revenue_estimate=100, cost_of_goods_sold_monthly=25,
        capital_required=6000, capital_available=4000, environmental_risk_score=3.0,
        allowed_sub_products=[
            {"sub_product_name": "Hair products", "base_cost": 30, "suggested_price": 55, "demand_expansion_factor": 0.05},
        ],
        operational_risks=["Power outage"],
    )


FIXTURES = [agri_idea, retail_idea, services_idea]


# ── Strategies ──────────────────────────────────────────────────────────────
def _capacity(eng, st, staff):
    return staff * eng.bench["base_worker_throughput_weekly"] * st.E_w / 10.0


def prudent(eng, st):
    """Baseline price, no ads, stock what the forecast says and cash allows."""
    b = eng.b
    budget = eng.purchase_budget(st) - st.staff_count * eng.bench["weekly_wage_per_worker"]
    need = max(0.0, min(eng.forecast_demand(st), _capacity(eng, st, st.staff_count)) - st.inventory.get(CORE_KEY, 0))
    return SimulationLevers(price=b.average_unit_price,
                            stock_ordered=int(math.floor(min(need, max(0.0, budget) / b.core_unit_cost))))


def skilled(eng, st):
    """Small price rise, modest ads, best-margin sub-product, hire when overloaded, payroll reserve kept."""
    b, bench = eng.b, eng.bench
    price = b.average_unit_price * 1.05
    ad = min(0.08 * eng.purchase_budget(st), bench["diminishing_returns_marketing_scale_k"])
    sub = dict(max(b.allowed_sub_products,
                   key=lambda s: (s["suggested_price"] - s["base_cost"]) / s["suggested_price"]))
    mix = 1.0 + sub["demand_expansion_factor"]
    demand = eng.forecast_demand(st, price=price, ad_spend=ad, mix_expansion=mix)
    wage = bench["weekly_wage_per_worker"]
    hire = 0
    while demand > _capacity(eng, st, st.staff_count + 0.5 * hire) and hire < 5 \
            and eng.purchase_budget(st) > (hire + 1) * wage * 3:
        hire += 1
    target = min(demand, _capacity(eng, st, st.staff_count + 0.5 * hire)) * 1.03 - sum(st.inventory.values())
    target = max(0.0, target)
    sub_units, core_units = target * (mix - 1) / mix, target / mix
    budget = eng.purchase_budget(st, ad) - (st.staff_count + hire) * wage - 0.5 * bench["fixed_weekly_rent_baseline"]
    cost = core_units * b.core_unit_cost + sub_units * sub["base_cost"]
    if cost > max(0.0, budget) and cost > 0:
        f = max(0.0, budget) / cost
        core_units, sub_units = core_units * f, sub_units * f
    sub["units"] = int(sub_units)
    return SimulationLevers(price=price, ad_spend=ad, stock_ordered=int(core_units), staffing_change=hire,
                            product_mix_selections=[sub] if sub["units"] > 0 else [])


def overstock(eng, st):
    return SimulationLevers(price=eng.b.average_unit_price, stock_ordered=int(eng.forecast_demand(st) * 10))


def gouge(eng, st):
    return SimulationLevers(price=eng.b.average_unit_price * 2, stock_ordered=int(eng.forecast_demand(st)))


def ads_no_stock(eng, st):
    return SimulationLevers(price=eng.b.average_unit_price, ad_spend=max(0.0, st.cash * 0.8), stock_ordered=0)


def fire_everyone(eng, st):
    return SimulationLevers(price=eng.b.average_unit_price, stock_ordered=int(eng.forecast_demand(st)),
                            staffing_change=-st.staff_count)


def play(idea, policy, seed):
    eng = SimulationEngine(idea, horizon_weeks=4, seed=seed)
    st = eng.start()
    traces = []
    for _ in range(4):
        t, st = eng.step(st, policy(eng, st))
        traces.append(t)
    return eng.compile(st), traces, st


def mean_v(idea, policy):
    return sum(play(idea, policy, s)[0].V_simulated for s in SEEDS) / len(SEEDS)


def baseline_v(idea):
    eng = SimulationEngine(idea, seed=1)
    return eng.compile(eng.start()).V_baseline


# ── Mechanics ───────────────────────────────────────────────────────────────
def test_same_seed_same_result():
    a = play(agri_idea(), skilled, 42)[0].to_dict()
    b = play(agri_idea(), skilled, 42)[0].to_dict()
    assert a == b


def test_week_zero_compiles_to_baseline():
    eng = SimulationEngine(agri_idea(), seed=1)
    r = eng.compile(eng.start())
    assert r.V_simulated == r.V_baseline == 6.65


def test_purchases_never_exceed_cash_budget():
    for fixture in FIXTURES:
        for seed in SEEDS:
            eng = SimulationEngine(fixture(), seed=seed)
            st = eng.start()
            for _ in range(4):
                budget = eng.purchase_budget(st)
                t, st = eng.step(st, overstock(eng, st))
                assert t.procurement <= budget + 1e-6


def test_over_budget_order_is_scaled_pro_rata():
    idea = agri_idea()
    eng = SimulationEngine(idea, seed=1)
    st = eng.start()
    sub = dict(idea.allowed_sub_products[0], units=1000)
    t, _ = eng.step(st, SimulationLevers(price=180, stock_ordered=1000, product_mix_selections=[sub]))
    assert t.order_capped
    assert t.units_requested == 2000
    assert t.units_bought < 2000
    assert t.procurement <= eng.purchase_budget(st) + 1e-6
    assert any(a["kind"] == "order_capped" for a in t.advice)


def test_unsold_perishables_spoil():
    eng = SimulationEngine(agri_idea(), seed=1)
    st = eng.start()
    st.cash = 1_000_000.0
    t, st2 = eng.step(st, SimulationLevers(price=180, stock_ordered=2000))
    rate = eng.bench["spoilage_rate_weekly"]
    left_after_sales = 2000 - t.D_r - t.units_lost
    assert math.isclose(t.units_spoiled, left_after_sales * rate, rel_tol=1e-6)
    assert math.isclose(st2.inventory[CORE_KEY], left_after_sales * (1 - rate), rel_tol=1e-6)
    assert t.net_profit < t.revenue - t.cogs   # spoilage is a cost


def test_new_hires_work_half_speed_first_week():
    eng = SimulationEngine(agri_idea(), seed=1)
    st = eng.start()
    t, _ = eng.step(st, SimulationLevers(price=180, stock_ordered=10, staffing_change=2))
    per_worker = eng.bench["base_worker_throughput_weekly"] * st.E_w / 10.0
    assert math.isclose(t.staff_capacity, 2.0 * per_worker)   # 1 existing + 2 hires at 50%


def test_firing_costs_severance():
    eng = SimulationEngine(retail_idea(), seed=1)
    st = eng.start()
    st.staff_count = 3
    t, _ = eng.step(st, SimulationLevers(price=25, stock_ordered=10, staffing_change=-2))
    assert t.severance == 2 * eng.bench["weekly_wage_per_worker"]


def test_stockouts_damage_goodwill_and_full_service_builds_it():
    eng = SimulationEngine(agri_idea(), seed=1)
    st = eng.start()
    st.cash = 1_000_000.0
    starved, _ = eng.step(st, SimulationLevers(price=180, stock_ordered=1))
    served, _ = eng.step(st, SimulationLevers(price=180, stock_ordered=int(eng.forecast_demand(st) * 1.1)))
    assert starved.goodwill < 1.0 < served.goodwill


def test_scores_stay_in_band():
    for fixture in FIXTURES:
        for policy in (prudent, skilled, overstock, gouge, ads_no_stock, fire_everyone):
            r = play(fixture(), policy, 3)[0]
            for v in r.scores.values():
                assert 1.0 <= v <= 10.0


def test_pre_v2_state_dict_still_loads_and_plays():
    eng = SimulationEngine(agri_idea(), seed=5)
    old = eng.start().to_dict()
    for k in ("awareness", "ref_awareness", "goodwill", "w_served", "w_demand", "w_ref_demand",
              "cum_procurement", "cum_spoil_cost", "cum_loss_cost", "overdrawn_weeks", "product_lines_max"):
        old.pop(k)
    old["some_future_field"] = 1
    st = SimulationState.from_dict(old)
    t, st = eng.step(st, SimulationLevers(price=180, stock_ordered=20))
    assert st.week == 1 and st.awareness is not None


# ── Calibration: fair, beatable, not exploitable ────────────────────────────
def test_prudent_play_lands_near_baseline():
    for fixture in FIXTURES:
        idea = fixture()
        assert abs(mean_v(idea, prudent) - baseline_v(idea)) <= 0.35, idea.category


def test_skilled_play_beats_baseline_and_prudent():
    for fixture in FIXTURES:
        idea = fixture()
        skilled_v = mean_v(idea, skilled)
        assert skilled_v > baseline_v(idea), idea.category
        assert skilled_v > mean_v(idea, prudent), idea.category


def test_reckless_play_falls_below_baseline():
    for fixture in FIXTURES:
        idea = fixture()
        base = baseline_v(idea)
        for policy in (overstock, gouge, ads_no_stock, fire_everyone):
            assert mean_v(idea, policy) < base, (idea.category, policy.__name__)


def test_old_overorder_exploit_no_longer_wins():
    """The v1 winner (price 300, 300 units of core + 2 subs each week, 2 hires) beat
    baseline by 1.4 points by buying K48k of stock on K3k of cash."""
    idea = agri_idea()
    subs = [dict(s, units=300) for s in idea.allowed_sub_products]
    lev = SimulationLevers(price=300, ad_spend=150, stock_ordered=300, staffing_change=2,
                           product_mix_selections=subs)
    exploit = sum(SimulationEngine(idea, seed=s).run(lev).V_simulated for s in SEEDS) / len(SEEDS)
    assert exploit < baseline_v(idea)
    assert exploit < mean_v(idea, skilled)


if __name__ == "__main__":
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"PASS {name}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {name}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
