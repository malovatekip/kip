"""
KIP — Chat Table Migration
Run this ONCE from backend/ to add missing columns to business_chat_messages.

Usage:
    python migrate_chat_tables.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check existing columns
        result = conn.execute(text("PRAGMA table_info(business_chat_messages)"))
        existing = {row[1] for row in result.fetchall()}
        print(f"Existing columns: {existing}")

        # Add missing columns one by one (SQLite doesn't support ADD MULTIPLE)
        additions = {
            "update_summary":          "TEXT",
            "pending_resolved":        "INTEGER DEFAULT 0",
            "is_plan_update_proposal": "INTEGER DEFAULT 0",
            "is_plan_update_applied":  "INTEGER DEFAULT 0",
        }

        for col, col_type in additions.items():
            if col not in existing:
                try:
                    conn.execute(text(
                        f"ALTER TABLE business_chat_messages ADD COLUMN {col} {col_type}"
                    ))
                    conn.commit()
                    print(f"  ✓ Added column: {col}")
                except Exception as e:
                    print(f"  ✗ Could not add {col}: {e}")
            else:
                print(f"  · Already exists: {col}")

        # Ensure business_plan_versions table exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS business_plan_versions (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id        INTEGER NOT NULL,
                user_id        INTEGER NOT NULL,
                version_num    INTEGER DEFAULT 1,
                plan_json_old  TEXT    NOT NULL,
                change_summary TEXT,
                created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
        print("  ✓ business_plan_versions table ready")

        print("\nMigration complete. Restart uvicorn.")

if __name__ == "__main__":
    migrate()
