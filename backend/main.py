from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.database import engine, Base

# Import all models so Base.metadata.create_all creates every table
from app.models import user, conversation        # noqa
from app.models import business_dashboard        # noqa
from app.models import business_idea             # noqa
from app.models import enhanced_logs             # noqa

# Sprint 10 — business chat history + plan versions
# These tables are also created by _ensure_tables() in business_chat.py
# but importing here ensures they exist on first startup
try:
    from app.models import business_chat_model   # noqa
except ImportError:
    pass  # model file not yet present — tables created by _ensure_tables()

from app.routes import (
    auth, chat, ideas, dashboard, news,
    business_dashboard as bd_routes,
    enhanced_logs as log_routes,
    templates,
)
from app.routes import business_chat

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kwacha Intelligence Platform — KIP API",
    version="3.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Add your Railway frontend URL here after deploying
FRONTEND_URLS = [
    "http://localhost:3000",
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),          # set in Railway variables
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[u for u in FRONTEND_URLS if u],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,           prefix="/api/auth",          tags=["Auth"])
app.include_router(chat.router,           prefix="/api/chat",          tags=["Chat"])
app.include_router(ideas.router,          prefix="/api/ideas",         tags=["Ideas"])
app.include_router(dashboard.router,      prefix="/api/dashboard",     tags=["Dashboard"])
app.include_router(news.router,           prefix="/api/news",          tags=["News"])
app.include_router(bd_routes.router,      prefix="/api/business",      tags=["Business"])
app.include_router(log_routes.router,     prefix="/api/logs",          tags=["Logs"])
app.include_router(templates.router,      prefix="/api/templates",     tags=["Templates"])
app.include_router(business_chat.router,  prefix="/api/business-chat", tags=["Business Chat"])


@app.get("/")
def root():
    return {"platform": "KIP", "version": "3.1.0", "status": "operational"}


@app.get("/health")
def health():
    return {"status": "healthy"}
