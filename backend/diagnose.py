#!/usr/bin/env python3
"""
KIP Diagnostic — run this from backend/ to print actual DB column names.
Usage: python diagnose.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import inspect as sa_inspect, text

insp = sa_inspect(engine)

tables_to_check = [
    'business_launch_plans',
    'daily_business_logs',
    'business_ideas',
    'users',
    'conversations',
    'messages',
]

print("\n=== KIP DATABASE COLUMN INSPECTOR ===\n")
for table in tables_to_check:
    try:
        cols = [c['name'] for c in insp.get_columns(table)]
        print(f"  {table}:")
        for c in cols:
            print(f"    - {c}")
        print()
    except Exception as e:
        print(f"  {table}: NOT FOUND ({e})\n")

print("=== END ===\n")
