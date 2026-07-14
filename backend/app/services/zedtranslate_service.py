"""
KIP ZedTranslate Service
========================
Wraps the ZedTranslate API (https://zedtranslate.com) for Zambian language
translation across the entire KIP platform.

Supported target languages:
  bem  →  Bemba
  ny   →  Nyanja
  toi  →  Tonga
  loz  →  Lozi
  tum  →  Tumbuka

Architecture:
  - Every translation is cached in SQLite under the `translation_cache` table.
  - This means each unique string is only ever sent to ZedTranslate ONCE,
    regardless of how many users request it.
  - The batch pre-translation script (batch_translate.py) should be run
    before deployment to warm the cache for all UI strings.
  - Runtime translations (for AI-generated content) fall through to the live
    API if not cached, then store the result.

Usage:
  from app.services.zedtranslate_service import translate, translate_batch, get_ui_strings

  # Translate a single string
  result = await translate("Welcome to KIP", target="bem")

  # Translate AI-generated content after Claude responds
  coaching_in_bemba = await translate(claude_response, target="bem")

  # Get all cached UI strings for a language (for frontend)
  strings = get_ui_strings("bem")
"""

import os
import json
import hashlib
import logging
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

ZEDTRANSLATE_API_URL = "https://api.zedtranslate.com/v1/translate"
ZEDTRANSLATE_API_KEY = os.getenv("ZEDTRANSLATE_API_KEY", "")

SUPPORTED_LANGUAGES = {
    "bem": "Bemba",
    "ny":  "Nyanja",
    "toi": "Tonga",
    "loz": "Lozi",
    "tum": "Tumbuka",
}

# ── Cache table setup ─────────────────────────────────────────────────────────

def ensure_cache_table(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS translation_cache (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            cache_key    TEXT UNIQUE NOT NULL,
            source_lang  TEXT NOT NULL DEFAULT 'en',
            target_lang  TEXT NOT NULL,
            source_text  TEXT NOT NULL,
            translated   TEXT NOT NULL,
            string_key   TEXT,
            created_at   TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.commit()


def _cache_key(text_input: str, target: str, source: str = "en") -> str:
    """Generate a unique cache key for a translation request."""
    raw = f"{source}:{target}:{text_input.strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def get_cached(db: Session, text_input: str, target: str, source: str = "en") -> Optional[str]:
    """Return cached translation if it exists."""
    key = _cache_key(text_input, target, source)
    row = db.execute(
        text("SELECT translated FROM translation_cache WHERE cache_key=:k"),
        {"k": key}
    ).fetchone()
    return row[0] if row else None


def store_cache(db: Session, text_input: str, translated: str,
                target: str, source: str = "en", string_key: str = None):
    """Store a translation in the cache."""
    key = _cache_key(text_input, target, source)
    try:
        db.execute(text("""
            INSERT OR REPLACE INTO translation_cache
              (cache_key, source_lang, target_lang, source_text, translated, string_key)
            VALUES (:k, :src, :tgt, :inp, :out, :sk)
        """), {
            "k":   key,
            "src": source,
            "tgt": target,
            "inp": text_input,
            "out": translated,
            "sk":  string_key,
        })
        db.commit()
    except Exception as e:
        logger.error(f"Cache write error: {e}")


# ── Core translation ──────────────────────────────────────────────────────────

async def translate(
    text_input: str,
    target: str,
    source: str = "en",
    db: Session = None,
    string_key: str = None,
) -> str:
    """
    Translate a string to the target language.
    Checks cache first. Falls back to ZedTranslate API if not cached.
    Returns the original text if translation fails (graceful degradation).
    """
    if not text_input or not text_input.strip():
        return text_input

    if target == "en" or target not in SUPPORTED_LANGUAGES:
        return text_input

    # Check cache first
    if db:
        ensure_cache_table(db)
        cached = get_cached(db, text_input, target, source)
        if cached:
            return cached

    # Call ZedTranslate API
    if not ZEDTRANSLATE_API_KEY:
        logger.warning("ZEDTRANSLATE_API_KEY not set — returning source text")
        return text_input

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                ZEDTRANSLATE_API_URL,
                headers={
                    "x-api-key":     ZEDTRANSLATE_API_KEY,
                    "Content-Type":  "application/json",
                },
                json={
                    "source": source,
                    "target": target,
                    "text":   text_input.strip(),
                },
            )

        if resp.status_code == 200:
            data        = resp.json()
            translated = data.get("translatedText") or text_input
            # Store in cache
            if db and translated != text_input:
                store_cache(db, text_input, translated, target, source, string_key)
            return translated

        elif resp.status_code == 429:
            logger.warning("ZedTranslate rate limit hit")
            return text_input
        else:
            logger.error(f"ZedTranslate error {resp.status_code}: {resp.text}")
            return text_input

    except httpx.TimeoutException:
        logger.error("ZedTranslate request timed out")
        return text_input
    except Exception as e:
        logger.error(f"ZedTranslate unexpected error: {e}")
        return text_input


async def translate_batch(
    strings: dict,
    target: str,
    source: str = "en",
    db: Session = None,
) -> dict:
    """
    Translate a dictionary of {key: english_text} pairs.
    Returns {key: translated_text}.
    Used by the batch pre-translation script and the /api/i18n/strings endpoint. translated
    """
    results = {}
    for key, value in strings.items():
        if isinstance(value, str):
            results[key] = await translate(
                value, target=target, source=source, db=db, string_key=key
            )
        elif isinstance(value, dict):
            # Nested keys (e.g. {"errors": {"required": "This field is required"}})
            results[key] = {}
            for subkey, subval in value.items():
                results[key][subkey] = await translate(
                    subval, target=target, source=source, db=db,
                    string_key=f"{key}.{subkey}"
                )
        else:
            results[key] = value
    return results


# ── Synchronous version (for startup scripts) ─────────────────────────────────

def translate_sync(text_input: str, target: str, source: str = "en") -> str:
    """
    Synchronous version for use in batch scripts and non-async contexts.
    """
    if not text_input or target == "en" or target not in SUPPORTED_LANGUAGES:
        return text_input
    if not ZEDTRANSLATE_API_KEY:
        return text_input
    try:
        resp = httpx.post(
            ZEDTRANSLATE_API_URL,
            headers={
                "x-api-key":    ZEDTRANSLATE_API_KEY,
                "Content-Type": "application/json",
            },
            json={"source": source, "target": target, "text": text_input.strip()},
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return (
                data.get("translation")
                or data.get("translated_text")
                or data.get("result")
                or data.get("text")
                or text_input
            )
        return text_input
    except Exception:
        return text_input


# ── UI string cache retrieval ─────────────────────────────────────────────────

def get_ui_strings(target: str, db: Session) -> dict:
    """
    Return all cached UI string translations for a given language.
    Used by the /api/i18n/strings endpoint to serve the frontend.
    Only returns strings that have a string_key (i.e. UI strings, not AI content).
    """
    ensure_cache_table(db)
    rows = db.execute(text("""
        SELECT string_key, translated
        FROM translation_cache
        WHERE target_lang=:tgt AND string_key IS NOT NULL
        ORDER BY string_key ASC
    """), {"tgt": target}).fetchall()

    result = {}
    for row in rows:
        key, val = row[0], row[1]
        # Rebuild nested structure from dot notation (e.g. "errors.required")
        parts = key.split(".")
        d = result
        for part in parts[:-1]:
            d = d.setdefault(part, {})
        d[parts[-1]] = val
    return result
