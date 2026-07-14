"""
models_briefing.py
───────────────────
SQLAlchemy model for the Economic Briefing feature.

ADD THIS CLASS to your existing app/models.py file.
Also add the Alembic migration or run:
    ALTER TABLE — see the raw SQL below if you don't use Alembic.

Raw SQL (SQLite):
─────────────────
CREATE TABLE IF NOT EXISTS economic_briefings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT NOT NULL,
    source            TEXT NOT NULL,
    source_url        TEXT,
    category          TEXT NOT NULL DEFAULT 'fiscal_policy',
    importance        TEXT NOT NULL DEFAULT 'MEDIUM',
    emoji             TEXT DEFAULT '📊',
    headline_plain    TEXT NOT NULL,
    explanation       TEXT NOT NULL,
    impact_ordinary   TEXT,
    impact_business   TEXT,
    kip_take          TEXT,
    image_search_term TEXT DEFAULT 'Zambia economy',
    date_published    TEXT,
    generated_date    TEXT NOT NULL,
    generated_at      TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_briefings_generated_date
    ON economic_briefings(generated_date DESC);
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from app.database import Base   # adjust to your actual Base import


class EconomicBriefing(Base):
    __tablename__ = "economic_briefings"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    title             = Column(String(200), nullable=False)
    source            = Column(String(200), nullable=False)
    source_url        = Column(String(500), nullable=True)
    category          = Column(String(50),  nullable=False, default="fiscal_policy")
    importance        = Column(String(10),  nullable=False, default="MEDIUM")
    emoji             = Column(String(10),  nullable=True,  default="📊")
    headline_plain    = Column(String(500), nullable=False)
    explanation       = Column(Text,        nullable=False)
    impact_ordinary   = Column(Text,        nullable=True)
    impact_business   = Column(Text,        nullable=True)
    kip_take          = Column(Text,        nullable=True)
    image_search_term = Column(String(100), nullable=True, default="Zambia economy")
    date_published    = Column(String(20),  nullable=True)
    generated_date    = Column(String(20),  nullable=False)   # YYYY-MM-DD
    generated_at      = Column(DateTime,    nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_briefings_generated_date", "generated_date"),
    )

    def to_dict(self) -> dict:
        return {
            "id":                self.id,
            "title":             self.title,
            "source":            self.source,
            "source_url":        self.source_url,
            "category":          self.category,
            "importance":        self.importance,
            "emoji":             self.emoji,
            "headline_plain":    self.headline_plain,
            "explanation":       self.explanation,
            "impact_ordinary":   self.impact_ordinary,
            "impact_business":   self.impact_business,
            "kip_take":          self.kip_take,
            "image_search_term": self.image_search_term,
            "date_published":    self.date_published,
            "generated_date":    self.generated_date,
            "generated_at":      self.generated_at.isoformat() if self.generated_at else None,
        }
