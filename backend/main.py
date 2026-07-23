from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

from app.database import engine, Base, SessionLocal
from app.models import user, conversation
from app.models import business_dashboard
from app.models import business_idea
from app.models import enhanced_logs
from app.models import startup_chat as startup_chat_models

try:
    from app.models import enterprise_models
except ImportError:
    pass

try:
    from app.models import subscription_models
except ImportError:
    pass

from app.routes import (
    auth, chat, ideas, dashboard, news,
    business_dashboard as bd_routes,
    enhanced_logs as log_routes,
    templates,
    business_chat,
    startup_chat,
)
from app.routes import enterprise
from app.routes import add_own_business

from app.routes import capital_access
from app.routes import learn
from app.routes import bizsim_routes

from app.routes.briefings import router as briefings_router
from app.routes import i18n_routes

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.models.models_briefing import EconomicBriefing
from app.services.briefing_service import run_daily_briefing



Base.metadata.create_all(bind=engine)

def _migrate_user_verification_columns():
    """Add email-verification columns to an existing `users` table created before they existed."""
    from sqlalchemy import text, inspect
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("users")}
    is_sqlite = engine.dialect.name == "sqlite"
    bool_type = "BOOLEAN DEFAULT 0" if is_sqlite else "BOOLEAN DEFAULT FALSE"
    statements = []
    if "is_verified" not in existing:
        statements.append(f"ALTER TABLE users ADD COLUMN is_verified {bool_type}")
    if "verification_token" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)")
    if "verification_token_expires" not in existing:
        statements.append("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP")
    if not statements:
        return
    with engine.connect() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        conn.commit()

try:
    _migrate_user_verification_columns()
except Exception:
    pass

app = FastAPI(title="Kwacha Intelligence Platform — KIP API", version="4.0.0")

FRONTEND_URLS = [
    "http://localhost:3000",
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[u for u in FRONTEND_URLS if u],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,            prefix="/api/auth",           tags=["Auth"])
app.include_router(i18n_routes.router, prefix="/api/i18n", tags=["i18n"])
app.include_router(chat.router,            prefix="/api/chat",           tags=["Chat"])
app.include_router(ideas.router,           prefix="/api/ideas",          tags=["Ideas"])
app.include_router(dashboard.router,       prefix="/api/dashboard",      tags=["Dashboard"])
app.include_router(news.router,            prefix="/api/news",           tags=["News"])
app.include_router(bd_routes.router,       prefix="/api/business",       tags=["Business"])
app.include_router(log_routes.router,      prefix="/api/logs",           tags=["Logs"])
app.include_router(templates.router,       prefix="/api/templates",      tags=["Templates"])
app.include_router(business_chat.router,   prefix="/api/business-chat",  tags=["Business Chat"])
app.include_router(startup_chat.router,    prefix="/api/startup-chat",   tags=["Startup Chat"])
app.include_router(enterprise.router,      prefix="/api/enterprise",     tags=["Enterprise"])
app.include_router(add_own_business.router,prefix="/api/business",       tags=["Business"])
app.include_router(capital_access.router,  prefix="/api/capital", tags=["Capital"])
app.include_router(learn.router, prefix="/api/learn", tags=["Learn"])
app.include_router(bizsim_routes.router, prefix="/api/bizsim", tags=["BizSim"])

app.include_router(briefings_router, prefix="/api/news", tags=["briefings"])

# ── Economic briefing research scheduler ─────────────────────────────────────
# Research is generated once here and shared by every user via the cached
# `economic_briefings` table — no per-user request should ever trigger it.
# Runs every BRIEFING_REFRESH_DAYS; narrow this once there's enough real
# traffic to justify fresher research.
BRIEFING_REFRESH_DAYS = 7

_briefing_scheduler = AsyncIOScheduler()


def _run_briefing_job():
    db = SessionLocal()
    try:
        run_daily_briefing(db)
    finally:
        db.close()


@app.on_event("startup")
async def start_briefing_scheduler():
    db = SessionLocal()
    try:
        has_briefings = db.query(EconomicBriefing.id).first() is not None
    finally:
        db.close()

    if not has_briefings:
        # Bootstrap so the page isn't empty until the first scheduled run;
        # offloaded to a thread so it doesn't block server startup.
        asyncio.get_event_loop().run_in_executor(None, _run_briefing_job)

    _briefing_scheduler.add_job(
        _run_briefing_job,
        IntervalTrigger(days=BRIEFING_REFRESH_DAYS),
        id="briefing_research",
        replace_existing=True,
    )
    _briefing_scheduler.start()


@app.on_event("shutdown")
def stop_briefing_scheduler():
    _briefing_scheduler.shutdown(wait=False)


@app.get("/")
def root():
    return {"platform": "KIP", "version": "4.0.0", "status": "operational"}

@app.get("/health")
def health():
    return {"status": "healthy"}
