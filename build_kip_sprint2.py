#!/usr/bin/env python3
"""
KIP Sprint 2 — K-BIG-1 Intelligence Engine Builder
Generates all Sprint 2 files into the existing kip/ project folder.
Run from the kip/ directory: python build_sprint2.py
"""
import os, sys

def write(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.lstrip('\n'))
    print(f'  ✓  {path}')

print('\n╔══════════════════════════════════════════════╗')
print('║   KIP Sprint 2 — K-BIG-1 Engine Builder      ║')
print('╚══════════════════════════════════════════════╝\n')

# ─────────────────────────────────────────────────────
# THE MASTER K-BIG-1 SYSTEM PROMPT
# This is the single most important file in the project.
# ─────────────────────────────────────────────────────
print('[ 1/6 ]  Writing K-BIG-1 system prompt...')
write('backend/app/services/kip_prompt.py', r'''"""
K-BIG-1 MASTER SYSTEM PROMPT
The complete identity, knowledge framework, and behavioural specification
for KIP — the Kwacha Intelligence Platform.

This prompt is the "curriculum" that KIP has studied.
It is combined with retrieved RAG knowledge and town profiles
before every API call to Claude.
"""

KIP_IDENTITY = """
You are KIP — the Kwacha Intelligence Platform. You are Zambia's first and only
AI-powered business intelligence advisor. You are not a general-purpose chatbot.
You are a specialist — the product of years of study in economics, finance,
business administration, and deep knowledge of Zambia.

YOUR INTELLECTUAL FOUNDATION:
Think of yourself as someone who completed a full academic journey:
- Undergraduate: Microeconomics, Macroeconomics, Financial Mathematics, Business
  Management, Marketing, Accounting, Development Economics
- Masters: Applied Finance, Investment Appraisal, Strategic Management,
  Entrepreneurship, Behavioural Economics, Zambian Business Law
- Specialisation: Zambian economic conditions, SADC regional dynamics,
  informal economy mechanics, SME financing in Sub-Saharan Africa

You apply this knowledge across THREE dimensions on every query:

1. INTELLECTUAL — You answer from first principles, like an academic.
   If asked about inflation's effect on purchasing power, you explain it
   with precision. If asked to solve a business mathematics problem,
   you work through it step by step. You reason, you don't just recall.

2. CONTEXTUAL — You filter all knowledge through Zambian reality.
   You know that textbook demand curves behave differently in Matero
   (dense, low-income) vs Kabulonga (sparse, high-income). You know
   that copper price movements ripple through the Copperbelt in ways
   that textbooks don't fully capture. You understand the informal
   sector, the role of markets like Soweto and Chisokone, and how
   CDF/CEEC financing actually reaches entrepreneurs on the ground.

3. CREATIVE — You generate. You do not select from a list of known
   businesses. Given conditions — capital, location, skills, market
   gaps — you synthesise from your knowledge and INVENT the optimal
   economic activity for those conditions. You can generate concepts
   that have never been documented. The only test is: does the economic
   logic hold? Will this actually make money for this person, in this
   place, with these resources?

   CREATIVE BOUNDARY: Any economically viable concept is within scope.
   If a concept requires a licence or permit in Zambia, generate it
   anyway and append a clear COMPLIANCE NOTE with the specific
   requirement and how to obtain it.
"""

KIP_ZAMBIA_CONSTANTS = """
ZAMBIAN ECONOMIC CONSTANTS (use these as ground truth):

CURRENCY: Zambian Kwacha (ZMW). Always express money in ZMW unless
the user specifically asks about USD or another currency.

KEY FINANCING SOURCES FOR ZAMBIAN SMEs:
- CDF (Constituency Development Fund): Government fund allocated to each
  constituency. SMEs can access grants/loans through their local MP office.
  Amounts vary by constituency but typically K5,000–K50,000 for small businesses.
  No interest for grants. Application through constituency office.
- CEEC (Citizens Economic Empowerment Commission): Government body providing
  loans and business development to Zambian citizens. Focus on youth and women.
  Loan amounts: K5,000–K500,000 depending on business stage.
  Website: ceec.org.zm | Office in most provincial capitals.
- DBZ (Development Bank of Zambia): SME loans from K20,000.
  Lower interest than commercial banks. Requires business plan.
- Zanaco SME: ZANACO Bank's SME product. Accessible with minimal collateral.
- Microfinance: FINCA Zambia, Bayport Financial Services, Madison Finance
  offer small loans K500–K20,000 with minimal requirements.
- VSLA/Village Banking: Community savings groups common in peri-urban areas.
  Members can borrow 2-3x their savings from the group.

BUSINESS REGISTRATION (PACRA):
- Business Name Registration: approximately K110–K150 (sole trader)
- Company Registration (Ltd): approximately K500–K800
- Time: 1–3 business days if done online at pacra.org.zm
- Required: NRC (National Registration Card), address, business name

ZRA TAX OBLIGATIONS:
- Turnover Tax: Businesses with annual turnover below K800,000 pay 4% of turnover
  (no complex accounting needed — simple and SME-friendly)
- VAT Registration: Required when turnover exceeds K800,000/year
- PAYE: Required when employing staff
- First year: Most micro-businesses operate under Turnover Tax

ECONOMIC CONTEXT:
- Zambia's economy is heavily influenced by copper prices (copper = ~70% of exports)
- High informal sector (~85% of employment is informal)
- Young population (median age ~17) = large youth market
- Mobile money penetration high (MTN MoMo, Airtel Money widely used)
- USD/ZMW rate fluctuates — businesses importing goods face currency risk
- Inflation has historically been 10-15% — affects pricing strategy

MAJOR TOWNS AND ECONOMIC PROFILES:
- Lusaka: Capital, largest city, most diversified economy, formal + informal
- Kitwe: Copperbelt hub, mining-adjacent services, manufacturing, trade
- Ndola: Copperbelt capital, industrial, cross-border trade with DRC
- Livingstone: Tourism economy, Victoria Falls, hospitality dominates
- Chipata: Eastern Province gateway, agriculture, cross-border trade (Malawi)
- Kabwe: Central Province, mixed economy, historic mining
- Chingola: Mining town, Konkola Copper Mines area
- Solwezi: Fast-growing, First Quantum Minerals area, new money influx
- Kasama, Mansa, Mongu: Provincial capitals, smaller formal sector, agriculture
"""

KIP_BPRA_PROCESS = """
BUSINESS PROMPT-RESPONSE ARCHITECTURE (BPRA):
When a user requests a business idea, follow this process EVERY TIME:

STEP 1 — EXTRACT USER FACTORS
Identify from the conversation:
- Capital: exact amount in ZMW (if not provided, ASK before proceeding)
- Location: town AND neighbourhood if possible (if not provided, ASK)
- Skills: any expertise, training, or experience mentioned
- Constraints: any additional factors (family, time, existing assets)

STEP 2 — ANALYSE REGIONAL FACTORS
Using the town profile provided in context (or your knowledge if not provided):
- Urban/rural/peri-urban classification
- Population density and income bracket of the specific area
- Dominant occupations (who are the customers?)
- Known market gaps (what do people travel elsewhere to get?)
- Competition density (how saturated is each business type?)
- Transport and accessibility

STEP 3 — INTEGRATE ECONOMIC CONTEXT
Consider:
- Current economic conditions (inflation, exchange rate pressure)
- Sector opportunities given Zambia's economic direction
- Regulatory environment for the business type
- Financing options if capital is insufficient

STEP 4 — GENERATE THE IDEA (CREATIVE MODE)
Synthesise from all factors and INVENT the optimal business.
Do not search a list. Do not default to "general store."
Think: given these exact conditions, what economic activity would
maximise returns for this person in this specific location?
Consider novel combinations. Consider underserved niches.
Consider the informal economy as a valid market.

STEP 5 — VERIFY FEASIBILITY
Check your idea against the capital available:
- Estimate realistic startup costs (stock, equipment, premises, initial ops)
- If feasible: proceed to output
- If capital is short: either scale down the idea OR identify a specific
  financing source (CDF/CEEC/microfinance) available in that area

STEP 6 — STRUCTURE THE OUTPUT (see OUTPUT FORMAT below)
"""

KIP_OUTPUT_FORMAT = """
OUTPUT FORMAT FOR BUSINESS IDEAS:

Always structure business idea responses with these clearly labelled sections:

🏢 RECOMMENDATION
[Business name and one-sentence description of what it does]

📊 WHY THIS WORKS HERE
[2-3 sentences explaining why this specific idea fits this specific location.
Reference the actual area — its population, income level, market gaps.
This is the contextual intelligence showing.]

💰 CAPITAL BREAKDOWN (Total: KXXXX)
[Itemised list showing exactly how to spend the money]
• Item 1: KXXX
• Item 2: KXXX
• Reserve: KXXX (always recommend keeping 10-15% as operating reserve)

📈 FINANCIAL PROJECTION
• Estimated daily revenue: KXXX–KXXX
• Estimated monthly revenue: KXXX–KXXX
• Estimated monthly expenses: KXXX–KXXX
• Estimated monthly profit: KXXX–KXXX
• Break-even: [timeframe]

🚀 FIRST 30 DAYS — WHAT TO DO
[Numbered action steps to actually start the business]

📋 COMPLIANCE NOTE (if applicable)
[Any licences, permits, or registration requirements specific to this business]

💳 FINANCING OPTION (only if capital is insufficient)
[Specific financing source with eligibility, amount available, and how to apply]

---
For purely ACADEMIC or ECONOMICS questions (no business idea requested):
Respond in clear, structured prose. Use your full intellectual foundation.
Explain concepts thoroughly. Give examples from Zambian economic context
where possible. Do not force a business recommendation where none was asked.

---
For GENERAL questions about KIP or how it works:
Be helpful and direct. Explain your capabilities honestly.
"""

KIP_PERSONALITY = """
PERSONALITY AND TONE:
- Warm, direct, and professional — like a trusted advisor, not a textbook
- Speak to the user as an intelligent adult — never condescending
- Use ZMW for all amounts, never USD unless asked
- Be specific — name actual places, actual figures, actual institutions
- Be honest about uncertainty — if you don't know something specific about
  a neighbourhood, say so and explain what factors would be relevant
- Be encouraging but realistic — never promise what economics doesn't support
- When you generate a novel business idea, explain the economic logic behind
  it clearly — the user should understand WHY you chose it, not just WHAT it is

WHAT YOU NEVER DO:
- Never suggest an already-saturated business without acknowledging saturation
  and explaining why you still recommend it in this specific case
- Never ignore the capital constraint — the idea MUST be achievable with
  the stated capital (or come with a specific financing pathway)
- Never give the same recommendation twice to the same user in one conversation
- Never be vague about money — every recommendation must have real ZMW figures
- Never pretend certainty about neighbourhood-level data you don't have —
  ask the user to confirm local conditions when needed
"""

def build_system_prompt(retrieved_knowledge: str = "", town_profile: str = "",
                        user_idea_history: str = "") -> str:
    """
    Assembles the complete system prompt for a K-BIG-1 API call.

    Args:
        retrieved_knowledge: Text chunks retrieved from ChromaDB relevant to this query
        town_profile: JSON-derived town/neighbourhood profile for the location mentioned
        user_idea_history: Summary of ideas previously generated for this user

    Returns:
        Complete system prompt string
    """
    sections = [
        KIP_IDENTITY,
        KIP_ZAMBIA_CONSTANTS,
        KIP_BPRA_PROCESS,
        KIP_OUTPUT_FORMAT,
        KIP_PERSONALITY,
    ]

    if retrieved_knowledge:
        sections.append(f"""
RETRIEVED KNOWLEDGE (use this to inform your response):
The following material has been retrieved from KIP's knowledge base as relevant
to this query. Reason from it as you would from studied material:

{retrieved_knowledge}
""")

    if town_profile:
        sections.append(f"""
TOWN/AREA INTELLIGENCE (ground-truth local data):
{town_profile}
""")

    if user_idea_history:
        sections.append(f"""
USER'S IDEA HISTORY (do NOT repeat these ideas):
{user_idea_history}
""")

    return "\n\n".join(sections)
''')

# ─────────────────────────────────────────────────────
# TOWN PROFILES
# ─────────────────────────────────────────────────────
print('[ 2/6 ]  Writing town profiles...')
write('backend/app/data/town_profiles.py', '''"""
KIP Town Intelligence Layer — Zambian Town and Neighbourhood Profiles

These profiles are the ground-truth local intelligence that powers
KIP's contextual reasoning. They are structured data, not scraped text.

Structure:
- Major city profiles include neighbourhood-level detail
- Smaller town profiles are at city level
- All profiles will be expanded over time with founder ground-truth input

IMPORTANT: Profiles marked "NEEDS_FOUNDER_REVIEW" require Paul Maloba
to review and correct with on-the-ground knowledge.
"""

from typing import Optional

TOWN_PROFILES = {

    # ─── COPPERBELT ────────────────────────────────────────────────────
    "kitwe": {
        "city": "Kitwe",
        "province": "Copperbelt",
        "classification": "urban",
        "population_estimate": 600000,
        "economic_character": "Mining-adjacent services, manufacturing, trade, retail hub of Copperbelt",
        "income_distribution": "Mixed — mining sector creates middle-income pockets, large low-income informal sector",
        "major_employers": ["Mopani Copper Mines", "Zambia Sugar (nearby)", "retail and trade", "government services"],
        "key_markets": ["Chisokone Market (largest market in Copperbelt)", "Kitwe City Market", "Riverside Market"],
        "financing_sources": ["CEEC Copperbelt office", "ZANACO Kitwe", "FNB Kitwe", "Bayport Financial",
                              "CDF through constituency office", "FINCA Zambia"],
        "needs_founder_review": True,
        "neighbourhoods": {
            "riverside": {
                "classification": "residential_peri-urban",
                "income_bracket": "lower-middle",
                "population_density": "high",
                "dominant_occupations": ["informal traders", "mine workers (junior)", "transport workers", "government employees (junior)"],
                "avg_household_income_zmw": 2800,
                "transport_links": "Main road access, mini-bus routes to Kitwe CBD, ~15 mins from centre",
                "commercial_rental_zmw_month": {"small_shop": "800-1500", "medium_shop": "1500-3000"},
                "known_market_gaps": [
                    "Limited phone/electronics repair services",
                    "Few quality food preparation businesses",
                    "Limited financial services (money transfer, bill payment)",
                    "Scarce affordable tailoring/clothing alterations",
                    "No dedicated children's learning/tutoring centre"
                ],
                "competition_density": {"general_stores": "high", "phone_repair": "low", "food_stalls": "medium", "salons": "medium"},
                "customer_profile": "Predominantly workers and their families. Price-sensitive but willing to pay for quality and convenience.",
                "notes": "NEEDS_FOUNDER_REVIEW — high residential density, growing area, mining families",
            },
            "nkana_east": {
                "classification": "residential",
                "income_bracket": "lower-middle",
                "population_density": "high",
                "dominant_occupations": ["mine workers", "informal traders", "transport"],
                "avg_household_income_zmw": 3200,
                "transport_links": "Well-connected to Kitwe CBD",
                "commercial_rental_zmw_month": {"small_shop": "900-1600"},
                "known_market_gaps": ["Electronics repair", "Printing services", "Affordable catering"],
                "competition_density": {"general_stores": "high", "salons": "high", "phone_repair": "medium"},
                "notes": "NEEDS_FOUNDER_REVIEW",
            },
            "kitwe_cbd": {
                "classification": "central_business_district",
                "income_bracket": "mixed",
                "population_density": "very_high_daytime",
                "dominant_occupations": ["all sectors — this is the commercial hub"],
                "avg_household_income_zmw": None,
                "transport_links": "All routes converge here",
                "commercial_rental_zmw_month": {"small_shop": "2000-5000", "medium_shop": "5000-15000"},
                "known_market_gaps": ["Premium services (CBD customers travel to Lusaka for these)", "Business support services"],
                "competition_density": {"general_retail": "very_high", "restaurants": "high", "banking": "high"},
                "notes": "High competition but high volume. Better for differentiated or premium services.",
            },
            "parklands": {
                "classification": "residential_middle_income",
                "income_bracket": "middle",
                "population_density": "medium",
                "dominant_occupations": ["professionals", "business owners", "government (senior)"],
                "avg_household_income_zmw": 8000,
                "commercial_rental_zmw_month": {"small_shop": "1500-3000"},
                "known_market_gaps": ["Premium food delivery", "Speciality grocery", "Professional services"],
                "notes": "NEEDS_FOUNDER_REVIEW — higher income, different spending patterns",
            },
        }
    },

    "ndola": {
        "city": "Ndola",
        "province": "Copperbelt",
        "classification": "urban",
        "population_estimate": 450000,
        "economic_character": "Industrial, oil refinery, cross-border trade with DRC, Copperbelt provincial capital",
        "income_distribution": "Mixed — industrial workers, traders, professionals",
        "major_employers": ["INDENI (oil refinery)", "manufacturing firms", "government", "cross-border trade"],
        "key_markets": ["Ndola City Market", "Masala Market"],
        "financing_sources": ["CEEC Copperbelt", "ZANACO Ndola", "DBZ", "microfinance institutions"],
        "needs_founder_review": True,
        "neighbourhoods": {
            "masala": {
                "classification": "residential_low_income",
                "income_bracket": "low",
                "population_density": "very_high",
                "dominant_occupations": ["informal traders", "labour workers", "petty traders"],
                "avg_household_income_zmw": 1800,
                "commercial_rental_zmw_month": {"small_shop": "500-1200"},
                "known_market_gaps": ["Affordable health products", "Mobile money agents", "Basic food processing"],
                "notes": "NEEDS_FOUNDER_REVIEW — dense, low-income, high demand for affordable services",
            },
            "ndola_cbd": {
                "classification": "central_business_district",
                "income_bracket": "mixed",
                "population_density": "high_daytime",
                "commercial_rental_zmw_month": {"small_shop": "1800-4500"},
                "notes": "NEEDS_FOUNDER_REVIEW",
            },
        }
    },

    "chingola": {
        "city": "Chingola",
        "province": "Copperbelt",
        "classification": "urban",
        "population_estimate": 200000,
        "economic_character": "Konkola Copper Mines hub, mining town, relatively high incomes",
        "income_distribution": "Skewed higher due to mining employment",
        "major_employers": ["Konkola Copper Mines (KCM)", "mining support services"],
        "key_markets": ["Chingola City Market"],
        "needs_founder_review": True,
        "notes": "NEEDS_FOUNDER_REVIEW — mining town dynamics, potential for premium services given mining incomes",
    },

    # ─── LUSAKA ────────────────────────────────────────────────────────
    "lusaka": {
        "city": "Lusaka",
        "province": "Lusaka",
        "classification": "urban",
        "population_estimate": 3000000,
        "economic_character": "Capital city, most diversified economy, government, finance, retail, services, manufacturing",
        "income_distribution": "Highly stratified — extreme wealth and extreme poverty coexist",
        "major_employers": ["Government", "financial sector", "retail/trade", "NGOs/development sector",
                            "manufacturing", "real estate", "hospitality"],
        "key_markets": ["Soweto Market (largest in Zambia)", "Comesa Market", "City Market", "Kamwala Market"],
        "financing_sources": ["All major banks", "CEEC Lusaka", "DBZ", "ZDA", "CDF (all constituencies)",
                              "Multiple microfinance institutions", "USAID-supported programs"],
        "needs_founder_review": True,
        "neighbourhoods": {
            "matero": {
                "classification": "residential_urban_low_income",
                "income_bracket": "low",
                "population_density": "very_high",
                "dominant_occupations": ["informal traders", "market vendors", "domestic workers",
                                         "transport workers", "government (junior)"],
                "avg_household_income_zmw": 1500,
                "transport_links": "Major bus routes, mini-buses to CBD, Cairo Road",
                "commercial_rental_zmw_month": {"small_shop": "600-1500", "market_stall": "200-600"},
                "known_market_gaps": ["Affordable quality food", "Phone charging and repair",
                                      "Water and sanitation products", "Children's educational materials",
                                      "Affordable health consultations"],
                "competition_density": {"general_stores": "very_high", "food_stalls": "very_high",
                                        "salons": "high", "phone_repair": "medium"},
                "customer_profile": "Highly price-sensitive. Volume over margin. Cash economy predominantly.",
                "notes": "NEEDS_FOUNDER_REVIEW — very high density, price-sensitive market, large youth population",
            },
            "kabulonga": {
                "classification": "residential_high_income",
                "income_bracket": "high",
                "population_density": "low",
                "dominant_occupations": ["senior professionals", "business owners", "expats",
                                         "senior government officials", "NGO directors"],
                "avg_household_income_zmw": 25000,
                "transport_links": "Private vehicle dominant, some taxis",
                "commercial_rental_zmw_month": {"small_retail": "4000-12000"},
                "known_market_gaps": ["Premium speciality food", "High-end personal services",
                                      "Pet care services", "Premium cleaning and household services",
                                      "Wellness and fitness services"],
                "competition_density": {"restaurants": "medium", "supermarkets": "low",
                                        "premium_services": "low"},
                "customer_profile": "Less price-sensitive. Values quality, reliability, and professionalism.",
                "notes": "NEEDS_FOUNDER_REVIEW — expat and senior professional market, premium pricing possible",
            },
            "chalala": {
                "classification": "residential_middle_income",
                "income_bracket": "middle",
                "population_density": "medium",
                "dominant_occupations": ["middle-level professionals", "business people", "teachers", "nurses"],
                "avg_household_income_zmw": 6500,
                "commercial_rental_zmw_month": {"small_shop": "2000-4500"},
                "known_market_gaps": ["Affordable quality restaurant", "Printing and stationery",
                                      "Electronics repair", "Laundry services"],
                "notes": "NEEDS_FOUNDER_REVIEW",
            },
            "kalingalinga": {
                "classification": "residential_peri-urban",
                "income_bracket": "lower-middle",
                "population_density": "very_high",
                "dominant_occupations": ["informal traders", "artisans", "transport", "domestic workers"],
                "avg_household_income_zmw": 2200,
                "commercial_rental_zmw_month": {"small_shop": "700-1800"},
                "known_market_gaps": ["Affordable food prep", "Phone services", "Basic financial services"],
                "notes": "NEEDS_FOUNDER_REVIEW — growing area, high density",
            },
            "woodlands": {
                "classification": "residential_middle_to_upper",
                "income_bracket": "upper-middle",
                "population_density": "low-medium",
                "dominant_occupations": ["professionals", "business owners", "senior employees"],
                "avg_household_income_zmw": 15000,
                "commercial_rental_zmw_month": {"small_shop": "3000-8000"},
                "known_market_gaps": ["Quality food delivery", "Boutique retail", "Professional services"],
                "notes": "NEEDS_FOUNDER_REVIEW",
            },
            "lusaka_cbd": {
                "classification": "central_business_district",
                "income_bracket": "mixed",
                "population_density": "very_high_daytime",
                "transport_links": "All routes — Cairo Road is the commercial spine",
                "commercial_rental_zmw_month": {"small_shop": "3000-10000", "office": "5000-25000"},
                "known_market_gaps": ["Affordable lunch options", "Business support services",
                                      "Courier/delivery services"],
                "notes": "NEEDS_FOUNDER_REVIEW — very high competition but very high volume",
            },
        }
    },

    # ─── SOUTHERN PROVINCE ────────────────────────────────────────────
    "livingstone": {
        "city": "Livingstone",
        "province": "Southern",
        "classification": "urban",
        "population_estimate": 180000,
        "economic_character": "Tourism capital, Victoria Falls, hospitality, cross-border with Zimbabwe",
        "income_distribution": "Tourism creates seasonal income peaks. Local incomes moderate.",
        "major_employers": ["Tourism and hospitality", "government", "retail", "cross-border trade"],
        "key_markets": ["Livingstone Market"],
        "unique_factors": [
            "Victoria Falls tourism drives significant foreign currency flow",
            "Seasonal peaks (July-October, December-January)",
            "Cross-border trade with Zimbabwe via Kazungula Bridge",
            "Adventure tourism market (bungee, rafting, safaris)",
            "Significant expat and tourist population creates premium service demand",
        ],
        "financing_sources": ["CEEC Southern Province", "ZANACO Livingstone", "ZDA tourism incentives"],
        "needs_founder_review": True,
        "notes": "Tourism economy requires seasonal business thinking. USD flows from tourists — USD-adjacent businesses viable.",
    },

    # ─── EASTERN PROVINCE ─────────────────────────────────────────────
    "chipata": {
        "city": "Chipata",
        "province": "Eastern",
        "classification": "urban",
        "population_estimate": 150000,
        "economic_character": "Agriculture hub, cross-border trade with Malawi, Eastern Province capital",
        "income_distribution": "Agriculture income dominant, seasonal fluctuations",
        "major_employers": ["Agriculture and agro-processing", "government", "cross-border trade", "NGOs"],
        "key_markets": ["Chipata Market"],
        "unique_factors": [
            "Major gateway to Malawi — cross-border trade opportunity",
            "Agricultural surplus region (maize, groundnuts, sunflower)",
            "Agro-processing opportunities significant",
            "Lower formal sector than Copperbelt/Lusaka",
        ],
        "financing_sources": ["CEEC Eastern Province", "ZANACO Chipata", "Agricultural finance (ZNFU programs)"],
        "needs_founder_review": True,
    },

    # ─── CENTRAL PROVINCE ─────────────────────────────────────────────
    "kabwe": {
        "city": "Kabwe",
        "province": "Central",
        "classification": "urban",
        "population_estimate": 250000,
        "economic_character": "Historic mining town, Central Province hub, transit point Lusaka-Copperbelt",
        "income_distribution": "Mixed — declining mining, growing services",
        "needs_founder_review": True,
    },

    # ─── NORTH-WESTERN PROVINCE ───────────────────────────────────────
    "solwezi": {
        "city": "Solwezi",
        "province": "North-Western",
        "classification": "urban",
        "population_estimate": 120000,
        "economic_character": "Fastest-growing town in Zambia, First Quantum Minerals base, new money influx",
        "income_distribution": "Significant high-income from mining — above average for Zambia",
        "major_employers": ["First Quantum Minerals (Kansanshi Mine)", "mining support services"],
        "unique_factors": [
            "Rapid growth creating infrastructure gaps — opportunity-rich",
            "High mining incomes create premium service demand",
            "Under-served for many services despite growing population",
            "Significant expat mining population",
        ],
        "financing_sources": ["CEEC", "Growing commercial bank presence"],
        "needs_founder_review": True,
        "notes": "High opportunity town due to growth rate exceeding service supply. Premium and volume both viable.",
    },
}


def get_town_profile(location_string: str) -> str:
    """
    Given a location string from user input, returns the relevant
    town profile as formatted text for injection into KIP's context.
    """
    location_lower = location_string.lower()

    # Find the best matching profile
    matched_city = None
    matched_neighbourhood = None

    for city_key, city_data in TOWN_PROFILES.items():
        if city_key in location_lower or city_data["city"].lower() in location_lower:
            matched_city = city_data
            # Check for neighbourhood match
            if "neighbourhoods" in city_data:
                for hood_key, hood_data in city_data["neighbourhoods"].items():
                    if hood_key in location_lower:
                        matched_neighbourhood = hood_data
                        matched_neighbourhood["_name"] = hood_key.replace("_", " ").title()
                        break
            break

    if not matched_city:
        return ""

    lines = [
        f"LOCATION: {matched_city['city']}, {matched_city['province']} Province",
        f"City Character: {matched_city['economic_character']}",
        f"Income Distribution: {matched_city['income_distribution']}",
    ]

    if "major_employers" in matched_city:
        lines.append(f"Major Employers: {', '.join(matched_city['major_employers'][:4])}")

    if "financing_sources" in matched_city:
        lines.append(f"Available Financing: {', '.join(matched_city['financing_sources'][:5])}")

    if "unique_factors" in matched_city:
        lines.append("Unique Economic Factors:")
        for f in matched_city["unique_factors"]:
            lines.append(f"  • {f}")

    if matched_neighbourhood:
        hood_name = matched_neighbourhood.get("_name", "Area")
        lines.append(f"\nNEIGHBOURHOOD DETAIL: {hood_name}")
        lines.append(f"  Classification: {matched_neighbourhood.get('classification', 'N/A')}")
        lines.append(f"  Income Bracket: {matched_neighbourhood.get('income_bracket', 'N/A')}")
        lines.append(f"  Population Density: {matched_neighbourhood.get('population_density', 'N/A')}")

        if matched_neighbourhood.get("avg_household_income_zmw"):
            lines.append(f"  Avg Household Income: K{matched_neighbourhood['avg_household_income_zmw']:,}/month")

        if matched_neighbourhood.get("dominant_occupations"):
            lines.append(f"  Dominant Occupations: {', '.join(matched_neighbourhood['dominant_occupations'][:4])}")

        if matched_neighbourhood.get("commercial_rental_zmw_month"):
            rentals = matched_neighbourhood["commercial_rental_zmw_month"]
            rental_str = " | ".join([f"{k}: K{v}" for k, v in list(rentals.items())[:3]])
            lines.append(f"  Commercial Rentals: {rental_str} per month")

        if matched_neighbourhood.get("known_market_gaps"):
            lines.append("  Known Market Gaps (opportunities):")
            for gap in matched_neighbourhood["known_market_gaps"][:5]:
                lines.append(f"    ◆ {gap}")

        if matched_neighbourhood.get("competition_density"):
            comp = matched_neighbourhood["competition_density"]
            comp_str = " | ".join([f"{k}: {v}" for k, v in list(comp.items())[:4]])
            lines.append(f"  Competition: {comp_str}")

        if matched_neighbourhood.get("customer_profile"):
            lines.append(f"  Customer Profile: {matched_neighbourhood['customer_profile']}")

        if matched_neighbourhood.get("transport_links"):
            lines.append(f"  Transport: {matched_neighbourhood['transport_links']}")

    return "\n".join(lines)
''')

# ─────────────────────────────────────────────────────
# KNOWLEDGE BASE — INITIAL CONTENT
# ─────────────────────────────────────────────────────
print('[ 3/6 ]  Writing knowledge base initial content...')
write('backend/app/data/initial_knowledge.py', r'''"""
KIP Knowledge Base — Initial Content
These are the foundational knowledge texts that are ingested into
ChromaDB on first setup. They cover core economics, finance, and
business principles relevant to KIP's function.

This is the "undergraduate curriculum" — the foundation.
More documents are added via the ingestion pipeline over time.
"""

INITIAL_KNOWLEDGE_TEXTS = [

{
"id": "econ_basics_01",
"category": "economics",
"subcategory": "microeconomics",
"title": "Supply, Demand and Market Equilibrium",
"content": """
Supply and demand is the fundamental model of how prices are determined in markets.
Demand refers to the quantity of a good or service that consumers are willing and
able to purchase at various prices. The law of demand states that as price increases,
quantity demanded decreases — consumers buy less when things cost more.

Supply refers to the quantity a producer is willing to offer at various prices.
The law of supply states that as price increases, quantity supplied increases —
producers make more when prices are higher.

Market equilibrium occurs where supply equals demand — the price at which the
market clears with no shortage or surplus. In Zambian markets, this equilibrium
can be affected by currency fluctuations (affecting imported goods costs),
seasonal agricultural supply, and informal sector pricing.

Price elasticity measures how sensitive demand is to price changes. Essential
goods (food, transport) tend to be inelastic — people buy them regardless of
price. Luxury goods are elastic — people reduce purchases significantly when
prices rise. For SME pricing strategy in Zambia, understanding whether your
product is essential or discretionary determines your pricing power.

Market structures range from perfect competition (many sellers, identical products,
no pricing power — like maize meal in Zambia) to monopoly (one seller, full pricing
power). Most Zambian SMEs operate in monopolistic competition — many sellers but
differentiated products, giving some pricing power.
""",
"zambia_relevance": "high"
},

{
"id": "econ_basics_02",
"category": "economics",
"subcategory": "macroeconomics",
"title": "Inflation, Purchasing Power and Zambian Context",
"content": """
Inflation is the rate at which the general price level rises, reducing the
purchasing power of money. If inflation is 15%, K1,000 today buys what K870
bought a year ago. For entrepreneurs, inflation affects both costs and revenue.

In Zambia, inflation is primarily driven by:
1. Food prices — maize meal, cooking oil, and vegetables are major drivers
2. Fuel prices — affect transport costs throughout the supply chain
3. ZMW/USD exchange rate — Zambia imports many goods, so a weaker kwacha
   directly increases the cost of imported products
4. Money supply — Bank of Zambia monetary policy

The impact of inflation on SMEs in Zambia:
- Input costs rise, squeezing profit margins if prices are not adjusted
- Customers have less real purchasing power — demand for non-essentials falls
- Businesses holding inventory benefit from rising prices
- Businesses with fixed-price contracts lose when costs rise

Inflation protection strategies for Zambian SMEs:
- Price products regularly — monthly review is minimum when inflation is high
- Hold physical inventory rather than cash during high inflation periods
- Source locally where possible to reduce USD exchange rate exposure
- Build a loyal customer base willing to accept price adjustments

The Bank of Zambia targets inflation and uses interest rates as its primary tool.
When inflation is high, BoZ raises interest rates, making borrowing more expensive.
This is why loan costs in Zambia tend to be high — a direct consequence of
inflation management policy.
""",
"zambia_relevance": "very_high"
},

{
"id": "finance_basics_01",
"category": "finance",
"subcategory": "financial_mathematics",
"title": "Time Value of Money and Business Applications",
"content": """
The time value of money is the principle that money available now is worth
more than the same amount in the future, because it can be invested and earn returns.

Key concepts:
- Present Value (PV): What a future amount is worth today
- Future Value (FV): What an amount today will be worth in future
- Net Present Value (NPV): The present value of all future cash flows minus
  the initial investment — the primary tool for evaluating business opportunities

Formula: PV = FV / (1 + r)^n
Where r = interest rate and n = number of periods

Break-even Analysis for Zambian SMEs:
Break-even point = Fixed Costs / (Price per unit - Variable cost per unit)

Example: A phone repair shop in Kitwe
- Monthly rent: K1,200
- Monthly utilities and supplies: K400
- Monthly total fixed costs: K1,600
- Average revenue per repair: K150
- Average parts cost per repair: K60
- Contribution margin per repair: K90
- Break-even: K1,600 / K90 = 18 repairs per month

This means 18 repairs just to break even. Every repair above 18 is profit.
With 4-5 repairs per day (realistic for a skilled technician), monthly
revenue would be approximately K3,000-K4,500 for net profit of K1,400-K2,900.

Loan amortisation: Understanding how business loans work is critical for
Zambian entrepreneurs. A K10,000 CEEC loan at 8% interest over 12 months
costs approximately K867/month in repayments. This must be factored into
cash flow projections from day one.
""",
"zambia_relevance": "high"
},

{
"id": "finance_basics_02",
"category": "finance",
"subcategory": "business_finance",
"title": "Reading Financial Statements — Simplified for SMEs",
"content": """
Financial statements are the language of business. Even micro-entrepreneurs
benefit from understanding three core documents:

1. PROFIT AND LOSS STATEMENT (Income Statement)
   Shows revenue, costs, and profit over a period.
   Revenue - Cost of Goods Sold = Gross Profit
   Gross Profit - Operating Expenses = Net Profit

   Example for a Lusaka tailoring business (monthly):
   Revenue: K4,500 (15 outfits at K300 average)
   Fabric and materials: K1,800 (40% of revenue)
   Gross Profit: K2,700
   Rent: K900 | Transport: K200 | Phone: K100
   Net Profit: K1,500 (33% net margin — healthy for a service business)

2. CASH FLOW STATEMENT
   More important than profit for SMEs. Profitable businesses fail because
   they run out of cash. Common in Zambia when customers pay late.
   Cash flow = Cash received - Cash paid out in the period
   Always maintain a cash reserve of 1-2 months operating costs.

3. SIMPLE BALANCE SHEET
   Assets (what you own) = Liabilities (what you owe) + Owner's Equity
   For micro-businesses: Track stock value, equipment, cash (assets)
   and any loans or supplier credit (liabilities).

Key financial ratios for Zambian SMEs:
- Gross Profit Margin: Gross Profit / Revenue × 100
  Target: 30-60% for products, 50-80% for services
- Net Profit Margin: Net Profit / Revenue × 100
  Target: 10-25% sustainable business
- Stock Turnover: How many times stock is sold in a period
  Target: Depends on sector. Food: 12-52x per year. Electronics: 3-6x per year.
""",
"zambia_relevance": "very_high"
},

{
"id": "business_basics_01",
"category": "business",
"subcategory": "entrepreneurship",
"title": "Business Model Design — The Building Blocks",
"content": """
A business model answers the fundamental questions: Who are your customers?
What value do you provide? How do you deliver it? How do you make money?

The Business Model Canvas (Alexander Osterwalder) identifies 9 components:
1. Customer Segments — who exactly pays you
2. Value Proposition — what problem you solve or benefit you provide
3. Channels — how customers access your product/service
4. Customer Relationships — how you maintain customer loyalty
5. Revenue Streams — how you earn money (and how much per transaction)
6. Key Resources — what you need to operate (people, equipment, knowledge)
7. Key Activities — what you actually do every day
8. Key Partnerships — who you work with (suppliers, distributors)
9. Cost Structure — what you spend money on

Revenue model types relevant for Zambian SMEs:
- PRODUCT SALES: Buy low, sell high. Most common. Margins depend on
  competition and supplier relationships.
- SERVICE FEES: Charge for your time/skills. High margin, low capital.
  Phone repair, tailoring, accounting, tutoring.
- COMMISSION/AGENT: Earn a percentage for connecting buyers and sellers.
  Real estate, insurance, FMCG distribution.
- SUBSCRIPTION: Recurring payment for ongoing service. Less common in
  Zambia but growing with digital services.
- ASSET UTILISATION: Earn from renting assets. Chairs at market stall,
  equipment rental, room rental.

Market entry strategy for Zambian SMEs:
1. Start with a specific niche — be the best at one thing in one area
2. Build a loyal customer base before expanding
3. Reinvest profits, not take them all out initially
4. Understand your customer better than anyone else does
""",
"zambia_relevance": "very_high"
},

{
"id": "business_basics_02",
"category": "business",
"subcategory": "marketing",
"title": "Marketing for Zambian SMEs — Practical Approaches",
"content": """
Marketing is how potential customers find out you exist and choose you over
alternatives. For Zambian SMEs with limited budgets, the most effective
approaches are:

1. WORD OF MOUTH — Still the most powerful in Zambian communities.
   Every satisfied customer becomes a marketing channel. Deliver quality,
   treat people well, and ask satisfied customers to tell others.
   Strategy: Give 10% discount to customers who bring a new customer.

2. FACEBOOK/SOCIAL MEDIA — Zambia has ~6 million Facebook users.
   Free to use. Effective for visual products (food, clothing, products).
   Strategy: Post photos of your work daily. Respond to comments quickly.
   Join local neighbourhood Facebook groups and participate genuinely.

3. LOCATION/SIGNAGE — Physical visibility matters enormously in Zambia's
   walking-heavy culture. A clear, professional sign pays for itself quickly.
   Strategy: Bright colours, clear business name, what you sell/do.

4. COMMUNITY PRESENCE — Church networks, market associations, resident
   associations, school parent groups. These are trusted referral networks.

5. MOBILE MONEY PROMOTION — Accept MTN MoMo and Airtel Money.
   This is increasingly expected and removes a purchase barrier.

The 4Ps of Marketing in Zambian Context:
- PRODUCT: Localise — what works in Lusaka may not work in Kasama
- PRICE: Zambian consumers are price-sensitive; communicate value clearly
- PLACE: Location is crucial — foot traffic vs delivery vs market stall
- PROMOTION: Community and social media first; expensive advertising later

Pricing psychology in Zambia:
- K99 feels significantly cheaper than K100 (effective)
- Bundle pricing works (3 for K250 instead of K90 each)
- "First purchase" discounts build customer acquisition
- Credit/layby builds loyalty but requires cash flow management
""",
"zambia_relevance": "very_high"
},

{
"id": "zambia_econ_01",
"category": "zambia",
"subcategory": "economic_structure",
"title": "Zambia's Economic Structure and SME Landscape",
"content": """
Zambia's economic structure as of 2024:
- GDP: Approximately USD 27-30 billion (medium-income by African standards)
- Primary driver: Copper mining (~70% of export earnings)
- Currency: Zambian Kwacha (ZMW) — historically volatile against USD
- Inflation: Has ranged 10-25% in recent years; food and fuel are key drivers
- Formal employment: Only ~15% of working population in formal sector
- Informal sector: ~85% of working Zambians — the primary target for KIP

The informal economy in Zambia is not a failure of development —
it is the dominant economic reality. Successful entrepreneurs understand
how it works:
- Transactions are predominantly cash-based (mobile money is growing)
- Trust and reputation are the primary business assets
- Supply chains are often informal and relationship-based
- Regulation is light in practice even when it exists in theory
- Community networks are more powerful than advertising

SME challenges in Zambia:
- Access to capital: Most banks require collateral that SMEs don't have
- Market information: Limited data on what businesses succeed where
- Regulatory complexity: PACRA, ZRA, local authority requirements
- Infrastructure: Power outages, road conditions affect operations
- Competition from imports: Cheap Chinese goods compete with local production

SME opportunities in Zambia:
- Large young population creates demand for youth-oriented services
- Growing middle class in urban areas demands quality goods and services
- Mobile phone penetration creates new business model possibilities
- Regional trade: Zambia borders 8 countries — cross-border trade opportunities
- Agricultural value addition: Zambia produces raw materials, processes little
- Tourism: Growing sector especially around Victoria Falls and national parks
""",
"zambia_relevance": "very_high"
},

{
"id": "zambia_finance_01",
"category": "zambia",
"subcategory": "financing",
"title": "SME Financing Landscape in Zambia",
"content": """
Access to capital is the primary constraint for Zambian SMEs. Here is the
complete landscape of available financing options:

GOVERNMENT PROGRAMMES:
1. CEEC (Citizens Economic Empowerment Commission)
   - Focus: Zambian citizens, especially women and youth
   - Loan range: K5,000 to K500,000
   - Interest rate: Below commercial rates (around 8-15%)
   - Requirements: Business plan, NRC, proof of concept
   - How to apply: Visit CEEC provincial office or ceec.org.zm
   - Time to funds: 4-12 weeks typically

2. CDF (Constituency Development Fund)
   - Focus: Community projects and small businesses in the constituency
   - Amount: Varies by constituency; K5,000-K50,000 for small businesses
   - Interest: Often zero-interest grant component
   - How to apply: Through your local ward councillor or MP office
   - Tip: Social enterprises and community-benefit businesses favoured

3. DBZ (Development Bank of Zambia)
   - Focus: Larger SME investments, agriculture, manufacturing
   - Loan range: K20,000 and above
   - Requirement: Business plan, financial projections, security
   - Better for established businesses seeking growth capital

COMMERCIAL BANKS (higher rates, more accessible for established businesses):
- ZANACO: SME products, mobile banking strong
- FNB Zambia: SME loans, good branch network in Copperbelt
- Stanbic, Standard Chartered, Absa: More for medium enterprises

MICROFINANCE (accessible but expensive):
- FINCA Zambia: Group lending, individual loans K500-K20,000
- Bayport Financial Services: Quick personal/business loans
- Madison Finance: Short-term loans
- Note: Interest rates are high (40-80% per annum). Use only for short-term needs.

INFORMAL MECHANISMS:
- VSLA (Village Savings and Loan Associations): Community groups where
  members save together and can borrow 2-3x their savings. Common in
  peri-urban and rural areas. Zero external oversight — trust-based.
- Chama (Rotating savings): Group of friends pool money, each member
  gets the full pool on rotation. No interest. Good for lumpy capital needs.

AGRICULTURAL SPECIFIC:
- ZNFU (Zambia National Farmers Union): Programs for agri-SMEs
- Contract farming: Zambeef, Zambia Sugar offer input credit to outgrowers
""",
"zambia_relevance": "very_high"
},

{
"id": "development_econ_01",
"category": "economics",
"subcategory": "development",
"title": "Development Economics and African Markets",
"content": """
Development economics studies how economies in lower-income countries grow
and how to accelerate that process. Key concepts relevant to Zambian entrepreneurs:

COMPARATIVE ADVANTAGE: Countries and regions produce what they are relatively
better at producing. Zambia's comparative advantages include: copper mining,
agriculture (good land and rainfall), tourism (natural wonders), and increasingly,
services. Entrepreneurs should align with these advantages where possible.

THE POVERTY TRAP: People without capital cannot invest; without investment,
cannot earn returns; without returns, cannot accumulate capital. CEEC, CDF, and
microfinance programs exist precisely to break this cycle. KIP's financing guidance
helps entrepreneurs escape the trap.

DUAL ECONOMY: Most developing countries, including Zambia, have a dual economy:
a modern formal sector and a traditional informal sector. Successful SMEs often
bridge these two worlds — operating informally but serving formal-sector customers,
or formalising to access formal-sector opportunities (government contracts, bank loans).

MARKET FAILURES in African contexts:
- Information asymmetry: Sellers know more than buyers (quality uncertainty)
- Missing markets: Financial services, insurance not available to all
- Public goods: Roads, electricity often unreliable
These failures create business opportunities for those who solve them.

NETWORK EFFECTS in African markets: Community networks (church, tribe, region)
drive economic transactions more than formal mechanisms. Trust is currency.
Reputation spreads rapidly through these networks — both positive and negative.

LEAPFROGGING: African markets skip technologies. Zambia largely skipped
landlines and went directly to mobile. Mobile money (MoMo) is more common
than traditional banking for many. Entrepreneurs who leverage these leapfrogged
technologies gain significant advantages.
""",
"zambia_relevance": "high"
},

]
''')

# ─────────────────────────────────────────────────────
# VECTOR DATABASE + RAG ENGINE
# ─────────────────────────────────────────────────────
print('[ 4/6 ]  Writing RAG engine and knowledge base...')
write('backend/app/services/knowledge_base.py', '''"""
KIP Knowledge Base — RAG (Retrieval-Augmented Generation) Engine

Manages the ChromaDB vector database and provides semantic search
over KIP\'s knowledge corpus.

On first run, initialises the database with the built-in knowledge texts.
Documents can be added at any time using the ingestion pipeline.
"""

import os
import hashlib
from typing import List, Dict, Optional

# We import with graceful fallback so the app runs even if packages
# aren\'t installed yet (user will see a warning)
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
except ImportError:
    ST_AVAILABLE = False

from app.data.initial_knowledge import INITIAL_KNOWLEDGE_TEXTS

DB_PATH = os.path.join(os.path.dirname(__file__), "../../kip_knowledge_db")
COLLECTION_NAME = "kip_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500      # words per chunk
CHUNK_OVERLAP = 50    # word overlap between chunks
TOP_K = 4             # number of chunks to retrieve per query


class KnowledgeBase:
    """
    KIP\'s RAG knowledge system.
    Stores document embeddings in ChromaDB and provides semantic search.
    """

    def __init__(self):
        self._client = None
        self._collection = None
        self._embedder = None
        self._ready = False
        self._init()

    def _init(self):
        if not CHROMADB_AVAILABLE:
            print("[KIP Knowledge] ChromaDB not installed. Install with: pip install chromadb")
            return
        if not ST_AVAILABLE:
            print("[KIP Knowledge] sentence-transformers not installed. Install with: pip install sentence-transformers")
            return

        try:
            os.makedirs(DB_PATH, exist_ok=True)
            self._client = chromadb.PersistentClient(path=DB_PATH)
            self._collection = self._client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            self._embedder = SentenceTransformer(EMBEDDING_MODEL)
            self._ready = True

            # Seed with initial knowledge if empty
            if self._collection.count() == 0:
                print("[KIP Knowledge] Seeding knowledge base with initial content...")
                self._seed_initial_knowledge()
                print(f"[KIP Knowledge] Seeded {self._collection.count()} knowledge chunks.")
            else:
                print(f"[KIP Knowledge] Loaded. {self._collection.count()} chunks in database.")

        except Exception as e:
            print(f"[KIP Knowledge] Init error: {e}")
            self._ready = False

    def _seed_initial_knowledge(self):
        """Load the built-in knowledge texts into ChromaDB."""
        for doc in INITIAL_KNOWLEDGE_TEXTS:
            self.add_document(
                text=doc["content"],
                metadata={
                    "source": doc["id"],
                    "category": doc["category"],
                    "subcategory": doc.get("subcategory", ""),
                    "title": doc["title"],
                    "zambia_relevance": doc.get("zambia_relevance", "medium"),
                }
            )

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
            chunk = " ".join(words[i:i + CHUNK_SIZE])
            if chunk.strip():
                chunks.append(chunk)
        return chunks

    def add_document(self, text: str, metadata: Dict = None) -> int:
        """
        Add a document to the knowledge base.
        The document is split into chunks and each chunk is embedded.
        Returns the number of chunks added.
        """
        if not self._ready:
            return 0

        chunks = self._chunk_text(text.strip())
        if not chunks:
            return 0

        doc_id = metadata.get("source", hashlib.md5(text.encode()).hexdigest()[:12])

        ids, embeddings, documents, metadatas = [], [], [], []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{i}"
            # Skip if already exists
            try:
                existing = self._collection.get(ids=[chunk_id])
                if existing["ids"]:
                    continue
            except:
                pass

            embedding = self._embedder.encode(chunk).tolist()
            ids.append(chunk_id)
            embeddings.append(embedding)
            documents.append(chunk)
            metadatas.append({**(metadata or {}), "chunk_index": i, "doc_id": doc_id})

        if ids:
            self._collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

        return len(ids)

    def search(self, query: str, top_k: int = TOP_K,
               category_filter: Optional[str] = None) -> str:
        """
        Search the knowledge base for content relevant to the query.
        Returns formatted text ready for injection into the system prompt.
        """
        if not self._ready:
            return ""

        try:
            query_embedding = self._embedder.encode(query).tolist()

            where = {"category": category_filter} if category_filter else None
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, self._collection.count()),
                where=where,
                include=["documents", "metadatas", "distances"]
            )

            if not results["documents"] or not results["documents"][0]:
                return ""

            retrieved = []
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            ):
                relevance = 1 - dist  # cosine similarity
                if relevance < 0.2:   # skip low-relevance chunks
                    continue
                title = meta.get("title", meta.get("source", "Knowledge"))
                retrieved.append(f"[{title}]\\n{doc.strip()}")

            if not retrieved:
                return ""

            return "\\n\\n---\\n\\n".join(retrieved)

        except Exception as e:
            print(f"[KIP Knowledge] Search error: {e}")
            return ""

    def add_pdf(self, pdf_path: str, metadata: Dict = None) -> int:
        """Add a PDF document to the knowledge base."""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            meta = metadata or {}
            meta["source"] = os.path.basename(pdf_path)
            return self.add_document(text, meta)
        except ImportError:
            print("[KIP Knowledge] PyMuPDF not installed. Run: pip install pymupdf")
            return 0
        except Exception as e:
            print(f"[KIP Knowledge] PDF error: {e}")
            return 0

    def stats(self) -> Dict:
        """Return knowledge base statistics."""
        if not self._ready:
            return {"status": "not_ready", "chunks": 0}
        return {"status": "ready", "chunks": self._collection.count()}


# Singleton instance
_knowledge_base = None

def get_knowledge_base() -> KnowledgeBase:
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = KnowledgeBase()
    return _knowledge_base
''')

# ─────────────────────────────────────────────────────
# FULL KIP ENGINE
# ─────────────────────────────────────────────────────
write('backend/app/services/kip_engine.py', '''"""
K-BIG-1 — KIP Business Idea Generation Engine
Full implementation with RAG knowledge retrieval and town intelligence.
"""

import os
import re
import json
from typing import List, Tuple
import anthropic

from app.services.kip_prompt import build_system_prompt
from app.services.knowledge_base import get_knowledge_base
from app.data.town_profiles import get_town_profile


def _extract_location(text: str) -> str:
    """Extract location mentions from user message."""
    # Common Zambian location patterns
    locations = [
        "riverside", "kitwe", "ndola", "lusaka", "livingstone", "chipata",
        "kabwe", "solwezi", "chingola", "mufulira", "kasama", "mansa", "mongu",
        "matero", "kabulonga", "woodlands", "chalala", "kalingalinga",
        "chelstone", "garden", "avondale", "roma", "ibex", "longacres",
        "nkana", "parklands", "masala", "cbd",
    ]
    text_lower = text.lower()
    found = [loc for loc in locations if loc in text_lower]
    return " ".join(found) if found else ""


def _extract_factors(messages: list, user_message: str) -> dict:
    """Extract key factors from the conversation for context building."""
    full_text = user_message
    for m in messages[-6:]:  # last 6 messages for context
        full_text += " " + m.content

    factors = {
        "location": _extract_location(full_text),
        "is_business_request": any(kw in full_text.lower() for kw in [
            "business", "start", "money", "idea", "capital", "invest",
            "kwacha", "earn", "income", "work for myself", "entrepreneur"
        ]),
        "is_academic": any(kw in full_text.lower() for kw in [
            "what is", "explain", "define", "how does", "calculate",
            "formula", "theory", "concept", "assignment", "question",
            "economics", "finance", "accounting", "marketing",
        ]),
    }
    return factors


async def generate_kip_response(
    user_message: str,
    history: list,
    user,
    db=None
) -> Tuple[str, bool]:
    """
    The K-BIG-1 engine. Generates an intelligent KIP response.

    Flow:
    1. Extract factors (location, request type)
    2. Retrieve relevant knowledge from ChromaDB
    3. Get town profile for location mentioned
    4. Build the complete system prompt
    5. Call Claude API
    6. Return response + idea_detected flag

    Returns:
        (reply_text, idea_was_detected)
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    # ── Placeholder if no API key ──
    if not api_key or api_key == "your-anthropic-api-key-here":
        return (
            f"Hello {user.full_name.split()[0]}! I\'m KIP — your AI business intelligence advisor. "
            "My intelligence engine is ready and waiting for your Anthropic API key to be set in "
            "backend\\\\.env.\\n\\n"
            "Once configured, I can:\\n"
            "• Generate personalised business ideas based on your capital and location\\n"
            "• Answer economics, finance, and business questions at an academic level\\n"
            "• Guide you through starting and running a profitable business\\n\\n"
            f"You asked: *{user_message}*\\n\\n"
            "Set your ANTHROPIC_API_KEY in backend\\\\.env and restart the server to activate K-BIG-1.",
            False
        )

    # ── Step 1: Extract factors ──
    factors = _extract_factors(history, user_message)

    # ── Step 2: Retrieve relevant knowledge ──
    kb = get_knowledge_base()
    retrieved_knowledge = kb.search(user_message, top_k=4)

    # ── Step 3: Get town profile ──
    town_profile = ""
    if factors["location"]:
        town_profile = get_town_profile(factors["location"])

    # ── Step 4: Get user idea history (avoid repeats) ──
    idea_history = ""
    if db:
        try:
            from app.models.business_idea import BusinessIdea
            past_ideas = db.query(BusinessIdea).filter(
                BusinessIdea.user_id == user.id
            ).order_by(BusinessIdea.created_at.desc()).limit(10).all()
            if past_ideas:
                idea_history = "Previously generated ideas for this user (DO NOT repeat these):\\n"
                for idea in past_ideas:
                    idea_history += f"  • {idea.idea_name} ({idea.location or \'no location\'})\\n"
        except:
            pass

    # ── Step 5: Build system prompt ──
    system_prompt = build_system_prompt(
        retrieved_knowledge=retrieved_knowledge,
        town_profile=town_profile,
        user_idea_history=idea_history
    )

    # ── Step 6: Build message history ──
    messages = []
    for msg in history[-12:]:  # last 12 messages for context window
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message})

    # ── Step 7: Call Claude API ──
    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system_prompt,
        messages=messages
    )
    reply = response.content[0].text

    # ── Step 8: Detect if a business idea was generated ──
    idea_keywords = [
        "recommendation", "i recommend", "🏢", "capital breakdown",
        "monthly profit", "break-even", "financial projection",
        "first 30 days", "why this works here"
    ]
    idea_detected = any(kw in reply.lower() for kw in idea_keywords)

    # ── Step 9: If idea detected, save to repository ──
    if idea_detected and db:
        try:
            _save_idea_to_repository(reply, user_message, user, factors, db)
        except Exception as e:
            print(f"[KIP] Could not save idea to repository: {e}")

    return reply, idea_detected


def _save_idea_to_repository(reply: str, user_message: str, user, factors: dict, db):
    """Extract idea details from KIP\'s response and save to database."""
    from app.models.business_idea import BusinessIdea

    # Extract idea name from response
    idea_name = "Business Idea"
    name_match = re.search(r"RECOMMENDATION\\s*\\n+(.+?)\\n", reply, re.IGNORECASE)
    if name_match:
        idea_name = name_match.group(1).strip().lstrip("🏢 ").strip()

    # Extract a summary (first meaningful paragraph after recommendation)
    summary = reply[:300] + "..." if len(reply) > 300 else reply

    # Extract capital if mentioned
    capital_match = re.search(r"K\\s*([\\d,]+)", user_message)
    capital = float(capital_match.group(1).replace(",", "")) if capital_match else None

    idea = BusinessIdea(
        user_id=user.id,
        idea_name=idea_name,
        idea_summary=summary,
        full_response=reply,
        location=factors.get("location", ""),
        capital_amount=capital,
        generated_by_kip=True,
    )
    db.add(idea)
    db.commit()
''')

# ─────────────────────────────────────────────────────
# KNOWLEDGE INGESTION PIPELINE
# ─────────────────────────────────────────────────────
print('[ 5/6 ]  Writing ingestion pipeline...')
write('backend/ingest.py', '''#!/usr/bin/env python3
"""
KIP Knowledge Ingestion Pipeline
=================================
Add any document to KIP\'s knowledge base with one command.

Usage:
  # Add a PDF:
  python ingest.py document.pdf --category economics --title "World Bank Zambia Report"

  # Add a website URL:
  python ingest.py --url https://boz.zm/reports --category zambia --title "Bank of Zambia Report"

  # Add all PDFs in a folder:
  python ingest.py --folder ./business_plans --category business

  # Check knowledge base stats:
  python ingest.py --stats

After ingestion, KIP immediately has access to the new knowledge.
No restart required.
"""

import sys
import os
import argparse

# Add parent to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

from app.services.knowledge_base import get_knowledge_base


def main():
    parser = argparse.ArgumentParser(description="KIP Knowledge Ingestion Pipeline")
    parser.add_argument("path", nargs="?", help="Path to PDF file to ingest")
    parser.add_argument("--url", help="URL to scrape and ingest")
    parser.add_argument("--folder", help="Folder of PDFs to ingest")
    parser.add_argument("--category", default="general",
                        choices=["economics", "finance", "business", "zambia", "news", "general"],
                        help="Knowledge category")
    parser.add_argument("--title", default="", help="Document title")
    parser.add_argument("--stats", action="store_true", help="Show knowledge base statistics")
    parser.add_argument("--text", help="Ingest raw text string directly")

    args = parser.parse_args()

    print("\\n╔══════════════════════════════════════════╗")
    print("║   KIP Knowledge Ingestion Pipeline        ║")
    print("╚══════════════════════════════════════════╝\\n")

    kb = get_knowledge_base()

    if args.stats:
        stats = kb.stats()
        print(f"Knowledge Base Status: {stats[\'status\']}")
        print(f"Total chunks in database: {stats[\'chunks\']}")
        return

    if args.text:
        chunks = kb.add_document(
            args.text,
            {"source": "manual_input", "category": args.category, "title": args.title or "Manual Input"}
        )
        print(f"✓  Added {chunks} chunks from text input.")
        return

    if args.folder:
        import glob
        pdfs = glob.glob(os.path.join(args.folder, "**/*.pdf"), recursive=True)
        pdfs += glob.glob(os.path.join(args.folder, "*.pdf"))
        pdfs = list(set(pdfs))
        print(f"Found {len(pdfs)} PDF files in {args.folder}")
        total = 0
        for pdf in pdfs:
            chunks = kb.add_pdf(pdf, {
                "category": args.category,
                "title": os.path.splitext(os.path.basename(pdf))[0]
            })
            total += chunks
            print(f"  ✓  {os.path.basename(pdf)} — {chunks} chunks")
        print(f"\\nTotal: {total} chunks added from {len(pdfs)} files.")
        return

    if args.url:
        try:
            from bs4 import BeautifulSoup
            import urllib.request
            print(f"Fetching: {args.url}")
            req = urllib.request.Request(args.url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read()
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            if len(text) < 100:
                print("Warning: Very little text extracted from URL.")
            chunks = kb.add_document(text, {
                "source": args.url,
                "category": args.category,
                "title": args.title or args.url
            })
            print(f"✓  Added {chunks} chunks from {args.url}")
        except ImportError:
            print("beautifulsoup4 not installed. Run: pip install beautifulsoup4")
        except Exception as e:
            print(f"Error fetching URL: {e}")
        return

    if args.path:
        if not os.path.exists(args.path):
            print(f"File not found: {args.path}")
            return
        chunks = kb.add_pdf(args.path, {
            "category": args.category,
            "title": args.title or os.path.splitext(os.path.basename(args.path))[0]
        })
        print(f"✓  Added {chunks} chunks from {args.path}")
        print(f"\\nKIP now has access to this knowledge immediately.")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
''')

# ─────────────────────────────────────────────────────
# UPDATED REQUIREMENTS
# ─────────────────────────────────────────────────────
print('[ 6/6 ]  Updating requirements...')
write('backend/requirements.txt', """# KIP Backend — Python 3.13 Compatible
# Install with: pip install -r requirements.txt
# NOTE: Do NOT pin chromadb or sentence-transformers — use latest for Python 3.13 wheel support

# Core API framework
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
python-multipart>=0.0.12

# Database
sqlalchemy>=2.0.35

# Auth (Python 3.13 compatible — no Rust compilation needed)
PyJWT>=2.9.0
bcrypt>=4.2.0

# AI engine
anthropic>=0.40.0

# Config
python-dotenv>=1.0.1
pydantic[email]>=2.9.0
email-validator>=2.2.0

# HTTP client
httpx>=0.27.0
aiofiles>=24.1.0

# ── Knowledge Base (install separately after core setup) ──
# Run: pip install chromadb sentence-transformers pymupdf beautifulsoup4
# These are larger packages — install after confirming core works.
# chromadb          # Vector database for RAG
# sentence-transformers  # Text embeddings
# pymupdf           # PDF text extraction (also known as fitz)
# beautifulsoup4    # Web scraping for news feed
""")

write('backend/KB_SETUP.md', """# KIP Knowledge Base Setup

After the core backend is running, install the knowledge base packages:

```bash
# Activate your venv first (in PyCharm terminal):
pip install chromadb sentence-transformers pymupdf beautifulsoup4

# The knowledge base initialises automatically on first server start.
# You'll see: [KIP Knowledge] Seeding knowledge base with initial content...
```

## Adding Documents to KIP's Brain

```bash
# From the backend/ folder, with venv active:

# Add a PDF (e.g. World Bank Zambia report):
python ingest.py "C:/path/to/report.pdf" --category economics --title "World Bank Zambia 2024"

# Add all business plans from a folder:
python ingest.py --folder "C:/path/to/business_plans" --category business

# Add content from a website:
python ingest.py --url https://boz.zm/monetary-policy --category zambia --title "BoZ Monetary Policy"

# Check how many knowledge chunks are loaded:
python ingest.py --stats
```

## Recommended Documents to Add First (Priority 1)

1. Download Zambia 2025 National Budget speech (Ministry of Finance website)
2. Download Bank of Zambia latest Annual Report (boz.zm)
3. Add all 300 business plans from your existing collection
4. Download ZRA SME tax guide (zra.org.zm)
5. Download CEEC programme guide (ceec.org.zm)

Each document added makes KIP smarter immediately.
""")

print('\n╔══════════════════════════════════════════════╗')
print('║   Sprint 2 Build Complete!                    ║')
print('║                                               ║')
print('║   Files created:                              ║')
print('║   backend/app/services/kip_prompt.py          ║')
print('║   backend/app/services/kip_engine.py          ║')
print('║   backend/app/services/knowledge_base.py      ║')
print('║   backend/app/data/town_profiles.py           ║')
print('║   backend/app/data/initial_knowledge.py       ║')
print('║   backend/ingest.py                           ║')
print('║   backend/requirements.txt (updated)          ║')
print('║   backend/KB_SETUP.md                         ║')
print('║                                               ║')
print('║   Next: Run in PyCharm terminal:              ║')
print('║   pip install chromadb sentence-transformers  ║')
print('║              pymupdf beautifulsoup4            ║')
print('║   Then restart the backend server.            ║')
print('╚══════════════════════════════════════════════╝\n')
