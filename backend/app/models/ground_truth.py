"""
KIP Ground Truth -- field-collected business map of Zambia.

KIP's own proprietary location layer: markets and business pins captured by
field agents (and, later, by KIP users themselves). Nothing in these tables
is derived from OpenStreetMap, Google or any other provider -- that is what
keeps the dataset free of third-party licence terms. Do not import external
POI data into them.

Shape:
  - `observations` is an append-only log: one immutable row per agent
    submission, keyed by a client-generated UUID so offline re-sends are
    idempotent. It is the audit trail and the history (openings, closures,
    price changes over time).
  - `markets` and `business_points` hold the CURRENT state, derived from
    observations (see services/ground_truth.py).
  - Owner contact details are personal data and live in their own table,
    never in the observation payload.

Location is stored as plain lat/lon plus geohash strings so the same code
runs on SQLite and Postgres (see services/geo_utils.py).
"""
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, JSON, LargeBinary, String, Text,
)

from app.database import Base


class Market(Base):
    __tablename__ = "gt_markets"

    id            = Column(String(36), primary_key=True)          # client UUID
    name          = Column(String(200), nullable=False)
    alt_names     = Column(JSON, nullable=True)                   # local / former names
    market_type   = Column(String(40), nullable=True)             # business_taxonomy.MARKET_TYPES
    town_key      = Column(String(80), nullable=True, index=True) # key into TOWN_COORDS
    province      = Column(String(60), nullable=True)
    ward          = Column(String(120), nullable=True)
    constituency  = Column(String(120), nullable=True)

    lat           = Column(Float, nullable=False)
    lon           = Column(Float, nullable=False)
    geohash6      = Column(String(6), nullable=False, index=True)
    boundary      = Column(JSON, nullable=True)                   # [[lat, lon], ...] walked perimeter

    # Promoted from `attributes` because they are queried / aggregated.
    stall_count     = Column(Integer, nullable=True)
    occupied_stalls = Column(Integer, nullable=True)
    daily_levy_zmw  = Column(Float, nullable=True)
    rent_min_zmw    = Column(Float, nullable=True)                # monthly stall rent range
    rent_max_zmw    = Column(Float, nullable=True)

    # Everything else the agent records: operator, infrastructure, access,
    # demand, supply chain, finance/connectivity, governance.
    attributes    = Column(JSON, nullable=True)

    review_status = Column(String(20), default="pending", index=True)  # pending|verified|rejected
    created_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    first_seen    = Column(DateTime, default=datetime.utcnow)
    last_verified = Column(DateTime, default=datetime.utcnow)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BusinessPoint(Base):
    __tablename__ = "gt_business_points"

    id             = Column(String(36), primary_key=True)         # client UUID
    market_id      = Column(String(36), ForeignKey("gt_markets.id"), nullable=True, index=True)
    section        = Column(String(120), nullable=True)           # e.g. "vegetable section"

    lat            = Column(Float, nullable=False)
    lon            = Column(Float, nullable=False)
    gps_accuracy_m = Column(Float, nullable=True)
    geohash6       = Column(String(6), nullable=False, index=True)
    geohash7       = Column(String(7), nullable=False, index=True)

    name           = Column(String(200), nullable=True)           # many stalls have none
    category       = Column(String(60), nullable=False, index=True)  # KIP idea category slug
    subtype        = Column(String(60), nullable=False, index=True)  # business_taxonomy.BUSINESS_SUBTYPES
    structure_type = Column(String(40), nullable=True)
    products       = Column(JSON, nullable=True)                  # top products / services

    staff_count          = Column(Integer, nullable=True)
    years_operating      = Column(Float, nullable=True)
    payments             = Column(JSON, nullable=True)
    power_source         = Column(String(20), nullable=True)
    rent_band            = Column(String(20), nullable=True)
    daily_customers_band = Column(String(20), nullable=True)
    daily_sales_band     = Column(String(20), nullable=True)
    # Long tail: hours, restock source/frequency, equipment, challenges, registration.
    attributes     = Column(JSON, nullable=True)

    op_status      = Column(String(20), default="open", index=True)       # open|closed|seasonal|vacant
    review_status  = Column(String(20), default="pending", index=True)    # pending|verified|rejected|duplicate
    qa_flags       = Column(JSON, nullable=True)                  # e.g. ["possible_duplicate:<id>"]
    # Fictitious pins planted to detect copying of the dataset; excluded from
    # every aggregate and never shown to collectors.
    is_trap        = Column(Boolean, default=False)
    source         = Column(String(20), default="field_agent")    # field_agent|kip_user|kip_log
    photo_media_id = Column(String(36), nullable=True)

    created_by     = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    first_seen     = Column(DateTime, default=datetime.utcnow)
    last_verified  = Column(DateTime, default=datetime.utcnow)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("ix_gt_business_lat_lon", "lat", "lon"),)


class Observation(Base):
    """Append-only. Never updated or deleted; corrections are new observations."""
    __tablename__ = "gt_observations"

    id             = Column(String(36), primary_key=True)         # client UUID (idempotency key)
    kind           = Column(String(20), nullable=False, index=True)  # business|market|price|footfall|vacancy
    target_id      = Column(String(36), nullable=True, index=True)   # market / business id it describes
    payload        = Column(JSON, nullable=False)                 # as submitted, minus owner contact
    agent_user_id  = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    lat            = Column(Float, nullable=True)
    lon            = Column(Float, nullable=True)
    gps_accuracy_m = Column(Float, nullable=True)
    captured_at    = Column(DateTime, nullable=False)             # device clock
    received_at    = Column(DateTime, default=datetime.utcnow)    # server clock
    app_version    = Column(String(40), nullable=True)
    outcome        = Column(String(20), default="accepted")       # accepted|rejected
    reject_reason  = Column(String(200), nullable=True)


class PriceObservation(Base):
    __tablename__ = "gt_price_observations"

    id             = Column(Integer, primary_key=True, index=True)
    observation_id = Column(String(36), ForeignKey("gt_observations.id"), nullable=False, index=True)
    item_code      = Column(String(60), nullable=False, index=True)   # business_taxonomy.PRICE_BASKET
    unit           = Column(String(60), nullable=True)
    price_zmw      = Column(Float, nullable=False)
    market_id      = Column(String(36), ForeignKey("gt_markets.id"), nullable=True, index=True)
    business_id    = Column(String(36), ForeignKey("gt_business_points.id"), nullable=True)
    town_key       = Column(String(80), nullable=True, index=True)
    lat            = Column(Float, nullable=True)
    lon            = Column(Float, nullable=True)
    observed_at    = Column(DateTime, nullable=False, index=True)


class FootfallCount(Base):
    __tablename__ = "gt_footfall_counts"

    id             = Column(Integer, primary_key=True, index=True)
    observation_id = Column(String(36), ForeignKey("gt_observations.id"), nullable=False, index=True)
    market_id      = Column(String(36), ForeignKey("gt_markets.id"), nullable=True, index=True)
    lat            = Column(Float, nullable=False)
    lon            = Column(Float, nullable=False)
    started_at     = Column(DateTime, nullable=False)
    duration_min   = Column(Float, nullable=False)
    people_count   = Column(Integer, nullable=False)


class Vacancy(Base):
    """A vacant stall / shop -- the "where can I open" layer."""
    __tablename__ = "gt_vacancies"

    id              = Column(Integer, primary_key=True, index=True)
    observation_id  = Column(String(36), ForeignKey("gt_observations.id"), nullable=False, index=True)
    market_id       = Column(String(36), ForeignKey("gt_markets.id"), nullable=True, index=True)
    lat             = Column(Float, nullable=False)
    lon             = Column(Float, nullable=False)
    geohash6        = Column(String(6), nullable=False, index=True)
    unit_type       = Column(String(40), nullable=True)           # STRUCTURE_TYPES
    size_band       = Column(String(20), nullable=True)
    asking_rent_zmw = Column(Float, nullable=True)                # monthly
    status          = Column(String(20), default="available")     # available|taken
    observed_at     = Column(DateTime, nullable=False)


class BusinessOwnerContact(Base):
    """
    Personal data (Data Protection Act No. 3 of 2021). Stored only with the
    owner's recorded consent, kept out of observations/exports/aggregates, and
    readable by admins only.
    """
    __tablename__ = "gt_business_owner_contacts"

    id            = Column(Integer, primary_key=True, index=True)
    business_id   = Column(String(36), ForeignKey("gt_business_points.id"), nullable=False, unique=True, index=True)
    first_name    = Column(String(80), nullable=True)
    gender        = Column(String(20), nullable=True)
    age_band      = Column(String(20), nullable=True)
    phone         = Column(String(30), nullable=True)
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_at    = Column(DateTime, nullable=True)
    recorded_by   = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)


class FieldMedia(Base):
    __tablename__ = "gt_media"

    id             = Column(String(36), primary_key=True)
    observation_id = Column(String(36), nullable=False, index=True)  # may arrive before/after its observation
    storage_key    = Column(String(300), nullable=False)
    sha256         = Column(String(64), nullable=False, index=True)
    content_type   = Column(String(60), nullable=False)
    size_bytes     = Column(Integer, nullable=False)
    uploaded_by    = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at     = Column(DateTime, default=datetime.utcnow)


class FieldMediaBlob(Base):
    """Photo bytes kept in the database when no S3 bucket is configured, so a
    free host's disk being wiped on redeploy cannot lose evidence photos.
    Photos are already compressed on the phone (about 100-250 KB)."""
    __tablename__ = "gt_media_blobs"

    storage_key = Column(String(300), primary_key=True)
    data        = Column(LargeBinary, nullable=False)


class QAReview(Base):
    __tablename__ = "gt_qa_reviews"

    id               = Column(Integer, primary_key=True, index=True)
    target_type      = Column(String(20), nullable=False)         # business|market
    target_id        = Column(String(36), nullable=False, index=True)
    reviewer_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision         = Column(String(20), nullable=False)         # verified|rejected|duplicate
    merged_into_id   = Column(String(36), nullable=True)
    note             = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
