"""
Unit tests for the k-big-2 viability engine.

Note: the sprint doc's own worked JSON example has an internally-inconsistent
"demand" field (455000, which doesn't reconcile with its own
total_target_buyers/consumption_frequency/average_unit_price of
9000/3/5000 -> 135,000,000) and a couple of stray typos elsewhere in the
doc. Rather than assert against numbers the source doc itself doesn't derive
consistently, these tests use clean, hand-computed inputs so the formula
itself is verified precisely.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import viability_engine as ve


def test_calculate_financial_basic_margin():
    # revenue=10,000, COGS=6,500 -> margin 35% -> F = 3.5
    assert ve.calculate_financial(10_000, 6_500) == 3.5


def test_calculate_financial_zero_revenue_is_zero():
    assert ve.calculate_financial(0, 500) == 0.0
    assert ve.calculate_financial(None, 500) == 0.0


def test_calculate_capital_fit_partial_and_limitless():
    # CA=5,000 vs CR=10,000 -> (0.5)*10 = 5.0
    assert ve.calculate_capital_fit(5_000, 10_000) == 5.0
    # Capital marked limitless (skipped Slide 1, no loan expected) -> perfect fit
    assert ve.calculate_capital_fit(None, 10_000) == 10.0
    # Capital comfortably exceeds requirement -> capped at 10
    assert ve.calculate_capital_fit(50_000, 10_000) == 10.0


def test_calculate_demand_matches_manual_log_scale():
    N, Q, P, g, t = 1000, 4, 50, 0.10, 0
    raw_demand = N * Q * P * ((1 + g) ** t)
    assert raw_demand == 200_000

    score, returned_raw = ve.calculate_demand(N, Q, P, cagr=g, years_ahead=t)
    assert returned_raw == raw_demand

    reference_max = ve.get_demand_reference_max()
    expected_score = min(10.0, math.log10(raw_demand + 1) / math.log10(reference_max) * 10)
    assert score == round(expected_score, 2)


def test_calculate_demand_zero_buyers_is_zero():
    score, raw = ve.calculate_demand(0, 4, 50)
    assert score == 0.0
    assert raw == 0


def test_calculate_viability_weighted_sum():
    # D=8, F=5, C=6, E=7, R=8, S=6, A=9
    # V = 0.25*8 + 0.20*5 + 0.15*6 + 0.15*7 + 0.10*8 + 0.10*6 + 0.05*9
    #   = 2 + 1 + 0.9 + 1.05 + 0.8 + 0.6 + 0.45 = 6.8
    v = ve.calculate_viability(D=8, F=5, C=6, E=7, R=8, S=6, A=9)
    assert v == 6.8


def test_calculate_viability_weights_sum_to_one():
    # Every sub-score at the max (10) must yield V == 10.
    v = ve.calculate_viability(D=10, F=10, C=10, E=10, R=10, S=10, A=10)
    assert v == 10.0


def test_estimate_execution_fit_overlap_bands():
    # Perfect skill overlap -> top of the band (10)
    assert ve.estimate_execution_fit(["cooking", "pricing"], ["cooking", "pricing"]) == 10.0
    # No overlap -> bottom of the band (1)
    assert ve.estimate_execution_fit(["cooking", "pricing"], ["welding"]) == 1.0
    # No stated requirement -> moderate default
    assert ve.estimate_execution_fit([], ["cooking"]) == 7.0


def test_estimate_asset_location_fit_location_match_lifts_score():
    without_location = ve.estimate_asset_location_fit(
        ["shop space"], ["shop space"], ["Lusaka"], user_location=None
    )
    with_location = ve.estimate_asset_location_fit(
        ["shop space"], ["shop space"], ["Lusaka"], user_location="Lusaka, Kabulonga"
    )
    assert with_location > without_location
    assert with_location == 10.0
