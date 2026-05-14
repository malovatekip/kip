from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.database import engine, Base
from app.routes import (
    auth, chat, ideas, dashboard, news,
    business_dashboard, enhanced_logs, templates
)
from app.routes import business_chat

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kwacha Intelligence Platform — KIP API",
    version="3.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,               prefix="/api/auth",          tags=["Auth"])
app.include_router(chat.router,               prefix="/api/chat",          tags=["Chat"])
app.include_router(ideas.router,              prefix="/api/ideas",         tags=["Ideas"])
app.include_router(dashboard.router,          prefix="/api/dashboard",     tags=["Dashboard"])
app.include_router(news.router,               prefix="/api/news",          tags=["News"])
app.include_router(business_dashboard.router, prefix="/api/business",      tags=["Business"])
app.include_router(enhanced_logs.router,      prefix="/api/logs",          tags=["Logs"])
app.include_router(templates.router,          prefix="/api/templates",     tags=["Templates"])
app.include_router(business_chat.router,      prefix="/api/business-chat", tags=["Business Chat"])

@app.get("/")
def root():
    return {"platform": "KIP", "version": "3.1.0", "status": "operational"}

@app.get("/health")
def health():
    return {"status": "healthy"}
