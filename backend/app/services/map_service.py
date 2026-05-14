"""
KIP Map Intelligence Service
Uses OpenStreetMap (Overpass API) — free, no API key required.

On first setup, run:  python fetch_maps.py
This pre-fetches business data for all major Zambian towns and
stores it as JSON in backend/app/data/map_cache/

KIP then reads from this cache — zero latency during conversations.
"""

import os
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional, Dict, List, Tuple

from app.data.town_coordinates import TOWN_COORDS, OSM_CATEGORIES, resolve_location

CACHE_DIR = os.path.join(os.path.dirname(__file__), "../data/map_cache")
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
REQUEST_DELAY = 1.2   # seconds between OSM requests (be a good citizen)


# ── Cache helpers ─────────────────────────────────────────────────

def _cache_path(location_key: str) -> str:
    safe = location_key.replace(" ", "_").replace("/", "_")
    return os.path.join(CACHE_DIR, f"{safe}.json")

def _load_cache(location_key: str) -> Optional[Dict]:
    path = _cache_path(location_key)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return None
    return None

def _save_cache(location_key: str, data: Dict):
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(_cache_path(location_key), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── OSM Query ─────────────────────────────────────────────────────

def _build_overpass_query(lat: float, lon: float, radius_m: int) -> str:
    """Build a single Overpass QL query that fetches all relevant business tags."""
    # Collect all tags we care about
    all_tags = []
    for cat_data in OSM_CATEGORIES.values():
        for tag in cat_data["tags"]:
            k, v = tag.split("=", 1)
            all_tags.append(f'  node["{k}"="{v}"](around:{radius_m},{lat},{lon});')
            all_tags.append(f'  way["{k}"="{v}"](around:{radius_m},{lat},{lon});')

    # Also grab roads/transport nodes for accessibility scoring
    all_tags.append(f'  node["highway"="bus_stop"](around:{radius_m},{lat},{lon});')
    all_tags.append(f'  node["highway"="crossing"](around:{radius_m},{lat},{lon});')

    query = f"""
[out:json][timeout:45];
(
{chr(10).join(all_tags)}
);
out center tags;
"""
    return query.strip()


def _query_overpass(lat: float, lon: float, radius_m: int) -> Optional[Dict]:
    """Execute an Overpass API query. Returns raw OSM response or None on error."""
    query = _build_overpass_query(lat, lon, radius_m)
    encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
    headers = {
        "User-Agent": "KIP-ZambiaBusinessIntelligence/1.0 (educational project)",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    try:
        req = urllib.request.Request(OVERPASS_URL, data=encoded, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"    [OSM] Rate limited. Waiting 30s...")
            time.sleep(30)
        else:
            print(f"    [OSM] HTTP error {e.code}")
        return None
    except Exception as e:
        print(f"    [OSM] Query error: {e}")
        return None


# ── Data Processing ───────────────────────────────────────────────

def _categorise_element(tags: Dict) -> Optional[str]:
    """Return the KIP category for an OSM element's tags."""
    for cat_key, cat_data in OSM_CATEGORIES.items():
        for tag_str in cat_data["tags"]:
            k, v = tag_str.split("=", 1)
            if tags.get(k) == v:
                return cat_key
    return None


def _process_osm_response(raw: Dict, location_key: str, coord: Dict) -> Dict:
    """
    Convert raw OSM response into a structured KIP map profile.
    """
    elements = raw.get("elements", [])

    # Count by category
    counts: Dict[str, int] = {cat: 0 for cat in OSM_CATEGORIES}
    named_businesses: Dict[str, List[str]] = {cat: [] for cat in OSM_CATEGORIES}
    bus_stops = 0

    for el in elements:
        tags = el.get("tags", {})
        if tags.get("highway") == "bus_stop":
            bus_stops += 1
            continue
        cat = _categorise_element(tags)
        if cat:
            counts[cat] += 1
            name = tags.get("name", "")
            if name and len(named_businesses[cat]) < 6:  # keep up to 6 named examples
                named_businesses[cat].append(name)

    # Determine saturation levels
    def saturation(count: int) -> str:
        if count == 0:   return "none"
        if count <= 2:   return "very_low"
        if count <= 5:   return "low"
        if count <= 10:  return "medium"
        if count <= 20:  return "high"
        return "very_high"

    # Identify gaps (categories with very low or no presence)
    gaps = []
    for cat_key, cat_data in OSM_CATEGORIES.items():
        if cat_data.get("competition_signal") and counts[cat_key] <= 2:
            gaps.append(cat_data["kip_label"])

    # Assess transport accessibility
    if bus_stops >= 3:    transport = "well_connected"
    elif bus_stops >= 1:  transport = "some_public_transport"
    else:                 transport = "limited_public_transport"

    profile = {
        "location_key": location_key,
        "coordinates": {"lat": coord["lat"], "lon": coord["lon"]},
        "radius_m": coord["radius_m"],
        "province": coord.get("province", "Unknown"),
        "total_businesses_found": sum(counts.values()),
        "transport_accessibility": transport,
        "bus_stops_found": bus_stops,
        "business_counts": {
            OSM_CATEGORIES[k]["kip_label"]: counts[k]
            for k in counts
        },
        "saturation_levels": {
            OSM_CATEGORIES[k]["kip_label"]: saturation(counts[k])
            for k in counts
            if OSM_CATEGORIES[k].get("competition_signal")
        },
        "identified_gaps": gaps,
        "named_examples": {
            OSM_CATEGORIES[k]["kip_label"]: named_businesses[k]
            for k in named_businesses
            if named_businesses[k]
        },
        "fetched_at": time.strftime("%Y-%m-%d"),
    }
    return profile


# ── Public API ────────────────────────────────────────────────────

def fetch_and_cache(location_key: str, coord: Dict, force: bool = False) -> Optional[Dict]:
    """
    Fetch OSM data for a location and store in cache.
    If already cached and force=False, returns existing cache.
    """
    if not force:
        cached = _load_cache(location_key)
        if cached:
            return cached

    print(f"    Querying OSM for: {location_key} ({coord['lat']}, {coord['lon']}) r={coord['radius_m']}m")
    raw = _query_overpass(coord["lat"], coord["lon"], coord["radius_m"])
    if not raw:
        return None

    profile = _process_osm_response(raw, location_key, coord)
    _save_cache(location_key, profile)
    print(f"    Cached: {profile['total_businesses_found']} businesses, {len(profile['identified_gaps'])} gaps identified")
    return profile


def get_map_context(location_string: str) -> str:
    """
    Given a user's location string, return a formatted map intelligence
    summary ready for injection into KIP's system prompt context.

    Tries cache first. If not cached, returns empty string gracefully.
    """
    location_key, coord = resolve_location(location_string)
    if not location_key:
        return ""

    profile = _load_cache(location_key)
    if not profile:
        # Try parent city if neighbourhood not cached
        city_key = location_key.split()[0] if " " in location_key else location_key
        profile = _load_cache(city_key)
        if not profile:
            return ""

    return _format_map_context(profile, location_key)


def _format_map_context(profile: Dict, location_key: str) -> str:
    """Format map profile into text for KIP's context injection."""
    lines = [
        f"MAP INTELLIGENCE: {location_key.title()} ({profile['province']} Province)",
        f"Data radius: {profile['radius_m']}m | Fetched: {profile.get('fetched_at', 'unknown')}",
        f"Total businesses found: {profile['total_businesses_found']}",
        f"Transport: {profile['transport_accessibility'].replace('_', ' ').title()} | Bus stops: {profile['bus_stops_found']}",
        "",
        "BUSINESS DENSITY:",
    ]

    for label, count in profile["business_counts"].items():
        sat = profile["saturation_levels"].get(label, "")
        sat_str = f" [{sat.replace('_', ' ').upper()}]" if sat else ""
        if count > 0:
            lines.append(f"  • {label}: {count} found{sat_str}")

    if profile["identified_gaps"]:
        lines.append("")
        lines.append("IDENTIFIED MARKET GAPS (low/no existing competition):")
        for gap in profile["identified_gaps"]:
            lines.append(f"  ◆ {gap} — opportunity exists")

    if profile.get("named_examples"):
        lines.append("")
        lines.append("NOTABLE EXISTING BUSINESSES (examples):")
        for label, names in profile["named_examples"].items():
            if names:
                lines.append(f"  {label}: {', '.join(names[:4])}")

    lines.append("")
    lines.append("USE THIS DATA: Reference actual business counts when explaining why an idea suits this area.")
    lines.append("Gaps indicate underserved markets — weight these heavily in your recommendation.")

    return "\n".join(lines)


def cache_stats() -> Dict:
    """Return stats on what's been cached."""
    if not os.path.exists(CACHE_DIR):
        return {"cached_locations": 0, "files": []}
    files = [f for f in os.listdir(CACHE_DIR) if f.endswith(".json")]
    return {"cached_locations": len(files), "files": [f.replace(".json", "").replace("_", " ") for f in files]}
