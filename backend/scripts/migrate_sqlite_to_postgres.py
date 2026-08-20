"""
One-off migration: copy every row from the local SQLite kip.db into a fresh
Postgres database (e.g. a Neon free-tier instance), preserving primary keys.

Handles two kinds of source tables:
  1. Tables backed by a SQLAlchemy model (app/models/*.py) — recreated on the
     target via Base.metadata.create_all, so they get proper types/defaults.
  2. Legacy/ad-hoc tables created by raw SQL elsewhere in the app (e.g.
     BizSim state, learn progress, badges, translation cache, live rates) —
     these have no ORM model, so their schema is reflected directly off the
     sqlite file and recreated on the target as-is. Nothing in kip.db is
     silently skipped.

Usage:
    cd backend
    python scripts/migrate_sqlite_to_postgres.py "postgresql://user:pass@host/dbname"

Safe to re-run against an empty target DB; it is NOT idempotent against a
target that already has rows (it will hit primary-key conflicts on the
second run — that's intentional, this is a one-time cutover script, not a
sync tool).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import importlib
import pkgutil
from sqlalchemy import create_engine, MetaData, Table, Column, select, text

SQLITE_URL = "sqlite:///./kip.db"
SQLITE_INTERNAL_TABLES = {"sqlite_sequence", "sqlite_stat1", "sqlite_stat4"}
# Dead feature tables — the ORM models for these were deleted along with the
# unused Stripe/Flutterwave subscription system. Deliberately not migrated.
SKIP_TABLES = {"user_subscriptions", "daily_usage", "payment_records"}


def _load_all_models():
    """Import every module under app/models so Base.metadata knows about
    every ORM table — mirrors what main.py does at startup, but without
    needing to keep two import lists in sync."""
    import app.models as models_pkg
    for _, name, _ in pkgutil.iter_modules(models_pkg.__path__):
        importlib.import_module(f"app.models.{name}")


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    postgres_url = sys.argv[1]

    _load_all_models()
    from app.database import Base

    print(f"[migrate] Source: {SQLITE_URL}")
    print(f"[migrate] Target: {postgres_url.split('@')[-1] if '@' in postgres_url else postgres_url}")

    src_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    dst_engine = create_engine(postgres_url)

    # Reflect the full SOURCE schema so we can spot tables with no ORM model.
    src_meta = MetaData()
    src_meta.reflect(bind=src_engine)
    src_table_names = {n for n in src_meta.tables if n not in SQLITE_INTERNAL_TABLES and n not in SKIP_TABLES}
    orm_table_names = set(Base.metadata.tables.keys())
    legacy_table_names = src_table_names - orm_table_names

    skipped_present = SKIP_TABLES & set(src_meta.tables.keys())
    if skipped_present:
        print(f"[migrate] Deliberately skipping dead tables: {sorted(skipped_present)}")

    print(f"[migrate] {len(orm_table_names)} ORM-backed tables, "
          f"{len(legacy_table_names)} legacy/raw-SQL tables to migrate as-is.")
    if legacy_table_names:
        print(f"[migrate] Legacy tables: {sorted(legacy_table_names)}")

    # 1) Create ORM-known tables on the target with proper types.
    print("[migrate] Creating ORM-backed target schema...")
    Base.metadata.create_all(bind=dst_engine)

    # 2) Recreate legacy tables on the target using their reflected sqlite
    #    columns, attached to a separate MetaData. Built manually (not via
    #    Table.to_metadata()) to deliberately drop foreign keys — sqlite
    #    doesn't enforce them anyway (see account_service.py), and a legacy
    #    table's FK may point at a table that isn't part of this same
    #    metadata, which create_all can't resolve.
    legacy_meta = MetaData()
    legacy_dst_tables = {}
    for name in legacy_table_names:
        src_table = src_meta.tables[name]
        cols = [
            Column(c.name, c.type, primary_key=c.primary_key, nullable=c.nullable)
            for c in src_table.columns
        ]
        legacy_dst_tables[name] = Table(name, legacy_meta, *cols)
    if legacy_dst_tables:
        print("[migrate] Creating legacy target schema (reflected from sqlite)...")
        legacy_meta.create_all(bind=dst_engine)

    # Migration order: ORM tables first, respecting FK dependency order via
    # Base.metadata.sorted_tables, then legacy tables (no declared FK
    # constraints between them in sqlite, order doesn't matter).
    ordered_names = [t.name for t in Base.metadata.sorted_tables if t.name in src_table_names]
    ordered_names += sorted(legacy_table_names)

    with src_engine.connect() as src_conn, dst_engine.begin() as dst_conn:
        for table_name in ordered_names:
            src_table = src_meta.tables[table_name]
            dst_table = Base.metadata.tables[table_name] if table_name in Base.metadata.tables \
                else legacy_dst_tables[table_name]

            rows = [dict(r._mapping) for r in src_conn.execute(select(src_table))]
            if not rows:
                print(f"[migrate] {table_name}: 0 rows")
                continue

            dst_cols = set(dst_table.columns.keys())
            cleaned_rows = [{k: v for k, v in row.items() if k in dst_cols} for row in rows]

            dst_conn.execute(dst_table.insert(), cleaned_rows)
            print(f"[migrate] {table_name}: {len(cleaned_rows)} rows copied")

            if "id" in dst_cols:
                dst_conn.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM {table_name}), 1))"
                ))

    print("[migrate] Done.")


if __name__ == "__main__":
    main()
