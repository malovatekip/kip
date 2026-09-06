"""
K-BIG-2 Viability Engine
=========================
Implements the 7-variable weighted viability formula from the k-big-2 sprint:

    V = 0.25D + 0.20F + 0.15C + 0.15E + 0.10R + 0.10S + 0.05A

Every sub-score is normalized to a 0-10 scale before weighting, so V itself
lands on 0-10 (the weights sum to 1.00).

D, F, C are computed here with plain arithmetic from an idea's stored
financial/market fields. E, R, S, A are qualitative bands the sprint doc
defines by description (e.g. "9-10 monopolistic tendencies... 5-8 fragmented
market... 1-4 red ocean") -- for a *newly generated* idea, Claude scores
these itself as part of the same structured-output call that creates the
idea (see kip_prompt_v2.py). For an *existing* idea being re-ranked against a
different requester's profile, `estimate_execution_fit` /
`estimate_asset_location_fit` below provide a fast heuristic proxy for E/A
(S and R are market-intrinsic to the idea, not the requester, so the
originally-generated values are reused unchanged).
"""
import json
import math
import os

_CAGR_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "category_cagr.json")
_cagr_cache = None


def _load_cagr_data() -> dict:
    global _cagr_cache
    if _cagr_cache is None:
        with open(_CAGR_PATH, "r", encoding="utf-8") as f:
            _cagr_cache = json.load(f)
    return _cagr_cache


def get_cagr(category: str = None) -> float:
    """Category CAGR (g), manually maintained in category_cagr.json."""
    data = _load_cagr_data()
    categories = data.get("categories", {})
    if category and category in categories:
        return categories[category]
    return categories.get("default", 0.06)


def get_demand_reference_max() -> float:
    """The annual-demand figure (Kwacha) considered 'excellent' for a
    Zambian micro/small business -- the calibration constant for
    normalizing raw Demand into a 0-10 score. See category_cagr.json."""
    data = _load_cagr_data()
    return data.get("_demand_normalization", {}).get("reference_max", 5_000_000)


def calculate_demand(
    total_target_buyers: float,
    consumption_frequency_per_year: float,
    average_unit_price: float,
    category: str = None,
    cagr: float = None,
    years_ahead: int = 0,
) -> tuple[float, float]:
    """
    D = N*Q*P*(1+g)^t

    Returns (demand_score_0_10, raw_demand_kwacha). At generation time t=0
    (base/current year), so raw demand reduces to N*Q*P; g/t are stored on
    the idea for future multi-year re-projection.
    """
    N = total_target_buyers or 0
    Q = consumption_frequency_per_year or 0
    P = average_unit_price or 0
    g = cagr if cagr is not None else get_cagr(category)
    raw_demand = N * Q * P * ((1 + g) ** years_ahead)

    if raw_demand <= 0:
        return 0.0, raw_demand

    reference_max = get_demand_reference_max()
    score = min(10.0, math.log10(raw_demand + 1) / math.log10(reference_max) * 10)
    return round(max(0.0, score), 2), raw_demand


def calculate_financial(total_revenue: float, cost_of_goods_sold: float) -> float:
    """F = gross_profit_margin% * 10, where margin = ((revenue - COGS) / revenue) * 100."""
    if not total_revenue or total_revenue <= 0:
        return 0.0
    margin_pct = ((total_revenue - (cost_of_goods_sold or 0)) / total_revenue) * 100
    score = (margin_pct / 100) * 10
    return round(max(0.0, min(10.0, score)), 2)


def calculate_capital_fit(capital_available: float, capital_required: float) -> float:
    """C = (CA / CR) * 10. `capital_available=None` means the user marked
    their capital as limitless (skipped Slide 1, no future loan/grant
    expected either) -- treated as a perfect capital fit."""
    if capital_available is None:
        return 10.0
    if not capital_required or capital_required <= 0:
        return 10.0
    score = (capital_available / capital_required) * 10
    return round(max(0.0, min(10.0, score)), 2)


def estimate_execution_fit(required_skills, user_skills, time_commitment: str = None) -> float:
    """
    Heuristic proxy for E (Execution Fit) when re-scoring an existing idea
    against a *different* requester than the one it was generated for.
    Bands per the sprint doc: 9-10 perfect alignment, 5-8 learning curve,
    1-4 mismatch. Approximated here via required/held skill overlap.
    """
    required = {s.strip().lower() for s in (required_skills or []) if s}
    if not required:
        return 7.0  # no specific skill requirement -> moderate default alignment
    have = {s.strip().lower() for s in (user_skills or []) if s}
    overlap = len(required & have) / len(required)
    return round(1 + overlap * 9, 2)


def estimate_asset_location_fit(required_assets, user_assets, idea_location_fit, user_location: str = None) -> float:
    """
    Heuristic proxy for A (Asset & Location advantage) when re-scoring an
    existing idea against a different requester. Bands per the sprint doc:
    9-10 massive anchor, 5-8 neutral/good footprint, 1-4 disadvantaged.
    Approximated via required/held asset overlap plus a location match.
    """
    required = {a.strip().lower() for a in (required_assets or []) if a}
    have = {a.strip().lower() for a in (user_assets or []) if a}
    asset_score = (len(required & have) / len(required)) if required else 0.5

    location_match = 0.0
    if idea_location_fit and user_location:
        user_loc_lower = user_location.lower()
        if any(loc.lower() in user_loc_lower or user_loc_lower in loc.lower() for loc in idea_location_fit):
            location_match = 1.0

    combined = (asset_score * 0.6) + (location_match * 0.4)
    return round(1 + combined * 9, 2)


def calculate_viability(D: float, F: float, C: float, E: float, R: float, S: float, A: float) -> float:
    """V = 0.25D + 0.20F + 0.15C + 0.15E + 0.10R + 0.10S + 0.05A"""
    return round(0.25 * D + 0.20 * F + 0.15 * C + 0.15 * E + 0.10 * R + 0.10 * S + 0.05 * A, 2)
