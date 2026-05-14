"""
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
        lines.append(f" Neighbourhood: {hood_name}")
        # NEIGHBOURHOOD DETAIL:
        #         lines.append(f"  Classification: {matched_neighbourhood.get('classification', 'N/A')}")
        #         lines.append(f"  Income Bracket: {matched_neighbourhood.get('income_bracket', 'N/A')}")
        #         lines.append(f"  Population Density: {matched_neighbourhood.get('population_density', 'N/A')}")

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

    return " ".join(lines)
