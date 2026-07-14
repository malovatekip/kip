"""
KIP i18n Routes
================
GET  /api/i18n/strings/{lang}     — serve all UI strings for a language
POST /api/i18n/translate          — translate a single string on demand
POST /api/i18n/translate-ai       — translate AI-generated content
PUT  /api/i18n/language           — save user's language preference
GET  /api/i18n/languages          — list all supported languages
"""
import os
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.security import get_current_user
from app.models.user import User
from app.services.zedtranslate_service import (
    translate, get_ui_strings, SUPPORTED_LANGUAGES
)

router = APIRouter()

# Path to pre-built JSON files (written by batch_translate.py)
I18N_DIR = Path(__file__).parent.parent / "data" / "i18n"


class TranslateRequest(BaseModel):
    text:   str
    target: str
    source: str = "en"

class LanguageRequest(BaseModel):
    language: str


# ── Language list ─────────────────────────────────────────────────────────────

@router.get("/languages")
def get_languages():
    return {
        "languages": [
            {"code": "en",  "name": "English",  "native": "English", "flag": "🇬🇧"},
            {"code": "bem", "name": "Bemba",    "native": "Icibemba", "flag": "🇿🇲"},
            {"code": "ny",  "name": "Nyanja",   "native": "Chinyanja","flag": "🇿🇲"},
        ]
    }


# ── Serve pre-built string files ──────────────────────────────────────────────

@router.get("/strings/{lang}")
async def get_strings(
    lang: str,
    db: Session = Depends(get_db),
):
    """
    Returns all UI strings for the given language.
    First tries the pre-built JSON files (fast).
    Falls back to the translation cache in SQLite.
    Falls back to English if neither is available.
    """
    if lang == "en":
        # Serve English source
        src = I18N_DIR / "en.json"
        if src.exists():
            with open(src, encoding="utf-8") as f:
                return {"lang": "en", "strings": json.load(f)}
        # Fallback: load from kip_strings.json
        fallback = Path(__file__).parent.parent / "data" / "kip_strings.json"
        if fallback.exists():
            with open(fallback, encoding="utf-8") as f:
                return {"lang": "en", "strings": json.load(f)}

    if lang not in SUPPORTED_LANGUAGES and lang != "en":
        raise HTTPException(400, f"Language '{lang}' is not supported. Use: en, {', '.join(SUPPORTED_LANGUAGES)}")

    # Try pre-built JSON first (fastest — no DB hit)
    json_file = I18N_DIR / f"{lang}.json"
    if json_file.exists():
        with open(json_file, encoding="utf-8") as f:
            return {"lang": lang, "strings": json.load(f)}

    # Fall back to SQLite cache
    strings = get_ui_strings(lang, db)
    if strings:
        return {"lang": lang, "strings": strings}

    # If nothing is cached, return English with a header warning
    en_file = I18N_DIR / "en.json"
    if en_file.exists():
        with open(en_file, encoding="utf-8") as f:
            return {
                "lang": "en",
                "strings": json.load(f),
                "warning": f"Translations for '{lang}' not available — run batch_translate.py",
            }

    raise HTTPException(503, "Translation strings not available. Run batch_translate.py first.")


# ── On-demand translation (for AI content) ────────────────────────────────────

@router.post("/translate")
async def translate_text(
    req: TranslateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Translate a single string on demand. Used for AI-generated content."""
    if not req.text or not req.text.strip():
        return {"translated": req.text}

    result = await translate(
        req.text,
        target=req.target,
        source=req.source,
        db=db,
    )
    return {"translated": result, "lang": req.target}


@router.post("/translate-ai")
async def translate_ai_content(
    req: TranslateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Translate Claude-generated content (coaching, ideas, explanations).
    Same as /translate but marks the result as AI-translated for the frontend.
    """
    if req.target == "en":
        return {"translated": req.text, "lang": "en", "ai_translated": False}

    result = await translate(
        req.text,
        target=req.target,
        source=req.source,
        db=db,
    )
    return {
        "translated":   result,
        "lang":         req.target,
        "ai_translated": True,
        "attribution":  "ZedTranslate",
    }


# ── Language preference ───────────────────────────────────────────────────────

@router.put("/language")
def set_language(
    req: LanguageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save the user's language preference to their profile."""
    valid = ["en", "bem", "ny", "toi", "loz", "tum"]
    if req.language not in valid:
        raise HTTPException(400, f"Invalid language. Must be one of: {', '.join(valid)}")

    # Add language column if missing (migration)
    cols = [r[1] for r in db.execute(text("PRAGMA table_info(users)")).fetchall()]
    if "language" not in cols:
        db.execute(text("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'"))
        db.commit()

    db.execute(
        text("UPDATE users SET language=:lang WHERE id=:uid"),
        {"lang": req.language, "uid": current_user.id}
    )
    db.commit()
    return {"language": req.language, "saved": True}


@router.get("/language")
def get_language(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the user's saved language preference."""
    cols = [r[1] for r in db.execute(text("PRAGMA table_info(users)")).fetchall()]
    if "language" not in cols:
        return {"language": "en"}

    row = db.execute(
        text("SELECT language FROM users WHERE id=:uid"),
        {"uid": current_user.id}
    ).fetchone()
    return {"language": row[0] if row and row[0] else "en"}
