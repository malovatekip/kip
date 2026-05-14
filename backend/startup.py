"""
KIP Startup Script — Railway Deployment
Runs before uvicorn starts. Handles:
  1. ChromaDB migration from app directory → Railway volume (/data)
  2. Creates /data/surveys directory for town JSON files
  3. Validates environment variables
  4. Prints startup diagnostics
"""
import os
import sys
import shutil
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
# Railway volume mount point (set CHROMA_VOLUME_PATH env var, default /data)
VOLUME_PATH       = os.getenv("CHROMA_VOLUME_PATH", "/data")
CHROMA_VOLUME_DIR = os.path.join(VOLUME_PATH, "chroma_db")
SURVEYS_VOLUME_DIR= os.path.join(VOLUME_PATH, "surveys")

# Local paths (inside the app container — ephemeral)
LOCAL_CHROMA      = os.path.join(os.path.dirname(__file__), "kip_knowledge_db")
LOCAL_SURVEYS     = os.path.join(os.path.dirname(__file__), "data", "surveys")

# SQLite DB path (also on volume for persistence)
DB_VOLUME_PATH    = os.path.join(VOLUME_PATH, "kip.db")
LOCAL_DB_PATH     = os.path.join(os.path.dirname(__file__), "kip.db")


def log(msg): print(f"[KIP Startup] {msg}", flush=True)


def ensure_volume():
    """Check that the volume is accessible."""
    try:
        os.makedirs(VOLUME_PATH, exist_ok=True)
        # Write a test file
        test = os.path.join(VOLUME_PATH, ".kip_ready")
        with open(test, 'w') as f:
            f.write("ok")
        os.remove(test)
        log(f"✓ Volume accessible at {VOLUME_PATH}")
        return True
    except Exception as e:
        log(f"⚠ Volume not accessible: {e}. Running in ephemeral mode.")
        return False


def migrate_chromadb(volume_ok: bool):
    """
    Copy local ChromaDB to volume if volume is empty.
    If volume already has data, use it (skip migration).
    """
    if not volume_ok:
        log("Skipping ChromaDB migration — no volume.")
        return LOCAL_CHROMA

    os.makedirs(CHROMA_VOLUME_DIR, exist_ok=True)

    # Check if volume already has a populated ChromaDB
    chroma_sqlite = os.path.join(CHROMA_VOLUME_DIR, "chroma.sqlite3")
    if os.path.exists(chroma_sqlite) and os.path.getsize(chroma_sqlite) > 10_000:
        size_mb = os.path.getsize(chroma_sqlite) / (1024 * 1024)
        log(f"✓ ChromaDB already on volume ({size_mb:.1f} MB) — using existing data.")
        return CHROMA_VOLUME_DIR

    # Check if local ChromaDB exists to migrate
    local_sqlite = os.path.join(LOCAL_CHROMA, "chroma.sqlite3")
    if os.path.exists(local_sqlite):
        size_mb = os.path.getsize(local_sqlite) / (1024 * 1024)
        log(f"Migrating ChromaDB ({size_mb:.1f} MB) → {CHROMA_VOLUME_DIR}...")
        try:
            if os.path.exists(CHROMA_VOLUME_DIR):
                shutil.rmtree(CHROMA_VOLUME_DIR)
            shutil.copytree(LOCAL_CHROMA, CHROMA_VOLUME_DIR)
            log(f"✓ ChromaDB migrated to volume.")
            return CHROMA_VOLUME_DIR
        except Exception as e:
            log(f"⚠ Migration failed: {e}. Falling back to local ChromaDB.")
            return LOCAL_CHROMA
    else:
        log("⚠ No local ChromaDB found. Knowledge base will be empty until ingested.")
        return CHROMA_VOLUME_DIR


def migrate_database(volume_ok: bool):
    """
    Move SQLite DB to volume for persistence across deploys.
    """
    if not volume_ok:
        log("Skipping DB migration — no volume.")
        return

    if os.path.exists(DB_VOLUME_PATH):
        size_kb = os.path.getsize(DB_VOLUME_PATH) / 1024
        log(f"✓ SQLite DB already on volume ({size_kb:.0f} KB).")
        # Symlink local path → volume path so app code works unchanged
        if not os.path.exists(LOCAL_DB_PATH) or not os.path.islink(LOCAL_DB_PATH):
            if os.path.exists(LOCAL_DB_PATH):
                os.remove(LOCAL_DB_PATH)
            os.symlink(DB_VOLUME_PATH, LOCAL_DB_PATH)
            log(f"✓ Symlinked kip.db → {DB_VOLUME_PATH}")
        return

    # First deploy — move existing local DB to volume if it exists
    if os.path.exists(LOCAL_DB_PATH) and not os.path.islink(LOCAL_DB_PATH):
        shutil.copy2(LOCAL_DB_PATH, DB_VOLUME_PATH)
        os.remove(LOCAL_DB_PATH)
        os.symlink(DB_VOLUME_PATH, LOCAL_DB_PATH)
        log(f"✓ Moved kip.db to volume and symlinked.")
    else:
        # Fresh deploy — DB will be created at volume path on first run
        os.symlink(DB_VOLUME_PATH, LOCAL_DB_PATH)
        log(f"✓ Symlinked kip.db → {DB_VOLUME_PATH} (will be created on first run).")


def migrate_surveys(volume_ok: bool):
    """
    Move survey JSON files to volume.
    """
    if not volume_ok:
        return

    os.makedirs(SURVEYS_VOLUME_DIR, exist_ok=True)

    # Copy any existing local survey files to volume
    if os.path.exists(LOCAL_SURVEYS):
        for fname in os.listdir(LOCAL_SURVEYS):
            if fname.endswith('.json'):
                src = os.path.join(LOCAL_SURVEYS, fname)
                dst = os.path.join(SURVEYS_VOLUME_DIR, fname)
                if not os.path.exists(dst):
                    shutil.copy2(src, dst)
                    log(f"  Migrated survey: {fname}")

    # Point local surveys dir → volume
    if os.path.exists(LOCAL_SURVEYS) and not os.path.islink(LOCAL_SURVEYS):
        shutil.rmtree(LOCAL_SURVEYS)
    if not os.path.exists(LOCAL_SURVEYS):
        os.makedirs(os.path.dirname(LOCAL_SURVEYS), exist_ok=True)
        os.symlink(SURVEYS_VOLUME_DIR, LOCAL_SURVEYS)
        log(f"✓ Surveys directory → {SURVEYS_VOLUME_DIR}")


def check_env():
    """Validate required environment variables."""
    required = {"ANTHROPIC_API_KEY": "AI responses", "SECRET_KEY": "JWT auth"}
    missing  = []
    for var, purpose in required.items():
        if not os.getenv(var):
            missing.append(f"  {var} ({purpose})")

    if missing:
        log("⚠ Missing environment variables:")
        for m in missing:
            log(m)
        log("Set these in Railway → Service → Variables before going live.")
    else:
        log("✓ All required environment variables set.")


def write_chroma_path_env(chroma_dir: str):
    """
    Write the resolved ChromaDB path to a .env.chroma file
    so knowledge_base.py can read it at runtime.
    """
    env_file = os.path.join(os.path.dirname(__file__), ".env.chroma")
    with open(env_file, 'w') as f:
        f.write(f"CHROMA_PATH={chroma_dir}\n")
    # Also set as process env var for this session
    os.environ["CHROMA_PATH"] = chroma_dir
    log(f"✓ CHROMA_PATH = {chroma_dir}")


def main():
    log("="*50)
    log("KIP — Kwacha Intelligence Platform")
    log("Starting up...")
    log("="*50)

    check_env()
    volume_ok  = ensure_volume()
    chroma_dir = migrate_chromadb(volume_ok)
    migrate_database(volume_ok)
    migrate_surveys(volume_ok)
    write_chroma_path_env(chroma_dir)

    log("="*50)
    log("Startup complete. Handing off to uvicorn.")
    log("="*50)


if __name__ == "__main__":
    main()
