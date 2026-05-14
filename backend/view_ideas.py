#!/usr/bin/env python3
"""
KIP Ideas Viewer
Run from backend/ directory:
    python view_ideas.py

Shows all business ideas KIP has generated, with status and capital.
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text

def main():
    with engine.connect() as conn:

        # ── Summary ──────────────────────────────────────────
        total   = conn.execute(text("SELECT COUNT(*) FROM business_ideas")).scalar()
        accepted= conn.execute(text("SELECT COUNT(*) FROM business_ideas WHERE accepted=1")).scalar()
        started = conn.execute(text("SELECT COUNT(*) FROM business_launch_plans")).scalar()

        print("\n" + "═"*70)
        print("  KIP — BUSINESS IDEAS DATABASE")
        print("═"*70)
        print(f"  Total ideas generated : {total}")
        print(f"  Ideas accepted        : {accepted}")
        print(f"  Businesses started    : {started}")
        print("═"*70 + "\n")

        # ── All ideas ─────────────────────────────────────────
        rows = conn.execute(text("""
            SELECT
                bi.id,
                u.full_name,
                bi.idea_name,
                bi.location,
                bi.capital_amount,
                bi.accepted,
                bi.created_at
            FROM business_ideas bi
            JOIN users u ON u.id = bi.user_id
            ORDER BY bi.created_at DESC
        """)).fetchall()

        if not rows:
            print("  No ideas in the database yet.\n")
            return

        for row in rows:
            id_, user, name, location, capital, accepted, created = row

            status = "✓ ACCEPTED" if accepted == 1 else ("✗ DECLINED" if accepted == 0 else "○ PENDING")
            capital_str = f"K{int(capital):,}" if capital else "not specified"
            loc_str = location or "not specified"

            print(f"  [{id_}] {name}")
            print(f"       User    : {user}")
            print(f"       Location: {loc_str}")
            print(f"       Capital : {capital_str}")
            print(f"       Status  : {status}")
            print(f"       Created : {str(created)[:16]}")
            print()

        # ── Active businesses ─────────────────────────────────
        print("═"*70)
        print("  ACTIVE BUSINESS PLANS")
        print("═"*70)

        plans = conn.execute(text("""
            SELECT
                blp.id,
                u.full_name,
                blp.business_name,
                blp.status,
                blp.created_at
            FROM business_launch_plans blp
            JOIN users u ON u.id = blp.user_id
            ORDER BY blp.created_at DESC
        """)).fetchall()

        if not plans:
            print("  No active business plans yet.\n")
        else:
            for row in plans:
                id_, user, name, status, created = row
                print(f"  [{id_}] {name}")
                print(f"       Owner   : {user}")
                print(f"       Status  : {status}")
                print(f"       Started : {str(created)[:16]}")
                print()

        # ── Export to text file ───────────────────────────────
        export = input("Export ideas to ideas_report.txt? (y/n): ").strip().lower()
        if export == 'y':
            with open('ideas_report.txt', 'w', encoding='utf-8') as f:
                f.write("KIP BUSINESS IDEAS REPORT\n")
                f.write(f"Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
                f.write("="*70 + "\n\n")
                for row in rows:
                    id_, user, name, location, capital, accepted, created = row
                    status = "ACCEPTED" if accepted == 1 else ("DECLINED" if accepted == 0 else "PENDING")
                    f.write(f"[{id_}] {name}\n")
                    f.write(f"  User    : {user}\n")
                    f.write(f"  Location: {location or 'not specified'}\n")
                    f.write(f"  Capital : K{int(capital):,}\n" if capital else "  Capital : not specified\n")
                    f.write(f"  Status  : {status}\n")
                    f.write(f"  Created : {str(created)[:16]}\n\n")
            print("  ✓ Exported to ideas_report.txt")

if __name__ == "__main__":
    main()
