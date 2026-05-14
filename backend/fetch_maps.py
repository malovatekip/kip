#!/usr/bin/env python3
"""
KIP Map Pre-Fetch Script
=========================
Queries OpenStreetMap for every Zambian town in KIP's registry
and stores the results in the local cache.

Run ONCE during setup:
  python fetch_maps.py

Then KIP has instant map intelligence for every town — no delays
during user conversations.

Options:
  python fetch_maps.py                  # Fetch all uncached towns
  python fetch_maps.py --priority       # Fetch major cities only (faster)
  python fetch_maps.py --town "kitwe"   # Fetch one specific town
  python fetch_maps.py --refresh        # Re-fetch all (overwrite cache)
  python fetch_maps.py --stats          # Show what's already cached
"""

import sys
import os
import time
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

from app.data.town_coordinates import TOWN_COORDS
from app.services.map_service import fetch_and_cache, cache_stats

# Major cities to fetch first — these cover the ZICTA demo
PRIORITY_LOCATIONS = [
    # Demo critical
    "riverside kitwe", "kitwe cbd", "kitwe",
    "lusaka cbd", "lusaka", "matero", "kabulonga",
    "woodlands", "chalala", "kalingalinga",
    # Other major cities
    "ndola", "ndola cbd", "masala",
    "livingstone", "chipata",
    "kabwe", "solwezi", "chingola",
    # Additional Copperbelt neighbourhoods
    "nkana east", "chimwemwe", "parklands kitwe",
]


def print_banner():
    print("""
╔══════════════════════════════════════════════════════╗
║   KIP Map Intelligence — Pre-Fetch Script            ║
║   Source: OpenStreetMap (free, no API key needed)    ║
╚══════════════════════════════════════════════════════╝
""")


def fetch_locations(locations: list, force: bool = False):
    total = len(locations)
    success = 0
    skipped = 0
    failed = 0

    for i, key in enumerate(locations, 1):
        coord = TOWN_COORDS.get(key)
        if not coord:
            print(f"  [{i}/{total}] Skipping '{key}' — not in registry")
            continue

        # Check if already cached
        from app.services.map_service import _load_cache
        if not force and _load_cache(key):
            print(f"  [{i}/{total}] Already cached: {key} (use --refresh to update)")
            skipped += 1
            continue

        print(f"  [{i}/{total}] Fetching: {key}...")
        result = fetch_and_cache(key, coord, force=force)

        if result:
            success += 1
        else:
            print(f"    ✗ Failed — will retry next run")
            failed += 1

        # Rate limiting — be respectful to OSM servers
        if i < total:
            time.sleep(1.5)

    return success, skipped, failed


def main():
    parser = argparse.ArgumentParser(description="KIP Map Pre-Fetch Script")
    parser.add_argument("--priority", action="store_true",
                        help="Fetch priority locations only (major cities, faster)")
    parser.add_argument("--town", type=str,
                        help="Fetch a specific town (e.g. --town 'kitwe')")
    parser.add_argument("--refresh", action="store_true",
                        help="Re-fetch all locations, overwriting cache")
    parser.add_argument("--stats", action="store_true",
                        help="Show cache statistics")
    args = parser.parse_args()

    print_banner()

    if args.stats:
        stats = cache_stats()
        print(f"Cached locations: {stats['cached_locations']}")
        if stats["files"]:
            print("Cached towns:")
            for loc in sorted(stats["files"]):
                print(f"  ✓  {loc}")
        else:
            print("No cache yet. Run: python fetch_maps.py --priority")
        return

    if args.town:
        key = args.town.lower().strip()
        coord = TOWN_COORDS.get(key)
        if not coord:
            # Try partial match
            matches = [k for k in TOWN_COORDS if args.town.lower() in k]
            if matches:
                print(f"Exact key not found. Did you mean one of these?")
                for m in matches[:8]:
                    print(f"  {m}")
            else:
                print(f"Town '{args.town}' not found in registry.")
                print("Run: python fetch_maps.py --stats to see available towns.")
            return
        print(f"Fetching map data for: {key}\n")
        result = fetch_and_cache(key, coord, force=args.refresh)
        if result:
            print(f"\n✓ Done. {result['total_businesses_found']} businesses mapped.")
            if result["identified_gaps"]:
                print(f"  Market gaps found: {', '.join(result['identified_gaps'])}")
        return

    # Determine which locations to fetch
    if args.priority:
        locations = PRIORITY_LOCATIONS
        print(f"Fetching {len(locations)} priority locations...\n")
        print("These cover the ZICTA demo use cases.\n")
    else:
        locations = list(TOWN_COORDS.keys())
        print(f"Fetching all {len(locations)} registered locations...\n")
        print("This will take several minutes. Run with --priority for faster setup.\n")

    # Estimate time
    from app.services.map_service import _load_cache
    uncached = [k for k in locations if not _load_cache(k)]
    est_mins = (len(uncached) * 2.7) / 60
    if uncached:
        print(f"Locations to fetch: {len(uncached)} (approx {est_mins:.0f} minutes)")
        print(f"Already cached:     {len(locations) - len(uncached)}\n")
    else:
        print("All locations already cached. Use --refresh to update.\n")
        return

    success, skipped, failed = fetch_locations(locations, force=args.refresh)

    print(f"""
╔══════════════════════════════════════╗
║   Fetch Complete                     ║
║                                      ║
║   Fetched:  {str(success).ljust(4)}                    ║
║   Skipped:  {str(skipped).ljust(4)} (already cached)  ║
║   Failed:   {str(failed).ljust(4)} (retry next run)   ║
╚══════════════════════════════════════╝

KIP now has live map intelligence for {success + skipped} locations.
Run "python fetch_maps.py --stats" to see the full list.
""")

    if failed:
        print("Some locations failed (likely OSM timeout).")
        print("Re-run this script to fetch the remaining ones.\n")


if __name__ == "__main__":
    main()
