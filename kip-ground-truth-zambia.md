# KIP Ground Truth Zambia

A field-collected, KIP-owned map of Zambia's informal businesses and markets.

Last updated: 6 October 2026. Status: Phase 0 built, not yet piloted in a market.

---

## 1. Why this exists

KIP recommends business ideas, but it cannot honestly say whether an idea is saturated in a given place. Most Zambian businesses are informal and appear nowhere online: the Bank of Zambia counts about 1.5 million MSMEs, 95.6% of them informal. Before this project KIP's only location signal was a static OpenStreetMap cache (`backend/app/services/map_service.py`). OpenStreetMap barely records kantembas, stalls and market traders, so the "gaps" it reported were mostly gaps in OpenStreetMap, not gaps in the market.

The answer is to collect the data ourselves. Paid mobile field agents walk markets and trading areas, pin every business on a map and record details about each market. Over time KIP users add to it by logging their own businesses.

The result is the most valuable asset KIP brings to Zambia:

- The idea engine stops recommending the fortieth salon on a street.
- The simulator uses real local rents, levies and prices instead of national estimates.
- Lenders, councils, distributors and development partners get data on the informal sector that does not exist anywhere else.
- Repeat visits build history: which businesses open, which close, how prices move. Real survival rates by business type and town.

## 2. Principles

1. **The data is ours.** The business layer lives only in KIP's database. It is never uploaded to Google, OpenStreetMap or anyone else, and it is never seeded from their data.
2. **Counted, not estimated.** Every number traces back to an agent standing at a stall with a GPS fix and a photo.
3. **An empty map is not an empty market.** KIP only trusts an area once enough pins exist there; otherwise it says nothing or falls back to older sources.
4. **History is kept.** Nothing is overwritten. Every visit is a new record.
5. **People's privacy is respected.** Owner names and phone numbers are collected only with clear consent, stored apart from everything else and never sold.
6. **Works with no signal.** Markets have poor connectivity. The collector app saves everything on the phone first.

## 3. Owning the map

A map has two parts, and they are treated differently.

**The background** (roads, rivers, place names) is not where the value is. KIP uses a single self-hosted file of Zambia built from OpenStreetMap's open data (PMTiles format, drawn with the open-source MapLibre library). There is no Google SDK, no API key and no per-view fee, and the file can be stored on the phone for offline use. The only obligation is to show the "© OpenStreetMap" credit on the background.

**The business layer** (pins, markets, prices, footfall) is the asset. It is collected independently by our own people and stored separately.

One rule protects ownership: **never import OpenStreetMap or Google points into our business tables.** OpenStreetMap's licence is share-alike, so mixing its points into our dataset could oblige us to publish the result. Kept separate, our layer stays fully proprietary. The old OpenStreetMap cache remains only as a clearly separate fallback for towns we have not surveyed.

Other protections:

- Agents sign an intellectual property assignment and a confidentiality agreement.
- Ordinary app users only ever receive aggregates (counts per area, bands, medians). Map cells with fewer than 3 businesses are withheld so no single trader can be singled out.
- Raw pins are available to admins only, with no bulk export for anyone else.
- Collectors can only see pins within 300 m of where they stand.
- A few fictitious "trap" pins can be planted to prove copying if the data ever leaks.
- Photos, map files and the database sit on infrastructure KIP controls.

## 4. What is collected

### 4.1 Markets and trading areas

| Group | Details |
|---|---|
| Identity | Name, other names people use, type (council market, cooperative, informal street market, roadside strip, shopping complex, bus station, border market, wholesale hub, compound trading centre), town, ward, constituency |
| Location | Centre point; boundary by walking the perimeter (planned) |
| Scale | Total stalls and shops, how many are occupied |
| Costs | Daily levy, lowest and highest monthly stall rent, who collects (council, cooperative, private) |
| Facilities | Piped water, toilets, ZESCO power, roofed stalls, lighting, security, storage, cold room, drainage, waste collection, parking, truck access, hours without power per day |
| Access | Road surface, distance to the nearest bus station |
| Demand | Busiest days, peak season, where customers come from, what draws people (bus station, school, clinic, mine gate) |
| Supply | Where traders restock |
| Finance and connectivity | Number of mobile money booths, signal strength for MTN, Airtel and Zamtel |
| Governance | Market committee or association, disputes, planned relocation or upgrades |

### 4.2 Business pins

Two levels, so an agent can cover a whole market quickly and return for depth.

**Quick pin (about 30 seconds, no conversation needed)**
- GPS point and accuracy
- Type of business (50 sub-types, each mapped to KIP's idea categories and an international ISIC code so the data can be compared with ZamStats)
- Structure: permanent shop, container, kantemba, market stall or table, ground vendor, mobile hawker, home-based, vehicle
- Status today: open, closed, seasonal, vacant
- Photo of the frontage (no faces)
- Business name if it has one, and which market it is in

**Full survey (about 3 minutes with the owner)**
- Section of the market, main products or services
- People working, years at this spot
- Payments accepted: cash, MTN, Airtel, Zamtel, card, customer credit
- Power source: ZESCO, solar, generator, battery, none
- Monthly rent band
- Customers per day (band) and sales per day (band), only if the owner is happy to say
- Opening days and hours, where and how often they restock, biggest challenges
- Prices of standard basket items this business sells
- Owner's first name, phone, gender and age band, only with consent

### 4.3 Other layers

- **Price basket:** 15 standard items (mealie meal 25 kg, cooking oil, sugar, tomatoes, onions, rape, kapenta, chicken, eggs, bread, charcoal, talk time, men's haircut, minibus fare, a plate of nshima). Tracked by market and town over time, this becomes KIP's own local price index.
- **Footfall:** timed head counts at a point, by day and hour.
- **Vacancies:** empty stalls and shops with asking rent. This answers "where can I open?"

## 5. How the system is built

### 5.1 Storage

Two kinds of table:

- **The log** (`gt_observations`). One row per submission, never changed or deleted. Each carries an ID created on the phone, which makes uploads safe to repeat.
- **Current state** (`gt_markets`, `gt_business_points`). What each market and business looks like now, derived from the log. A later quick pin never wipes detail from an earlier full survey.

Supporting tables: `gt_price_observations`, `gt_footfall_counts`, `gt_vacancies`, `gt_media` (photos), `gt_qa_reviews` (supervisor decisions) and `gt_business_owner_contacts` (personal data, kept apart).

Location is stored as plain latitude and longitude plus a geohash (a short code naming the grid cell a point falls in). This needs no special database software, so it runs the same on a laptop and on the production database. A spatial extension can be added later without changing the design.

Users have a role: `user`, `collector` or `supervisor`. Admins can do everything.

### 5.2 Server

| File | Role |
|---|---|
| `backend/app/models/ground_truth.py` | The tables |
| `backend/app/data/business_taxonomy.py` | Business sub-types, structure types, bands, price basket (versioned) |
| `backend/app/services/geo_utils.py` | Distance, geohash, bounding boxes, Zambia bounds check |
| `backend/app/services/ground_truth.py` | Takes an observation, checks it, updates current state |
| `backend/app/services/saturation_service.py` | Counts competitors around a point, finds gaps, builds the summary for the idea engine, heat-map cells |
| `backend/app/services/field_media.py` | Photo storage: local folder in development, S3-compatible bucket in production |
| `backend/app/routes/field_data.py` | `/api/field`: taxonomy, sync, photo upload, nearby pins, nearby markets, my stats, review queue |
| `backend/app/routes/market_map.py` | `/api/map`: saturation and heat-map cells for users, raw pins for admins |
| `backend/scripts/set_role.py` | Grant collector or supervisor role |

### 5.3 Collector app

Part of the existing KIP web and Android app, at `/field`, visible only to staff with a field role.

| Screen | Purpose |
|---|---|
| Field home | Counts, upload status, rejected records with the reason |
| Pin businesses | Map with the agent's position and existing pins; drop a pin, fill the quick pin or full survey |
| Record a market | The market form |
| Review queue (supervisors) | Photo, details and flags for each pin; verify, reject or mark as duplicate |

Records and photos are written to the phone's storage first (`frontend/src/lib/fieldStore.js`) and uploaded in batches when the phone is online. Photos are shrunk to roughly 100 to 250 KB before saving.

### 5.4 How KIP uses the data

When a user asks for an idea, the engine looks up their location:

- If the area has at least 25 pins, it receives KIP's own counts, for example "Hair salon / braiding: 26, very high", a list of business types not found there, nearby market rents and levies, and vacant units. It is told not to recommend types marked high or very high unless clearly differentiated.
- If not, it falls back to the old OpenStreetMap cache.

Planned next: feed observed competitor density directly into the competitive score, and observed rents and wages into the simulator's benchmarks.

## 6. Quality control and fraud prevention

Paying per record invites fake records. The controls:

| Control | Status |
|---|---|
| GPS fix must be 15 m or better for a business, 50 m for a market | Built |
| Point must be inside Zambia; phone clock must not be in the future | Built |
| Photo required for every business pin | Built |
| Pin can be moved at most 25 m from where the agent stands | Built (app side) |
| Same business type within 10 m is flagged for the supervisor | Built |
| Supervisor verifies, rejects or merges each pin | Built |
| Rejected submissions are still logged, so a bad device or agent is visible | Built |
| Camera-only photos (no gallery uploads) | Planned |
| Detect fake-GPS apps | Planned |
| Pins must lie on the agent's recorded walking track; flag impossible speed | Planned |
| Supervisor re-surveys a random 5 to 10% of each agent's work | Planned (process) |
| Agent quality score | Planned |

Pay should be a daily base plus a rate per **verified** record, never per submitted record.

## 7. Privacy and law

- Owner names and phone numbers are personal data under the Data Protection Act No. 3 of 2021.
- They are stored only when the agent ticks that the owner clearly agreed, in a separate table readable by admins only, and are removed from the permanent log before it is written.
- They are never included in exports, aggregates or anything sold.
- Photos should show the frontage, not people.
- Before scaling: register KIP as a data controller, write a short consent script agents read aloud in the local language, and set a retention period.

## 8. Field operations

**Team shape for the pilot:** 5 collectors and 1 supervisor.

**A day in the field**
1. Collector opens Field Mapping, checks the business list has downloaded.
2. Records the market once (or selects it if it exists).
3. Walks row by row doing quick pins for every stall.
4. Returns to willing owners for the full survey and prices.
5. Uploads when there is signal; fixes anything rejected.
6. Supervisor clears the review queue that evening and re-visits a sample.

**Keeping data fresh**
- Re-survey every market every six months.
- Collect the price basket monthly at a sample of stalls.
- Users who start a business through KIP or keep a daily log become verified pins automatically; owners can claim and update their own pin.
- Every record carries the date it was last verified; older records count for less.

## 9. Rollout

| Phase | Scope | Status |
|---|---|---|
| 0 | Tables, upload API, collector app (quick pin, full survey, market form, review queue), saturation wired into idea generation | Built 6 Oct 2026; founder pilot in one Lusaka market still to do |
| 1 (after funding) | 5 agents and 1 supervisor, 3 markets in Lusaka and Copperbelt, background map hosted, price basket and footfall screens, local-language forms, stronger fraud checks | Not started |
| 2 | Provincial towns, task assignment, agent pay reports, saturation heat map for users | Not started |
| 3 | Data products: saturation API, town price index, market profiles for lenders and councils | Not started |

## 10. What the data becomes

| Product | Buyer | Built from |
|---|---|---|
| Saturation check ("how many of these already exist here?") | KIP users, inside idea generation | Pins |
| Where-to-open finder | KIP users | Vacancies, rents, footfall |
| Town price index | Banks, researchers, development partners, media | Price basket |
| Market profiles | Councils, lenders, investors | Market records |
| Business survival rates by type and town | Lenders, insurers, government | Repeat visits over time |
| Distribution and stock-out maps | FMCG distributors, mobile money providers | Pins, payment methods, restock sources |
| Credit-readiness signals | Microfinance lenders | Pins plus KIP daily logs (with consent) |

## 11. Current gaps and next steps

1. **Test on a real phone in a real market.** The server side is tested (17 automated tests) and the app builds, but the collector screens have not yet been run on a device.
2. Rebuild the Android app (`npm run android:sync`); location permission was added.
3. Build and host the Zambia background map file. Until then the collector map is a plain canvas with a scale bar, the agent's position and the pins.
4. Set up the photo bucket before using the live server; the server's own disk is wiped on every redeploy.
5. Translate the collector screens into Bemba, Nyanja, Tonga and Lozi.
6. Add screens for footfall, vacancies, standalone price collection and the perimeter walk (the server already accepts the first three).
7. Add task assignment, walking-track checks and agent quality scores.
8. Draft the agent contract, consent script and data controller registration.
9. Decide the pay model and daily targets after timing the founder pilot.

Setup instructions for developers are in `backend/GROUND_TRUTH_SETUP.md`.
