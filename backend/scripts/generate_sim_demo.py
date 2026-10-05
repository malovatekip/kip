"""
Regenerate frontend/src/components/simulation/demoSession.json from the real
simulation engine, so /simulate/demo replays what the backend would return.

No database needed: the Kabulonga Green Basket baseline is built in code and the
payloads come from simulation_session.build_view (the same builder the API uses).
Each week's levers follow a sensible operator: price a little above baseline,
modest ads, the best-margin sub-product, stock for the forecast demand the team
can serve, a hire when demand outgrows capacity, and a payroll reserve kept back.

    cd backend && python scripts/generate_sim_demo.py
"""
import json
import math
import os
import sys

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

from app.services.simulation_engine import SimulationEngine, SimulationLevers, IdeaBaseline, CORE_KEY  # noqa: E402
from app.services.simulation_session import build_view  # noqa: E402

OUT = os.path.join(BACKEND, "..", "frontend", "src", "components", "simulation", "demoSession.json")
SEED = 7
IDEA = {"id": 1, "name": "Kabulonga Green Basket", "category": "agriculture"}
SUB_PRODUCTS = [
    {"sub_product_name": "Free-range eggs (tray of 30)", "base_cost": 65, "suggested_price": 95, "demand_expansion_factor": 0.12},
    {"sub_product_name": "Artisan sourdough bread loaf", "base_cost": 25, "suggested_price": 45, "demand_expansion_factor": 0.08},
    {"sub_product_name": "Cold-pressed sunflower oil (500ml)", "base_cost": 35, "suggested_price": 60, "demand_expansion_factor": 0.07},
    {"sub_product_name": "Homemade herb-infused honey (350g)", "base_cost": 40, "suggested_price": 70, "demand_expansion_factor": 0.1},
]


def baseline() -> IdeaBaseline:
    revenue = 100_000.0
    return IdeaBaseline(
        category="agriculture", D=10.0, F=6.99, C=5.0, E=5.0, R=5.0, S=5.0, A=5.0,
        total_target_buyers=800.0, consumption_frequency_per_year=48.0, average_unit_price=180.0,
        monthly_revenue_estimate=revenue, cost_of_goods_sold_monthly=revenue * 54.23 / 180.0,
        capital_required=3000.0, capital_available=None, environmental_risk_score=5.0,
        allowed_sub_products=SUB_PRODUCTS,
        operational_risks=["Drought hits supplier farms", "Pest outbreak", "Market flooded with cheap produce"],
    )


def sensible_levers(engine: SimulationEngine, state) -> dict:
    b, bench = engine.b, engine.bench
    price = round(b.average_unit_price * 1.05)
    ad = round(min(0.05 * engine.purchase_budget(state), 0.3 * bench["diminishing_returns_marketing_scale_k"]) / 10) * 10
    sub = dict(SUB_PRODUCTS[1])                       # bread: cheapest, best cash turnover
    mix = 1.0 + sub["demand_expansion_factor"]
    demand = engine.forecast_demand(state, price=price, ad_spend=ad, mix_expansion=mix)
    wage = bench["weekly_wage_per_worker"]
    throughput = bench["base_worker_throughput_weekly"] * state.E_w / 10.0
    hire = 1 if demand > state.staff_count * throughput and state.cash > 6 * wage else 0
    capacity = (state.staff_count + 0.5 * hire) * throughput
    budget = engine.purchase_budget(state, ad) - (state.staff_count + hire) * wage
    target = max(0.0, min(demand, capacity) - sum(state.inventory.values()))
    sub_units = target * (mix - 1.0) / mix
    core_units = target - sub_units
    cost = core_units * b.core_unit_cost + sub_units * sub["base_cost"]
    if cost > budget > 0:
        core_units, sub_units = core_units * budget / cost, sub_units * budget / cost
    sub["units"] = int(math.floor(sub_units))
    return {"price": price, "ad_spend": ad, "stock_ordered": int(math.floor(core_units)),
            "staffing_change": hire, "product_mix_selections": [sub] if sub["units"] > 0 else []}


def main():
    engine = SimulationEngine(baseline(), horizon_weeks=4, seed=SEED)
    state = engine.start()
    history, weeks = [], []

    def view(status):
        return build_view(engine, state, session_id=1, status=status, current_week=state.week,
                          horizon_weeks=engine.n, idea=IDEA, weeks=list(weeks), lever_history=list(history))

    start = view("in_progress")
    plays = []
    for _ in range(engine.n):
        levers = sensible_levers(engine, state)
        trace, state = engine.step(state, SimulationLevers(**levers))
        history.append(levers)
        weeks.append(trace.to_dict())
        plays.append({"levers": levers, "week": weeks[-1],
                      "session": view("completed" if state.finished else "in_progress")})
        print(f"week {trace.week}: V={trace.running_viability} cash={trace.cash_balance:,.0f} "
              f"served={trace.D_r:.0f}/{trace.D_w:.0f} shock={trace.shock_name}{' (hit)' if trace.shock_hit else ''}")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"start": start, "plays": plays}, f, indent=1)
    print(f"baseline V={start['viability_baseline']}  final V={plays[-1]['session']['running_viability']}")
    print("wrote", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
