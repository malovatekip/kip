"""
K-BIG-2 Prompt & Schema
========================
Builds the system prompt and JSON schema for the k-big-2 structured idea
generator (kip_engine_v2.py). Reuses k-big-1's identity and Zambia economic
constants (per the sprint doc: "we'll use the k-big-1 method of generating
business ideas") but requests exactly 3 ideas back as validated structured
JSON matching the sprint's practical schema, instead of a single markdown
reply.
"""
from app.services.kip_prompt import KIP_IDENTITY, KIP_ZAMBIA_CONSTANTS

KBIG2_TASK_INSTRUCTIONS = """
K-BIG-2 TASK:

You will be given a user's structured profile -- available capital, location,
skills/interests, and assets already owned. Using the same reasoning approach
as K-BIG-1 (extract -> analyse regional conditions and competition -> apply
economic context -> generate -> verify against capital), generate EXACTLY 3
distinct, realistic, viable business ideas suited to that profile.

Return them as structured data matching the required schema exactly -- do not
add commentary outside the schema fields. Every numeric field must be your
best realistic estimate for the Zambian market (grounded in the economic
constants above and any retrieved knowledge/town intelligence below) -- never
placeholder or rounded-for-looks numbers. All money is in ZMW.

For the four qualitative sub-scores, self-assess strictly against these
bands (verbatim from the K-BIG-2 methodology):

EXECUTION FIT (execution_fit_score) -- personal alignment between the
business's operational requirements and the user's time, network, and skills:
  9-10 Perfect alignment. The user already possesses the technical skills,
       holds the exact industry network, and has the spare time to run it
       smoothly.
  5-8  Learning curve. The user understands the business but will need to
       hire or delegate key operational roles, or sacrifice significant
       personal time.
  1-4  Mismatch. The business requires specialized engineering, legal
       knowledge, or a time commitment the user does not have.

COMPETITIVE POSITION (competitive_position_score) -- active local competitors
and the height of the economic moat:
  9-10 Monopolistic tendencies. Distributive rights, a proprietary trade
       secret, or zero local competitors.
  5-8  Fragmented market. Competitors exist, but the market is expanding fast
       enough for everyone to win a slice, or there is a clear angle of
       differentiation.
  1-4  Red ocean. The market is locked down by aggressive, entrenched
       competitors competing entirely on price wars.

REGULATORY & OPERATIONAL RISK (regulatory_risk_score) -- government
compliance, licensing, supply chain fragility, currency exposure:
  9-10 Low risk. No complex licenses needed. Operates entirely online or via
       simple local commercial rules.
  5-8  Regulated but manageable. Requires standard council permits, health
       inspections, or standard environmental compliance.
  1-4  Extreme exposure. Relies heavily on volatile import exchange rates,
       highly restrictive government licensing, or single-source suppliers
       prone to disruption.

ASSET & LOCATION ADVANTAGE (asset_location_score) -- unfair advantage from a
physical location, community ties, real estate, or owned infrastructure:
  9-10 Massive anchor. The user owns the land, sits directly on a
       high-foot-traffic corridor, or operates in a tax-free special economic
       zone.
  5-8  Neutral/good footprint. Standard commercial leasing options apply, or
       location matters little to operations (e.g. remote B2B consulting).
  1-4  Disadvantaged. High transport cost from being remote, exorbitant
       commercial rental costs, or restricted spatial access to target
       customers.

D (Demand), F (Financial viability), and C (Capital fit) are computed
separately from the numeric fields you provide (total_target_buyers,
consumption_frequency_per_year, average_unit_price, monthly_revenue_estimate,
cost_of_goods_sold_monthly, and the capital fields) -- you do not need to
compute those scores yourself, only report accurate underlying numbers.
"""

# Structured outputs don't support numeric min/max constraints, so the four
# 1-10 sub-scores use an integer enum instead to keep them in range.
_SCORE_ENUM = {"type": "integer", "enum": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
_LEVEL_ENUM = ["low", "medium", "high"]

# NOTE on schema size: the sprint doc's full field list (~70 fields) compiles
# to a strict-JSON grammar too large for the API ("The compiled grammar is
# too large" 400) once wrapped in a 3-item array -- confirmed empirically,
# not a guess. The schema below keeps every field the viability formula
# actually consumes (D/F/C inputs, the four LLM-scored sub-scores) plus one
# representative field per remaining sprint-doc category, and folds the rest
# of that category's nuance into a single free-text `narrative` field
# instead of one strict field each. This is a documented trade-off (see the
# investor documentation's methodology section), not silent scope-cutting.
IDEA_SCHEMA = {
    "type": "object",
    "properties": {
        # Identity
        "name": {"type": "string", "description": "The business idea's name."},
        "category": {"type": "string", "description": "e.g. food_and_catering, agriculture, retail_and_trade, digital_and_creative, trades_and_repairs, services_and_care, finance_and_administration, transport_and_logistics, manufacturing, tourism_and_hospitality, construction_and_real_estate, education_and_training."},
        "description": {"type": "string", "description": "One to two sentence description."},
        "location_fit": {"type": "array", "items": {"type": "string"}, "description": "e.g. urban, dense residential, market/roadside, home-based."},

        # User-fit
        "min_capital": {"type": "number"},
        "recommended_capital_min": {"type": "number"},
        "recommended_capital_max": {"type": "number"},
        "required_skills": {"type": "array", "items": {"type": "string"}},
        "required_assets": {"type": "array", "items": {"type": "string"}, "description": "Physical/digital/business assets this idea needs (e.g. shop space, smartphone, business registration)."},
        "risk_level": {"type": "string", "description": "low | medium | high"},
        "training_required": {"type": "boolean"},

        # Market (feed the D formula)
        "demand_level": {"type": "string", "description": "low | medium | high"},
        "total_target_buyers": {"type": "number", "description": "N -- serviceable addressable market: unique individuals/businesses reachable with this pain point."},
        "consumption_frequency_per_year": {"type": "number", "description": "Q -- purchases per buyer per year."},
        "average_unit_price": {"type": "number", "description": "P -- average ZMW price per unit/transaction."},
        "competition_intensity": {"type": "string", "description": "low | medium | high"},

        # Financial (feed the F formula)
        "startup_cost_estimate": {"type": "number"},
        "monthly_revenue_estimate": {"type": "number", "description": "Realistic total monthly revenue in ZMW, used for the gross-margin (F) calculation."},
        "cost_of_goods_sold_monthly": {"type": "number", "description": "Monthly COGS in ZMW, used for the gross-margin (F) calculation."},
        "break_even_months": {"type": "number"},
        "revenue_model": {"type": "string"},

        # Operational
        "premises_requirement": {"type": "string"},
        "staffing_requirement": {"type": "string", "description": "low | medium | high"},
        "internet_requirement": {"type": "string", "description": "low | medium | high"},

        # Regulatory
        "license_needed": {"type": "boolean"},
        "permit_needed": {"type": "boolean"},
        "compliance_complexity": {"type": "string", "description": "low | medium | high"},

        # Location
        "urban_rural_fit": {"type": "string"},
        "home_based_suitability": {"type": "boolean"},

        # Strategic
        "scalability": {"type": "string", "description": "low | medium | high"},
        "digital_potential": {"type": "string", "description": "low | medium | high"},

        # Confidence
        "data_confidence": {"type": "string", "description": "low | medium | high"},
        "evidence_quality": {"type": "string", "description": "weak | mixed | strong"},

        # Everything else the sprint schema calls for (equipment, logistics,
        # supplier dependency, seasonality, brand/cross-sell/upsell
        # potential, health & safety, target customer segments, etc.) --
        # covered here in prose rather than as separate strict fields.
        "narrative": {
            "type": "string",
            "description": "3-5 sentences covering: target customer segment, equipment/inventory/logistics needs, supplier dependency, seasonality, health & safety or age-restriction notes, and the idea's brand/cross-sell/upsell/scalability potential beyond what the structured fields above already capture.",
        },

        # Viability sub-scores (LLM self-assessed; D/F/C computed separately)
        "execution_fit_score": _SCORE_ENUM,
        "competitive_position_score": _SCORE_ENUM,
        "regulatory_risk_score": _SCORE_ENUM,
        "asset_location_score": _SCORE_ENUM,
    },
    "required": [
        "name", "category", "description", "location_fit",
        "min_capital", "recommended_capital_min", "recommended_capital_max",
        "required_skills", "required_assets", "risk_level", "training_required",
        "demand_level", "total_target_buyers", "consumption_frequency_per_year",
        "average_unit_price", "competition_intensity",
        "startup_cost_estimate", "monthly_revenue_estimate", "cost_of_goods_sold_monthly",
        "break_even_months", "revenue_model",
        "premises_requirement", "staffing_requirement", "internet_requirement",
        "license_needed", "permit_needed", "compliance_complexity",
        "urban_rural_fit", "home_based_suitability",
        "scalability", "digital_potential",
        "data_confidence", "evidence_quality", "narrative",
        "execution_fit_score", "competitive_position_score",
        "regulatory_risk_score", "asset_location_score",
    ],
    "additionalProperties": False,
}

IDEAS_WRAPPER_SCHEMA = {
    "type": "object",
    "properties": {
        "ideas": {"type": "array", "items": IDEA_SCHEMA},
    },
    "required": ["ideas"],
    "additionalProperties": False,
}


def build_system_prompt_v2(
    retrieved_knowledge: str = "",
    town_profile: str = "",
    user_idea_history: str = "",
) -> str:
    """Assembles the complete system prompt for a K-BIG-2 structured-generation call."""
    sections = [KIP_IDENTITY, KIP_ZAMBIA_CONSTANTS, KBIG2_TASK_INSTRUCTIONS]

    if retrieved_knowledge:
        sections.append(f"RETRIEVED KNOWLEDGE (use this to inform your response):\n{retrieved_knowledge}")
    if town_profile:
        sections.append(f"TOWN/AREA INTELLIGENCE:\n{town_profile}")
    if user_idea_history:
        sections.append(f"PREVIOUSLY GENERATED IDEAS IN THE SHARED DATASET (avoid near-duplicates):\n{user_idea_history}")

    return "\n\n".join(sections)


def build_user_message_v2(profile: dict) -> str:
    """Turns the wizard's structured profile (slides 1-4) into the user turn."""
    capital = profile.get("capital_available")
    capital_text = f"K{capital:,.0f}" if capital is not None else "Effectively limitless (user has no fixed capital ceiling right now)"

    lines = [
        "Generate exactly 3 business ideas for this user profile:",
        f"- Available capital: {capital_text}",
        f"- Location: {profile.get('location') or 'Not specified'}",
        f"- Skills/interests: {', '.join(profile.get('skills') or []) or 'None specified'}",
        f"- Assets already owned: {', '.join(profile.get('assets') or []) or 'None specified'}",
    ]
    return "\n".join(lines)
