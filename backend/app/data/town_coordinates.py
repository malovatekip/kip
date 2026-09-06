"""
Zambian Town & Neighbourhood Coordinate Registry

Coordinates (lat, lon) used for OpenStreetMap queries.
radius_m = how wide to search for businesses (in metres)

Major cities have neighbourhood-level entries so KIP can
give hyper-local intelligence when the user names a specific area.
"""

TOWN_COORDS = {

    # ── LUSAKA ──────────────────────────────────────────────────────
    "lusaka":               {"lat": -15.4167, "lon": 28.2833, "radius_m": 3000, "province": "Lusaka"},
    "lusaka cbd":           {"lat": -15.4166, "lon": 28.2833, "radius_m": 1000, "province": "Lusaka"},
    "cairo road":           {"lat": -15.4166, "lon": 28.2833, "radius_m": 800,  "province": "Lusaka"},
    "matero":               {"lat": -15.3900, "lon": 28.2700, "radius_m": 1200, "province": "Lusaka"},
    "kabulonga":            {"lat": -15.4500, "lon": 28.3200, "radius_m": 1000, "province": "Lusaka"},
    "woodlands":            {"lat": -15.4300, "lon": 28.3100, "radius_m": 1000, "province": "Lusaka"},
    "chalala":              {"lat": -15.4100, "lon": 28.3300, "radius_m": 1000, "province": "Lusaka"},
    "kalingalinga":         {"lat": -15.4000, "lon": 28.3000, "radius_m": 1000, "province": "Lusaka"},
    "chelstone":            {"lat": -15.4350, "lon": 28.3400, "radius_m": 1000, "province": "Lusaka"},
    "avondale":             {"lat": -15.3950, "lon": 28.3050, "radius_m": 1000, "province": "Lusaka"},
    "roma":                 {"lat": -15.4450, "lon": 28.3050, "radius_m": 1000, "province": "Lusaka"},
    "ibex hill":            {"lat": -15.4600, "lon": 28.3400, "radius_m": 1000, "province": "Lusaka"},
    "longacres":            {"lat": -15.4050, "lon": 28.2950, "radius_m": 800,  "province": "Lusaka"},
    "garden":               {"lat": -15.3800, "lon": 28.3100, "radius_m": 1000, "province": "Lusaka"},
    "emmasdale":            {"lat": -15.4200, "lon": 28.2700, "radius_m": 1000, "province": "Lusaka"},
    "mandevu":              {"lat": -15.3800, "lon": 28.2600, "radius_m": 1200, "province": "Lusaka"},
    "chilenje":             {"lat": -15.4300, "lon": 28.2700, "radius_m": 1000, "province": "Lusaka"},
    "chawama":              {"lat": -15.4600, "lon": 28.2700, "radius_m": 1000, "province": "Lusaka"},
    "lilanda":              {"lat": -15.3700, "lon": 28.2800, "radius_m": 1000, "province": "Lusaka"},
    "george":               {"lat": -15.4700, "lon": 28.2600, "radius_m": 1200, "province": "Lusaka"},
    "ngombe":               {"lat": -15.3600, "lon": 28.3200, "radius_m": 1000, "province": "Lusaka"},
    "olympia":              {"lat": -15.4250, "lon": 28.3150, "radius_m": 800,  "province": "Lusaka"},
    "north mead":           {"lat": -15.3900, "lon": 28.3200, "radius_m": 1000, "province": "Lusaka"},
    "east park":            {"lat": -15.4100, "lon": 28.3400, "radius_m": 800,  "province": "Lusaka"},
    "mass media":           {"lat": -15.3750, "lon": 28.2900, "radius_m": 800,  "province": "Lusaka"},

    # ── COPPERBELT ──────────────────────────────────────────────────
    "kitwe":                {"lat": -12.8167, "lon": 28.2167, "radius_m": 3000, "province": "Copperbelt"},
    "kitwe cbd":            {"lat": -12.8166, "lon": 28.2100, "radius_m": 800,  "province": "Copperbelt"},
    "riverside kitwe":      {"lat": -12.8400, "lon": 28.2300, "radius_m": 1000, "province": "Copperbelt"},
    "riverside":            {"lat": -12.8400, "lon": 28.2300, "radius_m": 1000, "province": "Copperbelt"},
    "nkana east":           {"lat": -12.8100, "lon": 28.2400, "radius_m": 1000, "province": "Copperbelt"},
    "nkana west":           {"lat": -12.8050, "lon": 28.1950, "radius_m": 1000, "province": "Copperbelt"},
    "parklands kitwe":      {"lat": -12.8300, "lon": 28.2350, "radius_m": 1000, "province": "Copperbelt"},
    "wusakile":             {"lat": -12.7950, "lon": 28.2500, "radius_m": 1000, "province": "Copperbelt"},
    "chimwemwe":            {"lat": -12.8550, "lon": 28.2450, "radius_m": 1000, "province": "Copperbelt"},
    "kwacha":               {"lat": -12.8700, "lon": 28.2200, "radius_m": 1000, "province": "Copperbelt"},
    "bulangililo":          {"lat": -12.8200, "lon": 28.2500, "radius_m": 1000, "province": "Copperbelt"},
    "ndeke":                {"lat": -12.8000, "lon": 28.2150, "radius_m": 1000, "province": "Copperbelt"},

    "ndola":                {"lat": -12.9587, "lon": 28.6366, "radius_m": 3000, "province": "Copperbelt"},
    "ndola cbd":            {"lat": -12.9587, "lon": 28.6200, "radius_m": 800,  "province": "Copperbelt"},
    "masala":               {"lat": -12.9700, "lon": 28.6500, "radius_m": 1200, "province": "Copperbelt"},
    "twapia":               {"lat": -12.9400, "lon": 28.6600, "radius_m": 1000, "province": "Copperbelt"},
    "chipulukusu":          {"lat": -12.9800, "lon": 28.6400, "radius_m": 1000, "province": "Copperbelt"},
    "kansenshi":            {"lat": -12.9450, "lon": 28.6250, "radius_m": 1000, "province": "Copperbelt"},

    "chingola":             {"lat": -12.5269, "lon": 27.8543, "radius_m": 2500, "province": "Copperbelt"},
    "chingola cbd":         {"lat": -12.5269, "lon": 27.8500, "radius_m": 800,  "province": "Copperbelt"},
    "nchanga":              {"lat": -12.5100, "lon": 27.8600, "radius_m": 1000, "province": "Copperbelt"},

    "mufulira":             {"lat": -12.5490, "lon": 28.2421, "radius_m": 2000, "province": "Copperbelt"},
    "luanshya":             {"lat": -13.1338, "lon": 28.4051, "radius_m": 2000, "province": "Copperbelt"},
    "kalulushi":            {"lat": -12.8419, "lon": 28.0936, "radius_m": 1500, "province": "Copperbelt"},

    # ── SOUTHERN PROVINCE ───────────────────────────────────────────
    "livingstone":          {"lat": -17.8419, "lon": 25.8542, "radius_m": 2500, "province": "Southern"},
    "livingstone cbd":      {"lat": -17.8500, "lon": 25.8600, "radius_m": 800,  "province": "Southern"},
    "maramba":              {"lat": -17.8700, "lon": 25.8700, "radius_m": 1000, "province": "Southern"},
    "dambwa":               {"lat": -17.8300, "lon": 25.8400, "radius_m": 1000, "province": "Southern"},
    "victoria falls area":  {"lat": -17.9243, "lon": 25.8572, "radius_m": 2000, "province": "Southern"},

    "choma":                {"lat": -16.8108, "lon": 26.9836, "radius_m": 1500, "province": "Southern"},
    "mazabuka":             {"lat": -15.8581, "lon": 27.7641, "radius_m": 1500, "province": "Southern"},

    # ── EASTERN PROVINCE ────────────────────────────────────────────
    "chipata":              {"lat": -13.6500, "lon": 32.6500, "radius_m": 2000, "province": "Eastern"},
    "chipata cbd":          {"lat": -13.6500, "lon": 32.6450, "radius_m": 800,  "province": "Eastern"},
    "kapata":               {"lat": -13.6600, "lon": 32.6600, "radius_m": 1000, "province": "Eastern"},

    "petauke":              {"lat": -14.2500, "lon": 31.3333, "radius_m": 1200, "province": "Eastern"},
    "katete":               {"lat": -14.1000, "lon": 32.0500, "radius_m": 1200, "province": "Eastern"},

    # ── CENTRAL PROVINCE ────────────────────────────────────────────
    "kabwe":                {"lat": -14.4469, "lon": 28.4464, "radius_m": 2500, "province": "Central"},
    "kabwe cbd":            {"lat": -14.4469, "lon": 28.4400, "radius_m": 800,  "province": "Central"},
    "mukobeko":             {"lat": -14.4300, "lon": 28.4600, "radius_m": 1000, "province": "Central"},

    "kapiri mposhi":        {"lat": -13.9732, "lon": 28.6714, "radius_m": 1500, "province": "Central"},
    "mkushi":               {"lat": -13.6167, "lon": 29.4000, "radius_m": 1200, "province": "Central"},

    # ── NORTH-WESTERN PROVINCE ──────────────────────────────────────
    "solwezi":              {"lat": -12.1744, "lon": 26.3912, "radius_m": 2000, "province": "North-Western"},
    "solwezi cbd":          {"lat": -12.1744, "lon": 26.3850, "radius_m": 800,  "province": "North-Western"},
    "kansanshi area":       {"lat": -12.1000, "lon": 26.4500, "radius_m": 2000, "province": "North-Western"},

    "mwinilunga":           {"lat": -11.7381, "lon": 24.4319, "radius_m": 1200, "province": "North-Western"},

    # ── NORTHERN PROVINCE ───────────────────────────────────────────
    "kasama":               {"lat": -10.2167, "lon": 31.1833, "radius_m": 2000, "province": "Northern"},
    "kasama cbd":           {"lat": -10.2167, "lon": 31.1800, "radius_m": 800,  "province": "Northern"},

    "mbala":                {"lat":  -8.8419, "lon": 31.3714, "radius_m": 1200, "province": "Northern"},
    "mpika":                {"lat": -11.8394, "lon": 31.4500, "radius_m": 1200, "province": "Northern"},

    # ── LUAPULA PROVINCE ────────────────────────────────────────────
    "mansa":                {"lat":  -11.2000, "lon": 28.9000, "radius_m": 2000, "province": "Luapula"},
    "mansa cbd":            {"lat":  -11.2000, "lon": 28.8950, "radius_m": 800,  "province": "Luapula"},

    "nchelenge":            {"lat":  -9.3500, "lon": 28.7333, "radius_m": 1200, "province": "Luapula"},
    "kawambwa":             {"lat":  -9.7833, "lon": 29.0833, "radius_m": 1200, "province": "Luapula"},

    # ── WESTERN PROVINCE ────────────────────────────────────────────
    "mongu":                {"lat": -15.2833, "lon": 23.1333, "radius_m": 2000, "province": "Western"},
    "mongu cbd":            {"lat": -15.2833, "lon": 23.1300, "radius_m": 800,  "province": "Western"},

    "kaoma":                {"lat": -14.7833, "lon": 24.8000, "radius_m": 1200, "province": "Western"},
    "senanga":              {"lat": -16.1167, "lon": 23.2667, "radius_m": 1200, "province": "Western"},

    # ── MUCH EASTERN (Muchinga) ──────────────────────────────────────
    "chinsali":             {"lat":  -10.5500, "lon": 32.0667, "radius_m": 1200, "province": "Muchinga"},
    "nakonde":              {"lat":  -9.3667, "lon": 32.7500, "radius_m": 1200, "province": "Muchinga"},
    "isoka":                {"lat":  -10.1500, "lon": 32.6333, "radius_m": 1200, "province": "Muchinga"},
}

# Business categories KIP queries from OpenStreetMap
# These map directly to OSM amenity/shop/leisure tags
OSM_CATEGORIES = {
    "food_and_drink": {
        "tags": ["amenity=restaurant", "amenity=fast_food", "amenity=cafe",
                 "amenity=bar", "amenity=pub", "amenity=food_court"],
        "kip_label": "Food & Drink Businesses",
        "competition_signal": True,
    },
    "retail_shops": {
        "tags": ["shop=supermarket", "shop=convenience", "shop=general",
                 "shop=clothes", "shop=shoes", "shop=electronics", "shop=mobile_phone"],
        "kip_label": "Retail Shops",
        "competition_signal": True,
    },
    "services": {
        "tags": ["amenity=salon", "shop=hairdresser", "shop=beauty",
                 "shop=laundry", "amenity=car_wash", "shop=repair"],
        "kip_label": "Personal Services",
        "competition_signal": True,
    },
    "financial": {
        "tags": ["amenity=bank", "amenity=atm", "amenity=mobile_money_agent",
                 "shop=money_transfer"],
        "kip_label": "Financial Services",
        "competition_signal": False,
    },
    "health": {
        "tags": ["amenity=pharmacy", "amenity=clinic", "amenity=hospital",
                 "amenity=doctors", "shop=chemist"],
        "kip_label": "Health Services",
        "competition_signal": True,
    },
    "education": {
        "tags": ["amenity=school", "amenity=college", "amenity=university",
                 "amenity=kindergarten", "amenity=tutoring"],
        "kip_label": "Educational Institutions",
        "competition_signal": False,
    },
    "transport": {
        "tags": ["amenity=bus_station", "amenity=taxi", "amenity=fuel",
                 "amenity=parking", "highway=bus_stop"],
        "kip_label": "Transport & Fuel",
        "competition_signal": False,
    },
    "markets": {
        "tags": ["amenity=marketplace", "shop=market", "landuse=retail"],
        "kip_label": "Markets & Trading Areas",
        "competition_signal": False,
    },
}

def resolve_location(location_string: str):
    """
    Given a user's location string, find the best matching entry
    in TOWN_COORDS. Returns the coord dict or None.
    """
    loc = location_string.lower().strip()
    # Exact match first
    if loc in TOWN_COORDS:
        return loc, TOWN_COORDS[loc]
    # Partial match — longest match wins
    best_key = None
    best_len = 0
    for key in TOWN_COORDS:
        if key in loc and len(key) > best_len:
            best_key = key
            best_len = len(key)
    if best_key:
        return best_key, TOWN_COORDS[best_key]
    return None, None

def nearest_town(lat: float, lon: float):
    """
    Given raw GPS coordinates (e.g. from the New Idea wizard's "Use my
    location" button), find the closest entry in TOWN_COORDS via the
    haversine formula. Returns (town_key, coord_dict, distance_km) or
    (None, None, None) if TOWN_COORDS is somehow empty.
    """
    import math

    def _haversine_km(lat1, lon1, lat2, lon2):
        R = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 2 * R * math.asin(math.sqrt(a))

    best_key, best_coord, best_dist = None, None, None
    for key, coord in TOWN_COORDS.items():
        dist = _haversine_km(lat, lon, coord["lat"], coord["lon"])
        if best_dist is None or dist < best_dist:
            best_key, best_coord, best_dist = key, coord, dist
    return best_key, best_coord, best_dist
