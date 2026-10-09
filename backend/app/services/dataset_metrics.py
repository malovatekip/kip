"""Derived columns for the admin dataset export (GET /api/ideas/export).

Everything here is computed from fields KIP already stores, using the lookup
tables in app/data/dataset_metrics.json. No API calls, so exporting costs nothing.
Column meanings and bases (exact / rule / estimate) are in dataset_dictionary.json.
"""
import json
import math
import re
from datetime import datetime
from pathlib import Path

_TABLES = json.loads(
    (Path(__file__).resolve().parent.parent / "data" / "dataset_metrics.json").read_text(encoding="utf-8")
)
_DICTIONARY = json.loads(
    (Path(__file__).resolve().parent.parent / "data" / "dataset_dictionary.json").read_text(encoding="utf-8")
)

# Structured fields that are removed from the public export. Their values stay
# in structured_data, so chat and the engine are unaffected.
DROPPED_FROM_EXPORT = (
    "evidence_quality", "digital_potential", "scalability", "home_based_suitability",
    "compliance_complexity", "permit_needed", "license_needed", "internet_requirement",
    "staffing_requirement", "training_required", "urban_rural_fit", "name",
)

CORE_FIELDS = (
    "id", "idea_name", "category", "min_capital", "recommended_capital_min",
    "recommended_capital_max", "status", "decline_reason", "created_at",
)

METRIC_COLUMNS = (
    "working_capital_cycle_days", "seasonality_revenue_variance", "risk_index_1_100",
    "asset_depreciation_rate", "grace_period_recommended", "job_creation_multiplier",
    "sdg_alignment", "youth_women_accessibility_score", "local_supply_chain_retention",
    "gross_margin_percentage", "council_revenue_contribution", "capex_to_opex_ratio",
    "primary_supplier_dependency", "import_exposure_risk",
)


def data_dictionary():
    return _DICTIONARY


def extra_structured_fields(structured_fields, user_score_fields):
    skip = set(CORE_FIELDS) | set(user_score_fields) | {"operational_risks"} | set(DROPPED_FROM_EXPORT)
    return [f for f in structured_fields if f not in skip]


def export_header(structured_fields, user_score_fields):
    return (
        list(CORE_FIELDS)
        + ["operational_risks"]
        + extra_structured_fields(structured_fields, user_score_fields)
        + list(METRIC_COLUMNS)
    )


def _cell(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return "; ".join(str(v) for v in value)
    return value


def export_row(idea, extra_fields):
    data = idea.structured_data or {}
    row = [_cell(getattr(idea, field, "")) for field in CORE_FIELDS]
    row.append("; ".join(str(v) for v in (idea.operational_risks or [])))
    row.extend(_cell(data.get(field, "")) for field in extra_fields)
    metrics = derive_public_metrics(idea, data)
    row.extend(_cell(metrics[column]) for column in METRIC_COLUMNS)
    return row


def _field(idea, structured, name):
    value = getattr(idea, name, None)
    return structured.get(name) if value is None else value


def _num(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(number) else number


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    return [str(v) for v in value if v is not None]


def _truthy(value):
    if isinstance(value, str):
        return value.strip().lower() in ("true", "yes", "1")
    return bool(value)


def _matches_any(text, keywords):
    return any(
        re.search(r"\b" + re.escape(keyword.lower()) + r"(?:s|es)?\b", text)
        for keyword in keywords
    )


def _capital_midpoint(idea, structured):
    values = [
        _num(_field(idea, structured, "recommended_capital_min")),
        _num(_field(idea, structured, "recommended_capital_max")),
    ]
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None


def _category_table(category):
    return _TABLES["category"].get(category, _TABLES["category"]["_default"])


def _asset_text(structured):
    return "; ".join(_as_list(structured.get("required_assets"))).lower()


def _import_exposure(category, structured):
    rules = _TABLES["import_exposure"]
    if _matches_any(_asset_text(structured), rules["keywords"]):
        return "High"
    if category in rules["low_categories"]:
        return "Low"
    return "Medium"


def _asset_depreciation(structured):
    rules = _TABLES["asset_depreciation_pct"]
    rates = []
    for asset in _as_list(structured.get("required_assets")):
        text = asset.lower()
        if _matches_any(text, rules["stock_keywords"]):
            continue
        rate = rules["default_rate"]
        for rule in rules["rules"]:
            if _matches_any(text, rule["keywords"]):
                rate = rule["rate"]
                break
        rates.append(rate)
    return round(sum(rates) / len(rates), 1) if rates else None


def _primary_supplier(idea, category, structured):
    text = f"{_field(idea, structured, 'idea_name') or ''} {_asset_text(structured)}".lower()
    for rule in _TABLES["supplier_rules"]:
        if "categories" in rule and category not in rule["categories"]:
            continue
        if _matches_any(text, rule["keywords"]):
            return rule["supplier"]
    return _TABLES["supplier_by_category"].get(category, _TABLES["supplier_by_category"]["_default"])


def _sdg_alignment(idea, category, structured, capital_mid):
    text = f"{_field(idea, structured, 'idea_name') or ''} {structured.get('description') or ''}".lower()
    sdgs = set(_category_table(category)["sdg"])
    for addition in _TABLES["sdg_keyword_additions"]:
        if _matches_any(text, addition["keywords"]):
            sdgs.update(addition["sdg"])
    low = _TABLES["sdg_low_capital"]
    if capital_mid is not None and capital_mid <= low["capital_at_or_below_zmw"]:
        sdgs.update(low["sdg"])
    return "; ".join(str(n) for n in sorted(sdgs))


def _youth_women_score(category, structured, capital_mid):
    t = _TABLES["youth_women_accessibility"]
    score = t["base"]
    if _truthy(structured.get("training_required")):
        score -= t["training_required_penalty"]
    home_based = structured.get("home_based_suitability")
    if home_based is not None and not _truthy(home_based):
        score -= t["not_home_based_penalty"]
    labour_text = " ".join(_as_list(structured.get("required_assets")) + _as_list(structured.get("required_skills"))).lower()
    if _matches_any(labour_text, t["physical_labour_keywords"]):
        score -= t["physical_labour_penalty"]
    if capital_mid is not None and capital_mid > t["capital_threshold_zmw"]:
        score -= t["capital_penalty"]
    return int(min(10, max(1, score)))


def _risk_index(structured, break_even):
    t = _TABLES["risk_index"]
    weights, levels = t["weights"], t["level_score"]
    missing = t["missing_level_score"]
    risk = levels.get(str(structured.get("risk_level") or "").strip().lower(), missing)
    competition = levels.get(str(structured.get("competition_intensity") or "").strip().lower(), missing)
    if break_even is None:
        break_even_score = missing
    else:
        scale = min(max(break_even, 0) / t["break_even_full_scale_months"], 1)
        break_even_score = scale * 100
    index = (
        weights["risk_level"] * risk
        + weights["competition"] * competition
        + weights["break_even"] * break_even_score
    )
    return int(round(min(100, max(1, index))))


def derive_public_metrics(idea, structured):
    s = structured or {}
    category = getattr(idea, "category", None) or s.get("category") or ""
    table = _category_table(category)
    revenue = _num(s.get("monthly_revenue_estimate"))
    cogs = _num(s.get("cost_of_goods_sold_monthly"))
    startup = _num(s.get("startup_cost_estimate"))
    break_even = _num(s.get("break_even_months"))
    capital_mid = _capital_midpoint(idea, s)
    import_risk = _import_exposure(category, s)

    gross_margin = None
    if revenue and cogs is not None:
        gross_margin = round((revenue - cogs) / revenue * 100, 1)

    capex_to_opex = None
    if startup is not None and cogs:
        capex_to_opex = round(startup / cogs, 2)

    cogs_share = min(max(cogs / revenue, 0), 1) if revenue and cogs is not None else 0
    working_capital = table["wc_cycle_days"] + cogs_share * _TABLES["wc_cogs_extra_days_at_full_cogs_share"]

    seasonality = table["seasonality_variance_pct"]
    bump = _TABLES["seasonality_risk_bump"]
    environmental = _num(s.get("environmental_risk_score"))
    if environmental is not None and environmental >= bump["environmental_risk_at_or_above"]:
        seasonality += bump["pct_points"]

    headcount = _TABLES["staff_headcount"].get(str(s.get("staffing_requirement") or "").strip().lower())
    job_multiplier = None
    if headcount is not None and capital_mid:
        job_multiplier = round((1 + headcount) / (capital_mid / 10000), 2)

    fees = _TABLES["council_fees_zmw_annual"]
    council = 0
    if _truthy(s.get("license_needed")):
        council += fees["business_licence"]
    if _truthy(s.get("permit_needed")):
        council += fees["health_permit"]
    if category == "food_and_catering":
        council += fees["food_certificate_for_food_categories"]

    retention = table["local_retention_pct"] - _TABLES["import_exposure"]["local_retention_penalty_pct"][import_risk]

    return {
        "working_capital_cycle_days": int(round(working_capital)),
        "seasonality_revenue_variance": seasonality,
        "risk_index_1_100": _risk_index(s, break_even),
        "asset_depreciation_rate": _asset_depreciation(s),
        "grace_period_recommended": (
            math.ceil(break_even) + table["setup_months"] if break_even is not None else None
        ),
        "job_creation_multiplier": job_multiplier,
        "sdg_alignment": _sdg_alignment(idea, category, s, capital_mid),
        "youth_women_accessibility_score": _youth_women_score(category, s, capital_mid),
        "local_supply_chain_retention": int(min(100, max(0, retention))),
        "gross_margin_percentage": gross_margin,
        "council_revenue_contribution": council,
        "capex_to_opex_ratio": capex_to_opex,
        "primary_supplier_dependency": _primary_supplier(idea, category, s),
        "import_exposure_risk": import_risk,
    }
