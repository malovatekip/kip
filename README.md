# KIP — Kwacha Intelligence Platform
> AI-powered business idea generation for Zambian entrepreneurs.

---

## Windows 11 Setup Guide

### Step 1 — Install Prerequisites (once only)

**Python 3.10+**
- Download: https://www.python.org/downloads/
- CRITICAL: tick "Add Python to PATH" during install
- Verify: open Command Prompt → type `python --version`

**Node.js (LTS)**
- Download: https://nodejs.org
- Install with default settings
- Verify: open Command Prompt → type `node --version`

---

### Step 2 — Run Setup (once only)

**Recommended — PowerShell:**
Right-click `setup.ps1` → Run with PowerShell

If blocked by Windows: Open PowerShell as Administrator and run:
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

**Alternative — Command Prompt:**
Double-click `setup.bat`

---

### Step 3 — Add your Anthropic API Key

Open `backend\.env` in Notepad and set:
  ANTHROPIC_API_KEY=your-key-here

Get your key: https://console.anthropic.com
(KIP works without it in Sprint 1 — full AI activates in Sprint 2)

---

### Step 4 — Start KIP

Right-click `start.ps1` → Run with PowerShell
OR double-click `start.bat`

Opens two terminal windows + your browser at http://localhost:3000

---

## Project Structure
```
kip/
  backend/          Python FastAPI server (KIP brain)
    app/
      models/       Database tables
      routes/       API endpoints
      services/     K-BIG-1 engine
    .env            Your secret keys
  frontend/         React web app (KIP interface)
    src/
      pages/        All pages
      components/   Layout, navigation
  setup.ps1 / .bat  Run once to install
  start.ps1 / .bat  Run to start KIP
```

## URLs when running
- http://localhost:3000  KIP web app
- http://localhost:8000  Backend API
- http://localhost:8000/docs  API documentation

## Sprint Status
- [x] Sprint 1 — Foundation
- [ ] Sprint 2 — K-BIG-1 Engine
- [ ] Sprint 3 — Intelligence Layer
- [ ] Sprint 4 — Business Idea Repository
- [ ] Sprint 5 — Pricing & Feasibility
- [ ] Sprint 6 — Economic Dashboard
- [ ] Sprint 7 — QA & Polish
- [ ] Sprint 8 — Deployment

## Team
Paul Maloba — CEO & Founder | KIP Engineering
