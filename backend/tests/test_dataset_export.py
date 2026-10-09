"""
Tests for the institutional dataset export: column set, derived-metric ranges,
and a few hand-checked values. Runs under pytest or directly:
    python tests/test_dataset_export.py
"""
import os
import sys
import types

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import dataset_metrics as dm
from app.services.kip_prompt_v2 import IDEA_SCHEMA

STRUCTURED_FIELDS = list(IDEA_SCHEMA["properties"].keys())
# Mirrors kip_engine_v2.USER_SCORE_FIELDS (not imported: it pulls in chromadb).
USER_SCORE_FIELDS = (
    "execution_fit_score", "competitive_position_score",
    "regulatory_risk_score", "asset_location_score",
)


def _idea(category, name, structured, lo=None, hi=None):
    return types.SimpleNamespace(
        id=1, idea_name=name, category=category, min_capital=lo,
        recommended_capital_min=lo, recommended_capital_max=hi,
        status="accepted", decline_reason=None, created_at=None,
        operational_risks=structured.get("operational_risks", []),
        structured_data=structured,
    )


AGRI = _idea("agriculture", "Chikoyi Village Poultry Rearing", {
    "description": "Broiler and layer poultry rearing for village markets.",
    "required_assets": ["chicken run/shelter (chicken house)", "feeders and drinkers",
                        "day-old chicks or local hen stock", "feed storage"],
    "required_skills": ["basic animal husbandry"],
    "risk_level": "medium", "competition_intensity": "high", "break_even_months": 5,
    "staffing_requirement": "low", "training_required": False, "home_based_suitability": True,
    "license_needed": True, "permit_needed": False, "environmental_risk_score": 7,
    "monthly_revenue_estimate": 2900, "cost_of_goods_sold_monthly": 1850,
    "startup_cost_estimate": 4500,
}, lo=3000, hi=5800)

RETAIL = _idea("retail_and_trade", "Kasama Fresh Produce & Vegetable Vending Stall", {
    "description": "Daily vegetable and fruit vending.",
    "required_assets": ["vending table/stall", "weighing scale", "crates/baskets",
                        "shade cover or umbrella"],
    "required_skills": ["basic bargaining/negotiation"],
    "risk_level": "low", "competition_intensity": "medium", "break_even_months": 1,
    "staffing_requirement": "low", "training_required": False, "home_based_suitability": False,
    "license_needed": False, "permit_needed": False, "environmental_risk_score": 4,
    "monthly_revenue_estimate": 4200, "cost_of_goods_sold_monthly": 2800,
    "startup_cost_estimate": 850,
}, lo=800, hi=2000)

SERVICES = _idea("services_and_care", "Lusaka Coin-Operated Self-Service Laundromat", {
    "description": "Self-service washing and drying for households.",
    "required_assets": ["semi-industrial washing machines", "dryers",
                        "reliable water connection", "3-phase electricity or backup power",
                        "shop premises with plumbing and drainage"],
    "required_skills": ["basic machine maintenance", "customer service"],
    "risk_level": "medium", "competition_intensity": "medium", "break_even_months": 9,
    "staffing_requirement": "low", "training_required": False, "home_based_suitability": False,
    "license_needed": True, "permit_needed": True, "environmental_risk_score": 5,
    "monthly_revenue_estimate": 46000, "cost_of_goods_sold_monthly": 32000,
    "startup_cost_estimate": 46000,
}, lo=38000, hi=55000)

UNDERCAP = _idea("services_and_care", "Kasama Hygiene & Wellness Mini-Mart", {
    "description": "Hygiene and wellness products sold from a small kiosk.",
    "required_assets": ["small kiosk or stall space", "display shelving/lockable cabinet"],
    "required_skills": ["customer service"],
    "risk_level": "low", "competition_intensity": "low", "break_even_months": 2,
    "staffing_requirement": "low", "training_required": True, "home_based_suitability": True,
    "license_needed": False, "permit_needed": False, "environmental_risk_score": 2,
    "monthly_revenue_estimate": 3600, "cost_of_goods_sold_monthly": 2100,
    "startup_cost_estimate": 950,
}, lo=1000, hi=3000)

MINIMAL = _idea("retail_and_trade", "Sparse Record", {})

FIXTURES = [AGRI, RETAIL, SERVICES, UNDERCAP, MINIMAL]


def _row(idea):
    extra = dm.extra_structured_fields(STRUCTURED_FIELDS, USER_SCORE_FIELDS)
    return dict(zip(dm.export_header(STRUCTURED_FIELDS, USER_SCORE_FIELDS), dm.export_row(idea, extra)))


def test_dropped_columns_absent_from_header():
    header = dm.export_header(STRUCTURED_FIELDS, USER_SCORE_FIELDS)
    for column in dm.DROPPED_FROM_EXPORT:
        assert column not in header, column


def test_header_has_no_duplicates_and_expected_width():
    header = dm.export_header(STRUCTURED_FIELDS, USER_SCORE_FIELDS)
    assert len(header) == len(set(header))
    assert len(header) == 44


def test_all_metric_columns_present_and_documented():
    header = dm.export_header(STRUCTURED_FIELDS, USER_SCORE_FIELDS)
    for column in dm.METRIC_COLUMNS:
        assert column in header
    assert set(dm.data_dictionary()["columns"]) == set(dm.METRIC_COLUMNS)


def test_user_scores_and_identity_not_exported():
    header = dm.export_header(STRUCTURED_FIELDS, USER_SCORE_FIELDS)
    for column in USER_SCORE_FIELDS:
        assert column not in header
    for column in ("user_id", "email", "owner"):
        assert column not in header


def test_metric_ranges_hold_for_all_fixtures():
    for idea in FIXTURES:
        m = dm.derive_public_metrics(idea, idea.structured_data)
        assert 1 <= m["risk_index_1_100"] <= 100
        assert 1 <= m["youth_women_accessibility_score"] <= 10
        assert 0 <= m["local_supply_chain_retention"] <= 100
        assert m["import_exposure_risk"] in ("High", "Medium", "Low")
        assert m["council_revenue_contribution"] >= 0
        assert m["working_capital_cycle_days"] >= 0


def test_gross_margin_matches_formula():
    m = dm.derive_public_metrics(SERVICES, SERVICES.structured_data)
    assert m["gross_margin_percentage"] == round((46000 - 32000) / 46000 * 100, 1)


def test_hand_checked_agriculture_values():
    m = dm.derive_public_metrics(AGRI, AGRI.structured_data)
    assert m["gross_margin_percentage"] == 36.2
    assert m["capex_to_opex_ratio"] == 2.43
    assert m["grace_period_recommended"] == 8
    assert m["seasonality_revenue_variance"] == 55
    assert m["asset_depreciation_rate"] == 6.0
    assert m["local_supply_chain_retention"] == 65
    assert m["council_revenue_contribution"] == 1000
    assert m["primary_supplier_dependency"] == "Day-old chick hatchery and poultry feed miller"
    assert m["sdg_alignment"] == "1; 2; 8"
    assert m["youth_women_accessibility_score"] == 10


def test_produce_vendor_gets_produce_supplier():
    m = dm.derive_public_metrics(RETAIL, RETAIL.structured_data)
    assert m["primary_supplier_dependency"] == "Wholesale produce market (vegetables and fruit)"
    assert abs(m["asset_depreciation_rate"] - 11.25) < 0.1


def test_undercapitalised_business_gets_sdg1_and_training_penalty():
    m = dm.derive_public_metrics(UNDERCAP, UNDERCAP.structured_data)
    assert set(m["sdg_alignment"].split("; ")) == {"1", "3", "6", "8"}
    assert m["youth_women_accessibility_score"] == 8


def test_capital_and_location_penalties_on_laundromat():
    m = dm.derive_public_metrics(SERVICES, SERVICES.structured_data)
    assert m["youth_women_accessibility_score"] == 7
    assert m["council_revenue_contribution"] == 1500
    assert m["import_exposure_risk"] == "Low"


def test_risk_index_rises_with_risk_inputs():
    low = dict(AGRI.structured_data, risk_level="low", competition_intensity="low", break_even_months=1)
    high = dict(AGRI.structured_data, risk_level="high", competition_intensity="high", break_even_months=20)
    assert dm.derive_public_metrics(AGRI, low)["risk_index_1_100"] < dm.derive_public_metrics(AGRI, high)["risk_index_1_100"]


def test_sparse_record_does_not_raise_and_fills_every_metric():
    m = dm.derive_public_metrics(MINIMAL, MINIMAL.structured_data)
    assert set(m) == set(dm.METRIC_COLUMNS)
    assert m["gross_margin_percentage"] is None
    assert m["grace_period_recommended"] is None
    assert m["job_creation_multiplier"] is None
    assert m["asset_depreciation_rate"] is None
    row = _row(MINIMAL)
    assert len(row) == 44


def test_export_row_values_are_csv_safe():
    for idea in FIXTURES:
        for value in _row(idea).values():
            assert not isinstance(value, (list, dict)), value


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for test in tests:
        test()
        print(f"ok  {test.__name__}")
    print(f"{len(tests)} tests passed")
