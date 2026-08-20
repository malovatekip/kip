"""
KIP Startup Script — Railway Deployment
Runs before uvicorn. Handles:
  1. ChromaDB migration to Railway volume
  2. SQLite symlink for persistence
  3. Surveys directory setup
  4. ALL database table creation (ORM + raw SQL)
  5. Environment variable validation
"""
import os
import sys
import shutil
import json
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
VOLUME_PATH        = os.getenv("CHROMA_VOLUME_PATH", "/data")
CHROMA_VOLUME_DIR  = os.path.join(VOLUME_PATH, "chroma_db")
SURVEYS_VOLUME_DIR = os.path.join(VOLUME_PATH, "surveys")
DB_VOLUME_PATH     = os.path.join(VOLUME_PATH, "kip.db")
LOCAL_CHROMA       = os.path.join(os.path.dirname(__file__), "kip_knowledge_db")
LOCAL_SURVEYS      = os.path.join(os.path.dirname(__file__), "data", "surveys")
LOCAL_DB_PATH      = os.path.join(os.path.dirname(__file__), "kip.db")


def log(msg): print(f"[KIP Startup] {msg}", flush=True)


def ensure_volume():
    try:
        os.makedirs(VOLUME_PATH, exist_ok=True)
        test = os.path.join(VOLUME_PATH, ".kip_ready")
        with open(test, 'w') as f: f.write("ok")
        os.remove(test)
        log(f"✓ Volume accessible at {VOLUME_PATH}")
        return True
    except Exception as e:
        log(f"⚠ Volume not accessible: {e}. Running in ephemeral mode.")
        return False


def migrate_chromadb(volume_ok: bool):
    if not volume_ok:
        log("Skipping ChromaDB migration — no volume.")
        return LOCAL_CHROMA

    os.makedirs(CHROMA_VOLUME_DIR, exist_ok=True)
    chroma_sqlite = os.path.join(CHROMA_VOLUME_DIR, "chroma.sqlite3")

    if os.path.exists(chroma_sqlite) and os.path.getsize(chroma_sqlite) > 10_000:
        size_mb = os.path.getsize(chroma_sqlite) / (1024 * 1024)
        log(f"✓ ChromaDB already on volume ({size_mb:.1f} MB).")
        return CHROMA_VOLUME_DIR

    local_sqlite = os.path.join(LOCAL_CHROMA, "chroma.sqlite3")
    if os.path.exists(local_sqlite):
        size_mb = os.path.getsize(local_sqlite) / (1024 * 1024)
        log(f"Migrating ChromaDB ({size_mb:.1f} MB) → {CHROMA_VOLUME_DIR}...")
        try:
            if os.path.exists(CHROMA_VOLUME_DIR):
                shutil.rmtree(CHROMA_VOLUME_DIR)
            shutil.copytree(LOCAL_CHROMA, CHROMA_VOLUME_DIR)
            log("✓ ChromaDB migrated to volume.")
            return CHROMA_VOLUME_DIR
        except Exception as e:
            log(f"⚠ Migration failed: {e}. Using local ChromaDB.")
            return LOCAL_CHROMA
    else:
        log("⚠ No local ChromaDB found. Knowledge base empty until ingested.")
        return CHROMA_VOLUME_DIR


def migrate_database(volume_ok: bool):
    if not volume_ok:
        log("Skipping DB migration — no volume.")
        return

    if os.path.exists(DB_VOLUME_PATH):
        size_kb = os.path.getsize(DB_VOLUME_PATH) / 1024
        log(f"✓ SQLite DB already on volume ({size_kb:.0f} KB).")
        if not os.path.exists(LOCAL_DB_PATH) or not os.path.islink(LOCAL_DB_PATH):
            if os.path.exists(LOCAL_DB_PATH):
                os.remove(LOCAL_DB_PATH)
            os.symlink(DB_VOLUME_PATH, LOCAL_DB_PATH)
            log(f"✓ Symlinked kip.db → {DB_VOLUME_PATH}")
        return

    if os.path.exists(LOCAL_DB_PATH) and not os.path.islink(LOCAL_DB_PATH):
        shutil.copy2(LOCAL_DB_PATH, DB_VOLUME_PATH)
        os.remove(LOCAL_DB_PATH)
        os.symlink(DB_VOLUME_PATH, LOCAL_DB_PATH)
        log("✓ Moved kip.db to volume and symlinked.")
    else:
        try:
            os.symlink(DB_VOLUME_PATH, LOCAL_DB_PATH)
        except FileExistsError:
            pass
        log(f"✓ Symlinked kip.db → {DB_VOLUME_PATH} (created on first run).")


def migrate_surveys(volume_ok: bool):
    if not volume_ok:
        return
    os.makedirs(SURVEYS_VOLUME_DIR, exist_ok=True)
    if os.path.exists(LOCAL_SURVEYS) and not os.path.islink(LOCAL_SURVEYS):
        for fname in os.listdir(LOCAL_SURVEYS):
            if fname.endswith('.json'):
                src = os.path.join(LOCAL_SURVEYS, fname)
                dst = os.path.join(SURVEYS_VOLUME_DIR, fname)
                if not os.path.exists(dst):
                    shutil.copy2(src, dst)
                    log(f"  Migrated survey: {fname}")
        shutil.rmtree(LOCAL_SURVEYS)
    if not os.path.exists(LOCAL_SURVEYS):
        os.makedirs(os.path.dirname(LOCAL_SURVEYS), exist_ok=True)
        try:
            os.symlink(SURVEYS_VOLUME_DIR, LOCAL_SURVEYS)
            log(f"✓ Surveys directory → {SURVEYS_VOLUME_DIR}")
        except FileExistsError:
            pass


def check_env():
    required = {"ANTHROPIC_API_KEY": "AI responses", "SECRET_KEY": "JWT auth"}
    missing  = [f"  {var} ({purpose})" for var, purpose in required.items() if not os.getenv(var)]
    if missing:
        log("⚠ Missing environment variables:")
        for m in missing: log(m)
    else:
        log("✓ All required environment variables set.")


def write_chroma_path_env(chroma_dir: str):
    env_file = os.path.join(os.path.dirname(__file__), ".env.chroma")
    with open(env_file, 'w') as f:
        f.write(f"CHROMA_PATH={chroma_dir}\n")
    os.environ["CHROMA_PATH"] = chroma_dir
    log(f"✓ CHROMA_PATH = {chroma_dir}")


def create_all_tables():
    """
    Create EVERY table KIP uses — both ORM models and raw SQL tables.
    This runs before uvicorn so no endpoint ever fails due to a missing table.
    """
    log("Creating database tables...")

    # Add backend to path so imports work
    sys.path.insert(0, os.path.dirname(__file__))

    try:
        from app.database import engine, Base
        from sqlalchemy import text

        # ── ORM models ─────────────────────────────────────────────────────
        # Import every model so Base.metadata knows about them all
        try: from app.models import user
        except Exception as e: log(f"  ⚠ user model: {e}")

        try: from app.models import conversation
        except Exception as e: log(f"  ⚠ conversation model: {e}")

        try: from app.models import business_dashboard
        except Exception as e: log(f"  ⚠ business_dashboard model: {e}")

        try: from app.models import business_idea
        except Exception as e: log(f"  ⚠ business_idea model: {e}")

        try: from app.models import enhanced_logs
        except Exception as e: log(f"  ⚠ enhanced_logs model: {e}")

        try: from app.models import enterprise_models
        except Exception as e: log(f"  ⚠ enterprise_models: {e}")

        # Create all ORM tables
        Base.metadata.create_all(bind=engine)
        log("✓ ORM tables created.")

        # ── Raw SQL tables ──────────────────────────────────────────────────
        # These are created with raw SQL in various route files.
        # We create them here to guarantee they exist before any request.
        # AUTOINCREMENT is SQLite-only syntax — Postgres needs SERIAL instead,
        # so the PK column is templated per dialect rather than hardcoded.
        pk = "INTEGER PRIMARY KEY AUTOINCREMENT" if engine.dialect.name == "sqlite" else "SERIAL PRIMARY KEY"
        raw_tables = [
            # Business chat
            f"""CREATE TABLE IF NOT EXISTS business_chat_messages (
                id                      {pk},
                plan_id                 INTEGER NOT NULL,
                user_id                 INTEGER NOT NULL,
                role                    TEXT    NOT NULL,
                content                 TEXT    NOT NULL,
                is_plan_update_proposal INTEGER DEFAULT 0,
                is_plan_update_applied  INTEGER DEFAULT 0,
                update_summary          TEXT,
                pending_resolved        INTEGER DEFAULT 0,
                created_at              TEXT    DEFAULT CURRENT_TIMESTAMP
            )""",
            f"""CREATE TABLE IF NOT EXISTS business_plan_versions (
                id             {pk},
                plan_id        INTEGER NOT NULL,
                user_id        INTEGER NOT NULL,
                version_num    INTEGER DEFAULT 1,
                plan_json_old  TEXT    NOT NULL,
                change_summary TEXT,
                created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
            )""",

            # Enterprise
            f"""CREATE TABLE IF NOT EXISTS enterprise_businesses (
                id              {pk},
                owner_user_id   INTEGER NOT NULL,
                name            TEXT    NOT NULL,
                description     TEXT,
                industry        TEXT,
                headquarters    TEXT,
                branch_count    INTEGER DEFAULT 0,
                is_active       INTEGER DEFAULT 1,
                created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
                updated_at      TEXT    DEFAULT CURRENT_TIMESTAMP
            )""",
            f"""CREATE TABLE IF NOT EXISTS enterprise_branches (
                id                      {pk},
                enterprise_id           INTEGER NOT NULL,
                plan_id                 INTEGER,
                branch_name             TEXT    NOT NULL,
                location                TEXT,
                specialty               TEXT,
                branch_manager_user_id  INTEGER,
                manager_email           TEXT,
                monthly_target          REAL,
                is_active               INTEGER DEFAULT 1,
                created_at              TEXT    DEFAULT CURRENT_TIMESTAMP
            )""",
            f"""CREATE TABLE IF NOT EXISTS branch_notifications (
                id            {pk},
                user_id       INTEGER NOT NULL,
                enterprise_id INTEGER NOT NULL,
                branch_id     INTEGER NOT NULL,
                message       TEXT    NOT NULL,
                is_read       INTEGER DEFAULT 0,
                created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
            )""",

            # General surveys
            f"""CREATE TABLE IF NOT EXISTS general_surveys (
                id           {pk},
                user_id      INTEGER,
                location     TEXT,
                data_json    TEXT,
                submitted_at TEXT,
                UNIQUE(user_id, location)
            )""",
        ]

        with engine.connect() as conn:
            for sql in raw_tables:
                conn.execute(text(sql))
            conn.commit()

        log(f"✓ All raw SQL tables created ({len(raw_tables)} tables).")
        log("✓ Database ready.")

    except Exception as e:
        log(f"⚠ Table creation error: {e}")
        log("  Tables will be created lazily on first request.")


def main():
    log("=" * 50)
    log("KIP — Kwacha Intelligence Platform")
    log("Starting up...")
    log("=" * 50)

    check_env()
    volume_ok  = ensure_volume()
    chroma_dir = migrate_chromadb(volume_ok)
    migrate_database(volume_ok)
    migrate_surveys(volume_ok)
    write_chroma_path_env(chroma_dir)
    create_all_tables()

    log("=" * 50)
    log("Startup complete. Handing off to uvicorn.")
    log("=" * 50)


if __name__ == "__main__":
    main()
