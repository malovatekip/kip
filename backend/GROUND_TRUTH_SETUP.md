# KIP Ground Truth (own business map) Setup

Field collectors pin businesses and markets from the `/field` area of the app.
The data lives only in KIP's database (`gt_*` tables). Never import OSM or
Google points into those tables: that is what keeps the dataset ours.

## 1. Give staff a role
```bash
# From backend/, with venv active. The account must already be registered.
python scripts/set_role.py --email agent@example.com --role collector
python scripts/set_role.py --email lead@example.com  --role supervisor
```
Collectors see "Field Mapping" in the menu. Supervisors also get the review queue.

## 2. Photo storage
Development: nothing to do, photos go to `backend/data/field_media/`.

Production (the host's disk is wiped on redeploy), use an S3-compatible bucket
such as Cloudflare R2, and `pip install boto3`:
```
FIELD_MEDIA_S3_BUCKET=kip-field-photos
FIELD_MEDIA_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
FIELD_MEDIA_S3_KEY_ID=...
FIELD_MEDIA_S3_SECRET=...
```

## 3. Background map (optional)
Without a basemap the collector map is a plain canvas with a scale bar, which
is enough to pin a stall you are standing at. For roads and place names, build
one PMTiles file for Zambia and host it on your own bucket:
```bash
# https://docs.protomaps.com/pmtiles/cli
pmtiles extract https://build.protomaps.com/<latest>.pmtiles zambia.pmtiles \
  --bbox=21.8,-18.3,33.9,-8.0 --maxzoom=15
```
Then set in the frontend environment:
```
VITE_BASEMAP_PMTILES_URL=https://<your-bucket>/zambia.pmtiles
VITE_BASEMAP_ASSETS_URL=https://<your-bucket>/basemaps-assets   # optional: self-hosted fonts/icons
```
The basemap is OpenStreetMap data and must show the "© OpenStreetMap" credit
(the map does this). It is only a backdrop; our pins are a separate layer.

## 4. GPS accuracy limit
Business pins need a fix of 15 m or better. To test on a laptop, raise it on
both sides: `FIELD_MAX_GPS_ACCURACY_M=2000` (backend) and
`VITE_FIELD_MAX_GPS_ACCURACY_M=2000` (frontend). Never raise it in production.

## 5. Android
Location permissions were added to the manifest and `@capacitor/geolocation`
to the app. Run `npm run android:sync` before the next build.

## How the idea engine uses it
`map_service.get_map_context(location, db)` returns KIP's own counts once an
area has at least 25 pins (`saturation_service.MIN_POINTS_FOR_COVERAGE`), and
falls back to the OSM cache for towns not yet surveyed.

## Tests
```bash
python -m pytest tests/test_ground_truth.py -q
```
