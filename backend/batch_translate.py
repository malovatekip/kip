"""
KIP Batch Translation Script
=============================
Run this ONCE before deployment (and again any time kip_strings.json is updated)
to pre-translate all UI strings and warm the translation cache.

Usage (Windows PowerShell):
    cd backend
    python batch_translate.py                  # translate to Bemba and Nyanja (default)
    python batch_translate.py --lang bem       # Bemba only
    python batch_translate.py --lang ny        # Nyanja only
    python batch_translate.py --lang bem ny toi  # multiple languages

Requirements:
    - ZEDTRANSLATE_API_KEY must be set in your .env file
    - Run from the backend/ directory
    - pip install httpx python-dotenv

Output:
    - Writes translations to the SQLite cache (kip.db)
    - Also writes a JSON file to frontend/src/i18n/<lang>.json
      so the frontend can load translations without hitting the backend
"""

import os
import sys
import json
import time
import uuid
import argparse
import httpx
import sqlite3
import hashlib
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

API_KEY    = os.getenv("ZEDTRANSLATE_API_KEY", "")
API_URL    = "https://api.zedtranslate.com/v1/translate"
STRINGS_FILE = Path(__file__).parent / "app" / "data" / "kip_strings.json"
OUTPUT_DIR   = Path(__file__).parent.parent / "frontend" / "src" / "i18n"
DB_PATH      = Path(__file__).parent / "kip.db"

LANGUAGE_NAMES = {
    "bem": "Bemba",
    "ny":  "Nyanja",
    "toi": "Tonga",
    "loz": "Lozi",
    "tum": "Tumbuka",
}

def cache_key(text_input: str, target: str) -> str:
    raw = f"en:{target}:{text_input.strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()

def setup_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
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
    """)
    conn.commit()
    return conn

# def translate_one(text_input: str, target: str, retries: int = 3) -> str:
#     # Generate a current Unix timestamp in seconds
#     timestamp = int(time.time())
#     # Generate a unique nonce
#     nonce = str(uuid.uuid4())
#     if not text_input or not text_input.strip():
#         return text_input
#     for attempt in range(retries):
#         try:
#             resp = httpx.post(
#                 API_URL,
#                 headers={
#                     "x-api-key":    API_KEY,
#                     "Content-Type": "application/json",
#                     "x-timestamp": str(timestamp), # Added x-timestamp
#                     "x-nonce": nonce # Added x-nonce
#                 },
#                 json={
#                     "source": "en",
#                     "target": target,
#                     "text":   text_input.strip(),
#                 },
#                 timeout=15.0,
#             )
#             if resp.status_code == 200:
#                 data = resp.json()
#                 print(f"  DEBUG response: {data}")
#                 return (
#                     data.get("translation")
#                     or data.get("translated_text")
#                     or data.get("result")
#                     or data.get("text")
#                     or text_input
#                 )
#             elif resp.status_code == 429:
#                 print(f"  ⚠ Rate limit hit — waiting 5 seconds...")
#                 time.sleep(5)
#             else:
#                 print(f"  ✗ API error {resp.status_code}: {resp.text[:80]}")
#                 return text_input
#         except Exception as e:
#             print(f"  ✗ Request error (attempt {attempt+1}): {e}")
#             if attempt < retries - 1:
#                 time.sleep(2)
#     return text_input

def translate_one(text_input: str, target: str, retries: int = 3) -> str:
    # Generate a current Unix timestamp in seconds
    timestamp = int(time.time())
    # Generate a unique nonce
    nonce = str(uuid.uuid4())
    if not text_input or not text_input.strip():
        return text_input
    if not API_KEY:
        print("  ERROR: ZEDTRANSLATE_API_KEY not set")
        return text_input

    for attempt in range(retries):
        try:
            resp = httpx.post(
                API_URL,
                headers={
                    "x-api-key":    API_KEY,
                    "Content-Type": "application/json",
                    "x-timestamp": str(timestamp),  # Added x-timestamp
                    "x-nonce": nonce  # Added x-nonce
                },
                json={
                    "source": "en",
                    "target": target,
                    "text":   text_input.strip(),
                },
                timeout=15.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                # ZedTranslate returns 'translatedText'
                translated = data.get("translatedText") or text_input
                return translated

            elif resp.status_code == 429:
                print(f"  ⚠ Rate limit — waiting 5s...")
                time.sleep(5)
                # Don't count rate limits as a retry attempt
                continue

            elif resp.status_code == 401:
                detail = resp.json().get("detail", "")
                if "Replay" in detail:
                    # Replay attack — wait and let the timestamp expire, then retry
                    print(f"  ⚠ Replay detected — waiting 3s before retry...")
                    time.sleep(3)
                    continue
                else:
                    print(f"  ✗ Auth error: {detail}")
                    return text_input

            else:
                print(f"  ✗ API error {resp.status_code}: {resp.text[:80]}")
                return text_input

        except httpx.TimeoutException:
            print(f"  ⚠ Timeout (attempt {attempt + 1}) — waiting 3s...")
            time.sleep(3)  # Wait before retry so timestamp is fresh
        except Exception as e:
            print(f"  ✗ Error (attempt {attempt + 1}): {e}")
            if attempt < retries - 1:
                time.sleep(2)

    return text_input

def flatten_strings(obj: dict, prefix: str = "") -> list:
    """Flatten nested dict into list of (key, english_text) tuples."""
    items = []
    for k, v in obj.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, str):
            items.append((full_key, v))
        elif isinstance(v, dict):
            items.extend(flatten_strings(v, prefix=full_key))
    return items

def unflatten(items: list) -> dict:
    """Rebuild nested dict from list of (dot.key, value) tuples. unchanged"""
    result = {}
    for key, value in items:
        parts = key.split(".")
        d = result
        for part in parts[:-1]:
            d = d.setdefault(part, {})
        d[parts[-1]] = value
    return result

def run_batch(target_langs: list):
    if not API_KEY:
        print("ERROR: ZEDTRANSLATE_API_KEY not set in .env file")
        sys.exit(1)

    # Load strings
    if not STRINGS_FILE.exists():
        # Try next to this script
        alt = Path(__file__).parent / "kip_strings.json"
        if alt.exists():
            strings_path = alt
        else:
            print(f"ERROR: kip_strings.json not found at {STRINGS_FILE}")
            sys.exit(1)
    else:
        strings_path = STRINGS_FILE

    with open(strings_path, "r", encoding="utf-8") as f:
        all_strings = json.load(f)

    flat = flatten_strings(all_strings)
    total = len(flat)
    print(f"\n  Loaded {total} strings from kip_strings.json")

    conn = setup_db()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for lang in target_langs:
        lang_name = LANGUAGE_NAMES.get(lang, lang)
        print(f"\n{'='*55}")
        print(f"  Translating to {lang_name} ({lang})")
        print(f"{'='*55}")

        translated_flat = []
        skipped = 0
        translated_count = 0

        skip_keys = set(all_strings.get("_skip_translation", []))
        for i, (key, english) in enumerate(flat, 1):
            if key in skip_keys or key.startswith("_"):
                translated_flat.append((key, english))
                print(f"  [{i:3}/{total}] SKIPPED  {key[:50]}")
                continue
            # Check cache first
            ck = cache_key(english, lang)
            row = conn.execute(
                "SELECT translated FROM translation_cache WHERE cache_key=?", (ck,)
            ).fetchone()

            if row:
                translated_flat.append((key, row[0]))
                skipped += 1
                print(f"  [{i:3}/{total}] CACHED  {key[:50]}")
            else:
                result = translate_one(english, lang)
                translated_flat.append((key, result))

                # Store in cache
                try:
                    conn.execute("""
                        INSERT OR REPLACE INTO translation_cache
                          (cache_key, source_lang, target_lang, source_text, translated, string_key)
                        VALUES (?, 'en', ?, ?, ?, ?)
                    """, (ck, lang, english, result, key))
                    conn.commit()
                except Exception as e:
                    print(f"  Cache write error: {e}")

                status = "OK" if result != english else "UNCHANGED"
                print(f"  [{i:3}/{total}] {status:9} {key[:45]}  →  {result[:40]}")
                translated_count += 1

                # Small delay to avoid rate limiting
                time.sleep(0.3)

        # Write output JSON for frontend
        output_data = unflatten(translated_flat)
        out_file = OUTPUT_DIR / f"{lang}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"\n  ✓ {lang_name} complete")
        print(f"    Newly translated: {translated_count}")
        print(f"    From cache:       {skipped}")
        print(f"    Output:           {out_file}")

    # Also copy the English source as en.json
    en_file = OUTPUT_DIR / "en.json"
    with open(en_file, "w", encoding="utf-8") as f:
        json.dump(all_strings, f, ensure_ascii=False, indent=2)
    print(f"\n  ✓ English source written to {en_file}")

    conn.close()
    print(f"\n{'='*55}")
    print(f"  Batch translation complete.")
    print(f"  Files are in: {OUTPUT_DIR}")
    print(f"{'='*55}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch translate KIP UI strings")
    parser.add_argument(
        "--lang", nargs="+",
        choices=list(LANGUAGE_NAMES.keys()),
        default=["bem", "ny"],
        help="Target languages (default: bem ny)"
    )
    args = parser.parse_args()
    run_batch(args.lang)
