"""
Tests for the KIP ground truth layer: geo helpers, idempotent observation
ingestion, duplicate flagging, privacy of owner contacts, saturation counts
and the map-context fallback to the OSM cache.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import user as user_model, conversation, business_idea  # noqa: F401
from app.models.ground_truth import (
    BusinessOwnerContact, BusinessPoint, Market, Observation, PriceObservation,
)
from app.data.town_coordinates import TOWN_COORDS
from app.services import geo_utils as geo
from app.services import saturation_service as sat
from app.services.ground_truth import ingest_observation
from app.services.map_service import get_map_context

KITWE = TOWN_COORDS["kitwe"]
LAT, LON = KITWE["lat"], KITWE["lon"]
M_PER_DEG_LAT = 111_320.0


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    u = user_model.User(email="agent@example.com", full_name="Agent", hashed_password="x", role="collector")
    session.add(u)
    session.commit()
    yield session, u
    session.close()


def _obs(kind="business", lat=LAT, lon=LON, accuracy=6.0, target_id=None, **payload):
    return {
        "id": str(uuid.uuid4()), "kind": kind,
        "target_id": target_id or (str(uuid.uuid4()) if kind in ("business", "market") else None),
        "lat": lat, "lon": lon, "gps_accuracy_m": accuracy,
        "captured_at": datetime.utcnow(), "app_version": "test", "payload": payload,
    }


def _north(metres):
    return LAT + metres / M_PER_DEG_LAT


# ── geo helpers ──────────────────────────────────────────────────────────

def test_geohash_known_value_and_prefix_nesting():
    # Reference value from the original geohash specification.
    assert geo.geohash_encode(57.64911, 10.40744, 11) == "u4pruydqqvj"
    assert geo.geohash_encode(LAT, LON, 7).startswith(geo.geohash_encode(LAT, LON, 6))


def test_geohash_cell_contains_its_point():
    gh = geo.geohash_encode(LAT, LON, 7)
    lat_min, lat_max, lon_min, lon_max = geo.geohash_bounds(gh)
    assert lat_min <= LAT <= lat_max and lon_min <= LON <= lon_max


def test_haversine_and_bounding_box():
    assert geo.haversine_m(LAT, LON, _north(100), LON) == pytest.approx(100, rel=0.01)
    lat_min, lat_max, lon_min, lon_max = geo.bounding_box(LAT, LON, 500)
    assert lat_min < _north(-499) and lat_max > _north(499)
    assert lon_min < LON < lon_max


# ── ingestion ────────────────────────────────────────────────────────────

def test_sync_is_idempotent(db):
    session, u = db
    item = _obs(subtype="barbershop", structure_type="kantemba")
    assert ingest_observation(session, item, u.id)["status"] == "created"
    assert ingest_observation(session, item, u.id)["status"] == "duplicate"
    assert session.query(BusinessPoint).count() == 1
    assert session.query(Observation).count() == 1

    bp = session.query(BusinessPoint).one()
    assert bp.category == "services_and_care"
    assert bp.geohash7 == geo.geohash_encode(LAT, LON, 7)
    assert bp.review_status == "pending"


def test_poor_gps_fix_is_rejected_but_logged(db):
    session, u = db
    result = ingest_observation(session, _obs(subtype="barbershop", accuracy=40.0), u.id)
    assert result["status"] == "rejected" and "gps_accuracy" in result["reason"]
    assert session.query(BusinessPoint).count() == 0
    assert session.query(Observation).one().outcome == "rejected"


def test_outside_zambia_and_unknown_subtype_rejected(db):
    session, u = db
    assert ingest_observation(session, _obs(subtype="barbershop", lat=0.0, lon=0.0), u.id)["reason"] == "outside_zambia"
    assert ingest_observation(session, _obs(subtype="spaceship_dealer"), u.id)["reason"] == "unknown_subtype"
    assert session.query(BusinessPoint).count() == 0


def test_same_type_within_10m_is_flagged_not_dropped(db):
    session, u = db
    first = _obs(subtype="salon")
    ingest_observation(session, first, u.id)
    ingest_observation(session, _obs(subtype="salon", lat=_north(5)), u.id)      # 5 m away
    ingest_observation(session, _obs(subtype="salon", lat=_north(60)), u.id)     # 60 m away
    ingest_observation(session, _obs(subtype="butchery", lat=_north(3)), u.id)   # other trade

    points = {round((p.lat - LAT) * M_PER_DEG_LAT): p for p in session.query(BusinessPoint).all()}
    assert points[5].qa_flags == [f"possible_duplicate:{first['target_id']}"]
    assert not points[60].qa_flags and not points[3].qa_flags
    assert session.query(BusinessPoint).count() == 4


def test_resurvey_updates_the_pin_and_keeps_history(db):
    session, u = db
    pin_id = str(uuid.uuid4())
    ingest_observation(session, _obs(target_id=pin_id, subtype="grocery_kantemba", name="Mwila's"), u.id)
    ingest_observation(session, _obs(target_id=pin_id, subtype="grocery_kantemba", op_status="closed"), u.id)

    bp = session.query(BusinessPoint).one()
    assert bp.op_status == "closed"
    assert bp.name == "Mwila's"          # a later quick pin does not wipe earlier detail
    assert session.query(Observation).filter(Observation.target_id == pin_id).count() == 2


def test_owner_contact_needs_consent_and_stays_out_of_the_log(db):
    session, u = db
    with_consent = _obs(subtype="tailoring", owner={"first_name": "Chanda", "phone": "0977000000", "consent": True})
    without = _obs(subtype="tailoring", lat=_north(50), owner={"first_name": "Bwalya", "phone": "0966000000"})
    ingest_observation(session, with_consent, u.id)
    ingest_observation(session, without, u.id)

    contacts = session.query(BusinessOwnerContact).all()
    assert [c.first_name for c in contacts] == ["Chanda"]
    for obs in session.query(Observation).all():
        assert "owner" not in obs.payload


def test_prices_recorded_only_for_basket_items(db):
    session, u = db
    item = _obs(subtype="fresh_produce", prices=[
        {"item_code": "tomatoes_heap", "price_zmw": 10},
        {"item_code": "not_in_basket", "price_zmw": 5},
        {"item_code": "onions_heap", "price_zmw": -1},
    ])
    ingest_observation(session, item, u.id)
    rows = session.query(PriceObservation).all()
    assert [(r.item_code, r.price_zmw, r.town_key) for r in rows] == [("tomatoes_heap", 10.0, "kitwe")]


def test_market_requires_a_name_and_gets_its_town(db):
    session, u = db
    assert ingest_observation(session, _obs(kind="market", accuracy=30.0), u.id)["reason"] == "market_name_required"
    ok = _obs(kind="market", accuracy=30.0, name="Chisokone Market", market_type="council_market", stall_count=900)
    assert ingest_observation(session, ok, u.id)["status"] == "created"
    m = session.query(Market).one()
    assert (m.town_key, m.province, m.stall_count) == ("kitwe", "Copperbelt", 900)


# ── saturation ───────────────────────────────────────────────────────────

def _seed(session, u, subtype, n, start_m=0, **payload):
    for i in range(n):
        ingest_observation(session, _obs(subtype=subtype, lat=_north(start_m + i * 12), **payload), u.id)


def test_saturation_counts_respect_radius_status_and_traps(db):
    session, u = db
    _seed(session, u, "salon", 6)                      # 0..60 m
    _seed(session, u, "phone_repair", 2, start_m=100)
    ingest_observation(session, _obs(subtype="salon", lat=_north(900)), u.id)             # outside 500 m
    ingest_observation(session, _obs(subtype="salon", lat=_north(200), op_status="closed"), u.id)
    rejected = _obs(subtype="salon", lat=_north(220))
    trap = _obs(subtype="salon", lat=_north(240))
    ingest_observation(session, rejected, u.id)
    ingest_observation(session, trap, u.id)
    session.get(BusinessPoint, rejected["target_id"]).review_status = "rejected"
    session.get(BusinessPoint, trap["target_id"]).is_trap = True
    session.commit()

    s = sat.saturation_at(session, LAT, LON, 500)
    counts = {row["code"]: (row["count"], row["level"]) for row in s["by_subtype"]}
    assert counts == {"salon": (6, "medium"), "phone_repair": (2, "very_low")}
    assert s["total_businesses"] == 8
    assert s["surveyed"] is False                      # 8 pins is not a surveyed area
    assert "butchery" in {r["code"] for r in s["not_observed"]}


def test_map_context_prefers_field_survey_once_area_is_covered(db, monkeypatch):
    session, u = db
    monkeypatch.setattr("app.services.map_service._load_cache", lambda key: None)
    _seed(session, u, "salon", 5)
    assert get_map_context("Kitwe", session) == ""     # too few pins, and no OSM cache

    _seed(session, u, "grocery_kantemba", sat.MIN_POINTS_FOR_COVERAGE, start_m=100)
    context = get_map_context("Kitwe", session)
    assert context.startswith("KIP FIELD SURVEY: Kitwe")
    assert f"Grocery / kantemba: {sat.MIN_POINTS_FOR_COVERAGE} [VERY HIGH]" in context
    assert "Butchery / meat" in context.split("NOT FOUND IN THIS AREA")[1]


def test_cells_suppress_small_counts(db):
    session, u = db
    _seed(session, u, "salon", 4)
    ingest_observation(session, _obs(subtype="salon", lat=_north(3000)), u.id)   # lone pin, another cell
    cells = sat.town_cells(session, "Kitwe")["cells"]
    assert [c["count"] for c in cells] == [4]


def test_future_timestamp_rejected(db):
    session, u = db
    item = _obs(subtype="salon")
    item["captured_at"] = datetime.utcnow() + timedelta(days=1)
    assert ingest_observation(session, item, u.id)["reason"] == "captured_at_in_future"


# ── HTTP layer: role gating, sync, review ────────────────────────────────

@pytest.fixture()
def api(tmp_path, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from sqlalchemy.pool import StaticPool

    from app.database import get_db
    from app.routes import field_data, market_map
    from app.security import create_access_token
    from app.services import field_media

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    monkeypatch.setattr(field_media, "_LOCAL_DIR", str(tmp_path))

    session = Session()
    tokens = {}
    for role in ("user", "collector", "supervisor", "admin"):
        u = user_model.User(
            email=f"{role}@example.com", full_name=role.title(), hashed_password="x",
            role="user" if role == "admin" else role, is_admin=(role == "admin"),
        )
        session.add(u)
        session.commit()
        tokens[role] = {"Authorization": f"Bearer {create_access_token(u.id)}"}
    session.close()

    def _get_db():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app = FastAPI()
    app.include_router(field_data.router, prefix="/api/field")
    app.include_router(market_map.router, prefix="/api/map")
    app.dependency_overrides[get_db] = _get_db
    return TestClient(app), tokens


def _wire(item):
    return {**item, "captured_at": item["captured_at"].isoformat()}


def test_api_roles_sync_photo_and_review(api):
    client, tokens = api
    batch = {"observations": [_wire(_obs(subtype="barbershop", name="Kuta Cuts"))]}
    pin_id = batch["observations"][0]["target_id"]

    assert client.post("/api/field/sync", json=batch, headers=tokens["user"]).status_code == 403
    assert client.post("/api/field/sync", json=batch).status_code in (401, 403)
    first = client.post("/api/field/sync", json=batch, headers=tokens["collector"]).json()
    again = client.post("/api/field/sync", json=batch, headers=tokens["collector"]).json()
    assert first["results"][0]["status"] == "created"
    assert again["results"][0]["status"] == "duplicate"

    photo = client.post(
        "/api/field/media", headers=tokens["collector"],
        data={"observation_id": batch["observations"][0]["id"]},
        files={"file": ("shop.jpg", b"\xff\xd8\xff" + b"0" * 2000, "image/jpeg")},
    )
    assert photo.status_code == 200
    bad = client.post(
        "/api/field/media", headers=tokens["collector"],
        data={"observation_id": batch["observations"][0]["id"]},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert bad.status_code == 400

    near = client.get("/api/field/nearby", params={"lat": LAT, "lon": LON}, headers=tokens["collector"]).json()
    assert [p["id"] for p in near["pins"]] == [pin_id] and near["pins"][0]["mine"] is True
    assert client.get("/api/field/nearby", params={"lat": LAT, "lon": LON, "radius_m": 5000},
                      headers=tokens["collector"]).status_code == 422

    assert client.get("/api/field/review", headers=tokens["collector"]).status_code == 403
    queue = client.get("/api/field/review", headers=tokens["supervisor"]).json()["items"]
    assert queue[0]["id"] == pin_id and queue[0]["photo_media_id"] == photo.json()["media_id"]
    assert client.get(f"/api/field/media/{queue[0]['photo_media_id']}", headers=tokens["supervisor"]).status_code == 200

    verdict = client.post(f"/api/field/review/business/{pin_id}", json={"decision": "verified"},
                          headers=tokens["supervisor"])
    assert verdict.json()["review_status"] == "verified"
    stats = client.get("/api/field/me/stats", headers=tokens["collector"]).json()
    assert (stats["pins_total"], stats["pins_verified"]) == (1, 1)

    # Ordinary users get aggregates only; raw pins are admin-only.
    s = client.get("/api/map/saturation", params={"lat": LAT, "lon": LON}, headers=tokens["user"]).json()
    assert s["total_businesses"] == 1 and "pins" not in s
    assert client.get("/api/map/admin/pins.geojson", params={"location": "kitwe"},
                      headers=tokens["supervisor"]).status_code == 403


def test_api_rejects_malformed_ids(api):
    client, tokens = api
    item = _wire(_obs(subtype="salon"))
    item["id"] = "../../etc/passwd"
    assert client.post("/api/field/sync", json={"observations": [item]},
                       headers=tokens["collector"]).status_code == 422


def test_admin_map_endpoints_and_role_grant(api):
    client, tokens = api
    item = _wire(_obs(subtype="barbershop", name="Kuta Cuts"))
    client.post("/api/field/sync", json={"observations": [item]}, headers=tokens["collector"])

    pins_url, markets_url = "/api/map/admin/pins.geojson", "/api/map/admin/markets"
    for url in (pins_url, markets_url):
        assert client.get(url, params={"location": "kitwe"}, headers=tokens["supervisor"]).status_code == 403
    pins = client.get(pins_url, params={"location": "kitwe"}, headers=tokens["admin"]).json()["features"]
    assert len(pins) == 1 and pins[0]["properties"]["review_status"] == "pending"
    assert "photo_media_id" in pins[0]["properties"] and "phone" not in pins[0]["properties"]
    assert client.get(markets_url, params={"location": "kitwe"}, headers=tokens["admin"]).json() == {"markets": []}

    # Roles are granted by admins only.
    grant = {"email": "USER@example.com", "role": "collector"}
    assert client.post("/api/field/admin/role", json=grant, headers=tokens["supervisor"]).status_code == 403
    assert client.post("/api/field/admin/role", json=grant, headers=tokens["admin"]).json()["role"] == "collector"
    assert client.post("/api/field/admin/role", json={**grant, "role": "root"}, headers=tokens["admin"]).status_code == 400
    assert client.post("/api/field/admin/role", json={**grant, "email": "nobody@example.com"},
                       headers=tokens["admin"]).status_code == 404
    staff = client.get("/api/field/admin/staff", headers=tokens["admin"]).json()["staff"]
    assert "user@example.com" in [s["email"] for s in staff]
    # The promoted account can now collect.
    assert client.get("/api/field/taxonomy", headers=tokens["user"]).status_code == 200


def test_photos_fall_back_to_the_database_without_a_bucket(db, monkeypatch):
    from app.models.ground_truth import FieldMediaBlob
    from app.services import field_media

    session, _ = db
    monkeypatch.setattr(field_media, "_USE_DB", True)
    monkeypatch.setattr("app.database.SessionLocal", lambda: session)
    data = bytes([255, 216, 255]) + b"7" * 500
    key, digest = field_media.store_photo(data, "image/jpeg")
    assert field_media.store_photo(data, "image/jpeg") == (key, digest)   # re-upload is a no-op
    assert session.query(FieldMediaBlob).count() == 1
    assert field_media.load_photo(key) == data
    with pytest.raises(FileNotFoundError):
        field_media.load_photo("photos/zz/missing.jpg")
