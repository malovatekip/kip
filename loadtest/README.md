# KIP load testing

Simulates many concurrent users against the **local dev servers only**
(`http://localhost:8000` backend, `http://localhost:3000` frontend) and
produces a PDF performance report. Not wired to production — see
`../CLAUDE.md`/`DEPLOY.md` for how the app is actually deployed (Railway +
Vercel); this tooling deliberately never targets that.

## Why not just hammer the real endpoints with any load tool?

Two things in this app make a naive load test misleading or costly:

1. **The auth rate limiter** (`backend/app/rate_limit.py`) caps
   `/api/auth/register` at 5/hour and `/api/auth/login` at 10/minute, keyed
   by IP. Every virtual user here shares localhost's IP, so registering/
   logging in dozens of them during a timed run would immediately 429.
   `seed_users.py` sidesteps this by minting valid JWTs directly via
   SQLAlchemy + the backend's own `security.py`, never touching those
   HTTP endpoints.
2. **Several endpoints call the real Anthropic API** per request — not
   just the obvious `chat` endpoint, but also `POST /api/capital/match`
   and `POST /api/logs/submit`, which look like plain CRUD but generate
   AI guidance/coaching text. These are split into a separate,
   hard-capped locustfile (`locustfile_ai_capped.py`) so "many concurrent
   users" never turns into an open-ended Anthropic bill.

## One-time setup

```powershell
python -m venv loadtest\venv
loadtest\venv\Scripts\pip install -r loadtest\requirements.txt
```

## Run

```powershell
# 1. Seed test users + JWTs (uses the BACKEND's venv, not loadtest's)
backend\venv\Scripts\python.exe loadtest\seed_users.py --count 60

# 2. Make sure both dev servers are running:
#      backend:  cd backend; venv\Scripts\uvicorn main:app --reload --port 8000
#      frontend: cd frontend; npm run dev

# 3. Main load test — full concurrency, non-AI endpoints only
loadtest\venv\Scripts\locust -f loadtest\locustfile_main.py --headless `
  --users 50 --spawn-rate 1 --run-time 7m --host http://localhost:8000 `
  --csv loadtest\results\main --html loadtest\results\main_report.html

# 4. AI-endpoint test — small, short, spend-capped
$env:LOADTEST_AI_BUDGET = 8
loadtest\venv\Scripts\locust -f loadtest\locustfile_ai_capped.py --headless `
  --users 3 --spawn-rate 1 --run-time 90s --host http://localhost:8000 `
  --csv loadtest\results\ai

# 5. Generate the PDF report
loadtest\venv\Scripts\python.exe loadtest\generate_report.py `
  --main-prefix loadtest\results\main --ai-prefix loadtest\results\ai `
  --main-users 50 --ai-users 3 `
  --out loadtest\report\KIP_LoadTest_Report.pdf

start loadtest\report\KIP_LoadTest_Report.pdf
```

## Tuning

- Re-run step 3 with `--users 100` to specifically probe SQLite write
  contention on `POST /api/ideas/{id}/feedback` — expect possible
  `database is locked` errors under concurrent writes; this is a known,
  already-documented limitation (see `../DEPLOY.md`), not a bug to fix here.
- Raise `LOADTEST_AI_BUDGET` if you want more AI-endpoint samples, but
  remember each one is a real Anthropic API call against your configured
  key.
- Don't push local VU counts much past ~100-150 — beyond that Locust and
  the servers under test are competing for the same machine's CPU, and
  results start measuring the load generator's own overhead.

## What's NOT covered (v1 scope)

- BizSim's AI-backed endpoints (`bizsim_routes.py`) — a large stateful
  game engine, deliberately out of scope for the first pass.
- `POST /api/business-chat/chat` and the full `POST /api/logs/submit`
  path — both require an existing business plan tied to the user, which
  seeded users don't have (creating one is itself a multi-step
  AI-generated flow). Add a follow-up seed step if you want to exercise
  this path too.
- Production (Railway/Vercel) — by design, see above.
