#!/usr/bin/env python3
"""
KIP Diagnostic & Repair Script
Run from the backend/ folder with venv active:
  python diagnose.py

This script:
1. Checks your environment configuration
2. Tests database connectivity and table existence
3. Tests the KIP engine
4. Shows what ideas (if any) are in the database
5. Identifies exactly what is broken
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

print("\n╔══════════════════════════════════════════════╗")
print("║   KIP Diagnostic Script                      ║")
print("╚══════════════════════════════════════════════╝\n")

issues = []
ok     = []

# ── 1. Check .env ─────────────────────────────────────────────────
print("[ 1/6 ]  Checking environment...")
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("ANTHROPIC_API_KEY", "")
if not api_key or api_key == "your-anthropic-api-key-here":
    issues.append("ANTHROPIC_API_KEY is not set in backend/.env")
    print("  ✗  ANTHROPIC_API_KEY: NOT SET")
    print("     → Ideas cannot be generated or saved without this key")
    print("     → Get your key at: https://console.anthropic.com")
else:
    ok.append("ANTHROPIC_API_KEY is set")
    print(f"  ✓  ANTHROPIC_API_KEY: set (sk-ant-...{api_key[-6:]})")

# ── 2. Check database ─────────────────────────────────────────────
print("\n[ 2/6 ]  Checking database...")
try:
    from app.database import SessionLocal, engine, Base
    db = SessionLocal()

    # Check tables exist
    from sqlalchemy import inspect as sqlinspect
    inspector = sqlinspect(engine)
    tables = inspector.get_table_names()

    required_tables = ["users", "conversations", "messages", "business_ideas"]
    for t in required_tables:
        if t in tables:
            print(f"  ✓  Table '{t}' exists")
            ok.append(f"Table {t} exists")
        else:
            issues.append(f"Table '{t}' is missing from database")
            print(f"  ✗  Table '{t}' MISSING")

    # Check Sprint 4 tables
    sprint4_tables = ["business_launch_plans", "daily_business_logs", "coaching_entries"]
    for t in sprint4_tables:
        status = "✓" if t in tables else "✗ (run: uvicorn main:app to create)"
        print(f"  {status}  Table '{t}'")

except Exception as e:
    issues.append(f"Database error: {e}")
    print(f"  ✗  Database error: {e}")
    db = None

# ── 3. Count records ──────────────────────────────────────────────
print("\n[ 3/6 ]  Checking data counts...")
if db:
    try:
        from app.models.user import User
        from app.models.conversation import Conversation, Message
        from app.models.business_idea import BusinessIdea

        users  = db.query(User).count()
        convs  = db.query(Conversation).count()
        msgs   = db.query(Message).count()
        ideas  = db.query(BusinessIdea).count()

        print(f"  Users         : {users}")
        print(f"  Conversations : {convs}")
        print(f"  Messages      : {msgs}")
        print(f"  Business Ideas: {ideas}")

        if convs > 0 and ideas == 0:
            issues.append("Conversations exist but zero ideas saved — API key was not set when chats happened")
            print("\n  ⚠  PROBLEM DETECTED: You have conversations but no saved ideas.")
            print("     This means your API key was not set when you were chatting.")
            print("     The placeholder engine ran — it responds but never saves ideas.")

        if ideas > 0:
            print(f"\n  Ideas in database:")
            all_ideas = db.query(BusinessIdea).all()
            for idea in all_ideas:
                accepted = "✓ Accepted" if idea.accepted else ("✗ Declined" if idea.accepted is False else "Pending")
                print(f"    • {idea.idea_name} | {idea.location or 'no location'} | {accepted}")

    except Exception as e:
        issues.append(f"Record count error: {e}")
        print(f"  ✗  Error reading records: {e}")

# ── 4. Check Sprint 2 engine files ────────────────────────────────
print("\n[ 4/6 ]  Checking Sprint 2 engine files...")
sprint2_files = [
    "app/services/kip_prompt.py",
    "app/services/knowledge_base.py",
    "app/services/kip_engine.py",
    "app/data/town_profiles.py",
    "app/data/initial_knowledge.py",
    "app/data/town_coordinates.py",
    "app/services/map_service.py",
]
for f in sprint2_files:
    exists = os.path.exists(f)
    print(f"  {'✓' if exists else '✗'}  {f}")
    if not exists:
        issues.append(f"Missing Sprint 2 file: {f}")

# Check if app/data/__init__.py exists
init_path = "app/data/__init__.py"
if os.path.exists(init_path):
    print(f"  ✓  {init_path}")
else:
    issues.append(f"Missing {init_path} — Python cannot import the data package without this")
    print(f"  ✗  {init_path}  ← THIS WILL CAUSE IMPORT ERRORS")

# ── 5. Test KIP engine import ─────────────────────────────────────
print("\n[ 5/6 ]  Testing KIP engine import...")
try:
    from app.services.kip_engine import generate_kip_response
    print("  ✓  kip_engine imported successfully")

    # Check if it's the full engine or the Sprint 1 stub
    import inspect
    src = inspect.getsource(generate_kip_response)
    if "get_knowledge_base" in src and "get_town_profile" in src and "get_map_context" in src:
        print("  ✓  Full Sprint 2 engine detected (RAG + town profiles + map)")
        ok.append("Sprint 2 engine is active")
    elif "get_knowledge_base" in src:
        print("  ⚠  Partial Sprint 2 engine (RAG only, no map service)")
    else:
        print("  ✗  Sprint 1 stub detected — Sprint 2 engine NOT installed")
        issues.append("kip_engine.py is still the Sprint 1 placeholder — Sprint 2 files not copied")

except ImportError as e:
    issues.append(f"kip_engine import error: {e}")
    print(f"  ✗  Import error: {e}")
    print("     This is likely caused by a missing __init__.py in app/data/")

# ── 6. Check Sprint 3 and 4 routes ───────────────────────────────
print("\n[ 6/6 ]  Checking Sprint 3/4 route files...")
route_files = [
    ("app/routes/news.py",               "Sprint 3 — News Feed"),
    ("app/routes/business_dashboard.py", "Sprint 4 — Business Dashboard"),
    ("app/models/news.py",               "Sprint 3 — News models"),
    ("app/models/business_dashboard.py", "Sprint 4 — Dashboard models"),
    ("app/services/news_service.py",     "Sprint 3 — News service"),
    ("app/services/dashboard_service.py","Sprint 4 — Dashboard service"),
]
for path, label in route_files:
    exists = os.path.exists(path)
    print(f"  {'✓' if exists else '✗'}  {path}  ({label})")
    if not exists:
        issues.append(f"Missing: {path}")

# ── Summary ───────────────────────────────────────────────────────
print("\n╔══════════════════════════════════════════════╗")
print("║   DIAGNOSTIC SUMMARY                         ║")
print("╚══════════════════════════════════════════════╝\n")

if issues:
    print(f"Found {len(issues)} issue(s):\n")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
    print()
else:
    print("  All checks passed! KIP is configured correctly.\n")

if db:
    db.close()

# ── Auto-fix: create missing __init__.py ──────────────────────────
init_path = "app/data/__init__.py"
if not os.path.exists(init_path):
    print("AUTO-FIX: Creating missing app/data/__init__.py...")
    os.makedirs("app/data", exist_ok=True)
    with open(init_path, "w") as f:
        f.write("# KIP Data Package\n")
    print("  ✓  Created app/data/__init__.py\n")

print("─" * 48)
print("Share the output of this script with your CTO")
print("to pinpoint exactly what needs to be fixed.\n")
