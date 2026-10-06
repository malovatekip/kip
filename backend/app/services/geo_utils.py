"""
Geo helpers for KIP's own business map (ground truth layer).

Pure stdlib so they work identically on SQLite (dev) and Postgres (Neon):
points are stored as plain lat/lon floats plus geohash strings. Radius
queries filter on an indexed lat/lon bounding box and then apply haversine;
geohashes are used for cell aggregation (heat map, anonymised counts).

Geohash cell sizes near Zambia's latitude:
    precision 6  ~ 1.2 km x 0.6 km   (neighbourhood)
    precision 7  ~ 150 m  x 150 m    (market section / street)
"""
import math

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points, in metres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return haversine_m(lat1, lon1, lat2, lon2) / 1000.0


def geohash_encode(lat: float, lon: float, precision: int = 7) -> str:
    lat_lo, lat_hi, lon_lo, lon_hi = -90.0, 90.0, -180.0, 180.0
    chars, bits, ch, even = [], 0, 0, True
    while len(chars) < precision:
        if even:
            mid = (lon_lo + lon_hi) / 2
            if lon >= mid:
                ch = (ch << 1) | 1
                lon_lo = mid
            else:
                ch <<= 1
                lon_hi = mid
        else:
            mid = (lat_lo + lat_hi) / 2
            if lat >= mid:
                ch = (ch << 1) | 1
                lat_lo = mid
            else:
                ch <<= 1
                lat_hi = mid
        even = not even
        bits += 1
        if bits == 5:
            chars.append(_BASE32[ch])
            bits, ch = 0, 0
    return "".join(chars)


def geohash_bounds(gh: str) -> tuple[float, float, float, float]:
    """(lat_min, lat_max, lon_min, lon_max) of a geohash cell."""
    lat_lo, lat_hi, lon_lo, lon_hi = -90.0, 90.0, -180.0, 180.0
    even = True
    for c in gh:
        idx = _BASE32.index(c)
        for shift in (4, 3, 2, 1, 0):
            bit = (idx >> shift) & 1
            if even:
                mid = (lon_lo + lon_hi) / 2
                if bit:
                    lon_lo = mid
                else:
                    lon_hi = mid
            else:
                mid = (lat_lo + lat_hi) / 2
                if bit:
                    lat_lo = mid
                else:
                    lat_hi = mid
            even = not even
    return lat_lo, lat_hi, lon_lo, lon_hi


def geohash_center(gh: str) -> tuple[float, float]:
    lat_lo, lat_hi, lon_lo, lon_hi = geohash_bounds(gh)
    return (lat_lo + lat_hi) / 2, (lon_lo + lon_hi) / 2


def bounding_box(lat: float, lon: float, radius_m: float) -> tuple[float, float, float, float]:
    """(lat_min, lat_max, lon_min, lon_max) enclosing a circle of radius_m."""
    dlat = math.degrees(radius_m / EARTH_RADIUS_M)
    # Longitude degrees shrink with latitude; guard the poles.
    dlon = math.degrees(radius_m / (EARTH_RADIUS_M * max(0.01, math.cos(math.radians(lat)))))
    return lat - dlat, lat + dlat, lon - dlon, lon + dlon


# Zambia's extent with a small margin; used to reject obviously wrong GPS fixes
# (0,0 "null island", emulator defaults, etc.).
ZAMBIA_BOUNDS = (-18.3, -8.0, 21.8, 33.9)


def in_zambia(lat: float, lon: float) -> bool:
    lat_min, lat_max, lon_min, lon_max = ZAMBIA_BOUNDS
    return lat_min <= lat <= lat_max and lon_min <= lon <= lon_max
