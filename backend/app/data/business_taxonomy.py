"""
Controlled vocabularies for KIP's field data collection (ground truth layer).

Kept in code rather than a DB table so the collector app and the server
always agree on one versioned list. Bump TAXONOMY_VERSION on any change;
the app re-downloads the list when the version differs.

Sub-types map to the 13 KIP idea categories (see kip_prompt_v2.IDEA_SCHEMA)
and carry an ISIC Rev.4 class so the dataset can be compared with ZamStats
and other official statistics.
"""

TAXONOMY_VERSION = "2026-10-1"

# code: (label, kip_category, isic_rev4)
BUSINESS_SUBTYPES = {
    # ── Food and catering ──
    "grocery_kantemba":     ("Grocery / kantemba",               "retail_and_trade",   "4711"),
    "fresh_produce":        ("Vegetables and fruit",              "food_and_catering",  "4721"),
    "butchery":             ("Butchery / meat",                   "food_and_catering",  "4721"),
    "fish_kapenta":         ("Fish and kapenta",                  "food_and_catering",  "4721"),
    "live_chickens":        ("Live chickens / poultry sales",     "agriculture",        "4721"),
    "mealie_meal_grain":    ("Mealie meal, grain and beans",      "food_and_catering",  "4721"),
    "restaurant_nshima":    ("Restaurant / nshima kitchen",       "food_and_catering",  "5610"),
    "takeaway_fritters":    ("Takeaway, fritters and snacks",     "food_and_catering",  "5610"),
    "bakery":               ("Bakery / bread",                    "food_and_catering",  "1071"),
    "bar_tavern":           ("Bar / tavern / bottle store",       "food_and_catering",  "5630"),
    "drinks_water":         ("Soft drinks, water and ice",        "food_and_catering",  "4722"),
    # ── Retail and trade ──
    "salaula_clothing":     ("Salaula / second-hand clothing",    "retail_and_trade",   "4771"),
    "new_clothing_shoes":   ("New clothing and shoes",            "retail_and_trade",   "4771"),
    "chitenge_fabric":      ("Chitenge and fabric",               "retail_and_trade",   "4751"),
    "hardware_building":    ("Hardware and building materials",   "retail_and_trade",   "4752"),
    "electronics_phones":   ("Phones, electronics and accessories", "retail_and_trade", "4741"),
    "cosmetics_hair":       ("Cosmetics and hair products",       "retail_and_trade",   "4772"),
    "pharmacy_drugstore":   ("Pharmacy / drug store",             "services_and_care",  "4772"),
    "charcoal_fuel":        ("Charcoal, firewood and gas",        "retail_and_trade",   "4773"),
    "agro_inputs":          ("Seed, fertiliser and agro inputs",  "agriculture",        "4773"),
    "stationery_books":     ("Stationery and books",              "retail_and_trade",   "4761"),
    "household_plastics":   ("Household goods and plastics",      "retail_and_trade",   "4759"),
    "wholesale":            ("Wholesaler",                        "retail_and_trade",   "4690"),
    # ── Trades and repairs ──
    "phone_repair":         ("Phone and electronics repair",      "trades_and_repairs", "9512"),
    "tailoring":            ("Tailoring and alterations",         "trades_and_repairs", "1410"),
    "shoe_repair":          ("Shoe repair",                       "trades_and_repairs", "9523"),
    "welding_metalwork":    ("Welding and metal fabrication",     "manufacturing",      "2592"),
    "carpentry_furniture":  ("Carpentry and furniture",           "manufacturing",      "3100"),
    "mechanic_garage":      ("Mechanic / garage",                 "trades_and_repairs", "4520"),
    "tyre_mending":         ("Tyre mending and wheel alignment",  "trades_and_repairs", "4520"),
    "bicycle_repair":       ("Bicycle and motorbike repair",      "trades_and_repairs", "9529"),
    "grinding_mill":        ("Hammer mill / grinding",            "manufacturing",      "1061"),
    # ── Services and care ──
    "barbershop":           ("Barbershop",                        "services_and_care",  "9602"),
    "salon":                ("Hair salon / braiding",             "services_and_care",  "9602"),
    "laundry":              ("Laundry and dry cleaning",          "services_and_care",  "9601"),
    "car_wash":             ("Car wash",                          "services_and_care",  "4520"),
    "clinic_health":        ("Private clinic / health post",      "services_and_care",  "8620"),
    "daycare_preschool":    ("Daycare / preschool",               "education_and_training", "8510"),
    "tuition_centre":       ("Tuition / skills training",         "education_and_training", "8549"),
    # ── Finance and digital ──
    "mobile_money_agent":   ("Mobile money booth / agent",        "finance_and_administration", "6419"),
    "bank_agent":           ("Bank agent",                        "finance_and_administration", "6419"),
    "airtime_data":         ("Airtime and data sales",            "telecoms",           "4741"),
    "printing_internet":    ("Printing, photocopy and internet",  "digital_and_creative", "8219"),
    "photo_video":          ("Photo studio / video",              "digital_and_creative", "7420"),
    # ── Transport, lodging and other ──
    "transport_taxi":       ("Taxi / minibus / delivery rank",    "transport_and_logistics", "4922"),
    "fuel_station":         ("Fuel station / fuel vendor",        "transport_and_logistics", "4730"),
    "lodge_guesthouse":     ("Lodge / guest house",               "tourism_and_hospitality", "5510"),
    "entertainment_gaming": ("Pool table, gaming and betting",    "arts_and_entertainment", "9200"),
    "block_making":         ("Block making / building supplies",  "construction_and_real_estate", "2395"),
    "other":                ("Other (describe)",                  "retail_and_trade",   "4799"),
}

STRUCTURE_TYPES = {
    "permanent_shop": "Permanent shop",
    "container":      "Container",
    "kantemba":       "Kantemba / kiosk",
    "market_stall":   "Market stall or table",
    "ground_vendor":  "Ground vendor (goods on the ground)",
    "mobile_hawker":  "Mobile hawker / wheelbarrow",
    "home_based":     "Home-based",
    "vehicle":        "Vehicle-based",
}

MARKET_TYPES = {
    "council_market":   "Council market",
    "cooperative":      "Cooperative-run market",
    "informal_street":  "Informal street market",
    "roadside_strip":   "Roadside trading strip",
    "shopping_complex": "Shopping complex / mall",
    "bus_station":      "Bus station trading area",
    "border_market":    "Border market",
    "wholesale_hub":    "Wholesale hub",
    "trading_centre":   "Compound / township trading centre",
}

OPERATING_STATUS = ["open", "closed", "seasonal", "vacant"]
PAYMENT_METHODS = ["cash", "mtn_money", "airtel_money", "zamtel_money", "card", "customer_credit"]
POWER_SOURCES = ["zesco", "solar", "generator", "battery", "none"]
MOBILE_NETWORKS = ["mtn", "airtel", "zamtel"]

DAILY_CUSTOMER_BANDS = ["under_10", "10_30", "30_60", "60_100", "over_100"]
DAILY_SALES_BANDS = ["under_100", "100_300", "300_700", "700_1500", "1500_3000", "over_3000"]  # ZMW
MONTHLY_RENT_BANDS = ["none_owned", "under_200", "200_500", "500_1000", "1000_2500", "over_2500"]  # ZMW

# item_code: (label, unit) -- the standard basket behind KIP's own price index.
PRICE_BASKET = {
    "mealie_meal_25kg":  ("Mealie meal (breakfast)", "25 kg bag"),
    "cooking_oil_2l":    ("Cooking oil", "2 litres"),
    "sugar_2kg":         ("Sugar", "2 kg"),
    "tomatoes_heap":     ("Tomatoes", "medium heap"),
    "onions_heap":       ("Onions", "medium heap"),
    "rape_bundle":       ("Rape / leafy vegetable", "bundle"),
    "kapenta_cup":       ("Dry kapenta", "cup (meda)"),
    "chicken_whole":     ("Chicken (dressed)", "whole bird"),
    "eggs_tray":         ("Eggs", "tray of 30"),
    "bread_loaf":        ("Bread", "loaf"),
    "charcoal_bag":      ("Charcoal", "50 kg bag"),
    "talk_time_10":      ("Talk time", "K10 voucher"),
    "haircut_men":       ("Men's haircut", "one cut"),
    "minibus_town":      ("Minibus to town centre", "one trip"),
    "nshima_meal":       ("Nshima with relish", "plate"),
}


def kip_category_for(subtype: str) -> str:
    entry = BUSINESS_SUBTYPES.get(subtype)
    return entry[1] if entry else "retail_and_trade"


def taxonomy_payload() -> dict:
    """The vocabulary bundle served to the collector app."""
    return {
        "version": TAXONOMY_VERSION,
        "subtypes": [
            {"code": code, "label": label, "category": cat, "isic": isic}
            for code, (label, cat, isic) in BUSINESS_SUBTYPES.items()
        ],
        "structure_types": [{"code": c, "label": l} for c, l in STRUCTURE_TYPES.items()],
        "market_types": [{"code": c, "label": l} for c, l in MARKET_TYPES.items()],
        "operating_status": OPERATING_STATUS,
        "payment_methods": PAYMENT_METHODS,
        "power_sources": POWER_SOURCES,
        "mobile_networks": MOBILE_NETWORKS,
        "daily_customer_bands": DAILY_CUSTOMER_BANDS,
        "daily_sales_bands": DAILY_SALES_BANDS,
        "monthly_rent_bands": MONTHLY_RENT_BANDS,
        "price_basket": [
            {"code": code, "label": label, "unit": unit}
            for code, (label, unit) in PRICE_BASKET.items()
        ],
    }
