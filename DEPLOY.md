# KIP — Railway Deployment Guide
**Version 3.1 | Beta Release**

---

## What you need before starting
- A [Railway account](https://railway.app) (free tier works for beta)
- Railway CLI installed — run in PowerShell:
  ```
  npm install -g @railway/cli
  ```
- Your project pushed to a GitHub repository
- Your `ANTHROPIC_API_KEY` from Anthropic

---

## Step 1 — Prepare your repository

Your repo must have this structure:
```
kip/
  backend/          ← FastAPI app (this is your Railway backend service root)
    main.py
    startup.py      ← NEW — copy from this sprint
    Procfile        ← NEW — copy from this sprint
    railway.toml    ← NEW — copy from this sprint
    requirements.txt
    kip_knowledge_db/   ← your ChromaDB (must be in repo for first deploy)
    ...
  frontend/         ← React app (this is your Railway frontend service root)
    ...
```

**IMPORTANT — include ChromaDB in git for first deploy:**

In `backend/.gitignore`, make sure `kip_knowledge_db/` is NOT ignored.
Add this line to include it:
```
# .gitignore — add this exception
!kip_knowledge_db/
```

This lets Railway get the knowledge base on first deploy. After startup.py
migrates it to the volume, you can re-add it to .gitignore.

---

## Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → select your KIP repo

---

## Step 3 — Configure the Backend service

In Railway dashboard → your backend service:

**Settings → Build:**
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`

**Settings → Deploy:**
- Start Command: `python startup.py && uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`

**Variables → Add these:**
```
ANTHROPIC_API_KEY    = sk-ant-...your key here...
SECRET_KEY           = any-long-random-string-at-least-32-chars
ENVIRONMENT          = production
CHROMA_VOLUME_PATH   = /data
```

Generate a SECRET_KEY by running this in PowerShell:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Step 4 — Add the persistent volume

This is the critical step that keeps ChromaDB and your database alive across deploys.

1. In your Railway project → click **+ New** → **Volume**
2. Name it: `kip-data`
3. Mount it to your backend service
4. Set Mount Path: `/data`
5. Railway will restart your service to attach the volume

After this, startup.py will automatically:
- Copy `kip_knowledge_db/` → `/data/chroma_db/` (first deploy only)
- Symlink `kip.db` → `/data/kip.db` (persistent database)
- Symlink `data/surveys/` → `/data/surveys/` (survey JSON files)

---

## Step 5 — Deploy the Frontend

1. Add a new service to the same Railway project → **GitHub repo**
2. Set Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Start Command: (leave empty — Railway serves the dist/ folder as static)
5. Add variable:
   ```
   VITE_API_URL = https://your-backend-service.railway.app/api
   ```
   Replace with your actual backend URL from Step 3.

---

## Step 6 — Update CORS in backend

Open `backend/main.py` and add your Railway frontend URL to allow_origins:
```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:5173",
    "https://your-frontend.railway.app",   # ← add this
],
```

Redeploy after this change.

---

## Step 7 — Verify the deployment

Visit your backend URL + `/health`:
```
https://your-backend.railway.app/health
```
Should return: `{"status": "healthy"}`

Check startup logs in Railway → your backend service → **Deployments** → latest → **View Logs**.

You should see:
```
[KIP Startup] ✓ Volume accessible at /data
[KIP Startup] Migrating ChromaDB (XXX MB) → /data/chroma_db...
[KIP Startup] ✓ ChromaDB migrated to volume.
[KIP Startup] ✓ Symlinked kip.db → /data/kip.db
[KIP Startup] ✓ CHROMA_PATH = /data/chroma_db
[KIP Startup] Startup complete. Handing off to uvicorn.
[KIP Knowledge] Loaded. 6916 chunks in database.
```

---

## Step 8 — After first successful deploy

Once ChromaDB is on the volume, you can remove it from git to keep the repo lean:

```
# In backend/.gitignore — re-add this line
kip_knowledge_db/
```

On all future deploys, startup.py will detect the existing data on the volume and skip migration.

---

## Troubleshooting

**"ChromaDB empty after deploy"**
→ Check that `kip_knowledge_db/` was included in the git commit.
→ Check Railway logs for migration errors.

**"kip.db not found"**
→ Volume may not be mounted. Check Railway → Volume → is it attached to the service?

**"CORS error in browser"**
→ Add your frontend Railway URL to `allow_origins` in `main.py`.

**"Module not found"**
→ Run `pip install -r requirements.txt` locally to confirm all deps are listed.

**Scaling warning:**
Keep your backend service at **1 replica** on Railway.
SQLite does not handle concurrent writes from multiple instances.
Scale to PostgreSQL before increasing replicas.

---

## Environment variables checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✓ | AI responses |
| `SECRET_KEY` | ✓ | JWT token signing |
| `ENVIRONMENT` | ✓ | Set to `production` |
| `CHROMA_VOLUME_PATH` | ✓ | Set to `/data` |
| `VITE_API_URL` | ✓ (frontend) | Backend API URL |

---

*KIP — Kwacha Intelligence Platform | Malovate | Beta*
