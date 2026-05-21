from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.database import engine, Base
from app.models import user, conversation
from app.models import business_dashboard
from app.models import business_idea
from app.models import enhanced_logs

try:
    from app.models import enterprise_models
except ImportError:
    pass

from app.routes import (
    auth, chat, ideas, dashboard, news,
    business_dashboard as bd_routes,
    enhanced_logs as log_routes,
    templates,
    business_chat,
)
from app.routes import enterprise
from app.routes import add_own_business

Base.metadata.create_all(bind=engine)

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
app.include_router(chat.router,            prefix="/api/chat",           tags=["Chat"])
app.include_router(ideas.router,           prefix="/api/ideas",          tags=["Ideas"])
app.include_router(dashboard.router,       prefix="/api/dashboard",      tags=["Dashboard"])
app.include_router(news.router,            prefix="/api/news",           tags=["News"])
app.include_router(bd_routes.router,       prefix="/api/business",       tags=["Business"])
app.include_router(log_routes.router,      prefix="/api/logs",           tags=["Logs"])
app.include_router(templates.router,       prefix="/api/templates",      tags=["Templates"])
app.include_router(business_chat.router,   prefix="/api/business-chat",  tags=["Business Chat"])
app.include_router(enterprise.router,      prefix="/api/enterprise",     tags=["Enterprise"])
app.include_router(add_own_business.router,prefix="/api/business",       tags=["Business"])

@app.get("/")
def root():
    return {"platform": "KIP", "version": "4.0.0", "status": "operational"}

@app.get("/health")
def health():
    return {"status": "healthy"}
