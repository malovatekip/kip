# KIP Map Intelligence Setup

## Step 1 — Install packages (if not done already)
```bash
pip install beautifulsoup4
```
No API key needed. OpenStreetMap is completely free.

## Step 2 — Pre-fetch map data for major towns
```bash
# From the backend/ folder, with venv active:

# FASTEST — fetch only priority locations (covers ZICTA demo):
python fetch_maps.py --priority

# This fetches: Riverside/Kitwe, Lusaka neighbourhoods, Ndola, Livingstone, etc.
# Takes approx 3-5 minutes. No internet required after this.
```

## Step 3 — Verify
```bash
python fetch_maps.py --stats
```
You should see 20+ cached locations.

## Fetch a specific town at any time
```bash
python fetch_maps.py --town "chipata"
python fetch_maps.py --town "solwezi"
```

## Refresh stale data (e.g. monthly)
```bash
python fetch_maps.py --priority --refresh
```

## What this gives KIP
When a user asks about "Riverside, Kitwe", KIP now knows:
- Exactly how many phone repair shops exist there
- How many food businesses, salons, banks, pharmacies
- Which services are absent (market gaps)
- Bus stops and transport accessibility
- Named examples of existing businesses

This is real, live OpenStreetMap data — not assumptions.
