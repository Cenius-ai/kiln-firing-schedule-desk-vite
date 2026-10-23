"""API contract tests for the Kiln Firing Schedule Desk."""

import uuid
from pathlib import Path

import pytest

from .conftest import DEMO_EMAIL, DEMO_PASSWORD


def _unique(prefix: str) -> str:
    return f"{prefix} {uuid.uuid4().hex[:8]}"


def test_secret_file_path_stays_inside_the_backend_directory():
    from app.config import BASE_DIR, _confined_secret_path

    base = BASE_DIR.resolve()
    assert base in _confined_secret_path(base / "nested" / "session.key").parents
    assert _confined_secret_path(Path("/etc/passwd")) == (base / ".jwt_secret")
    assert base in _confined_secret_path(Path("../outside.key")).parents


def test_short_signing_secrets_are_strengthened():
    from app.config import _strengthen_secret

    assert len(_strengthen_secret("short")) >= 32
    strong = "x" * 40
    assert _strengthen_secret(strong) == strong


def test_health_reports_seed_counts(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    counts = body["counts"]
    assert counts["members"] >= 1
    assert counts["kilns"] == 2
    assert counts["glaze_tiles"] >= 6
    assert counts["load_sheets"] >= 3
    assert counts["firings"] >= 4


def test_root_serves_html(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "html" in response.headers["content-type"]


def test_login_sets_cookie_and_me_returns_member(client):
    client.cookies.clear()
    response = client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert response.status_code == 200
    member = response.json()
    assert member["email"] == DEMO_EMAIL
    assert "password" not in member and "password_hash" not in member
    assert "kiln_session" in response.cookies

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == member["id"]


def test_login_is_case_insensitive_on_email(client):
    client.cookies.clear()
    response = client.post(
        "/api/auth/login", json={"email": "CENIUS@Cenius.AI", "password": DEMO_PASSWORD}
    )
    assert response.status_code == 200
    client.post("/api/auth/logout")


def test_login_rejects_wrong_password_with_one_message(client):
    client.cookies.clear()
    response = client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-password"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Email or password is incorrect."
    assert "kiln_session" not in response.cookies


def test_login_rejects_unknown_email_with_the_same_message(client):
    client.cookies.clear()
    response = client.post(
        "/api/auth/login", json={"email": "nobody@kiln.studio", "password": DEMO_PASSWORD}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Email or password is incorrect."


@pytest.mark.parametrize(
    "path",
    ["/api/auth/me", "/api/kilns", "/api/firings", "/api/load-sheets", "/api/glaze-tiles", "/api/dashboard/summary"],
)
def test_protected_endpoints_require_a_session(client, path):
    client.cookies.clear()
    response = client.get(path)
    assert response.status_code == 401


def test_session_probe_is_200_for_anonymous_visitors(client):
    client.cookies.clear()
    response = client.get("/api/auth/session")
    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "member": None}


def test_session_probe_returns_the_member_once_signed_in(client):
    client.cookies.clear()
    client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    payload = client.get("/api/auth/session").json()
    assert payload["authenticated"] is True
    assert payload["member"]["email"] == DEMO_EMAIL
    client.post("/api/auth/logout")


def test_logout_clears_the_session(client):
    client.cookies.clear()
    client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401


def test_kilns_list_has_studio_kilns(signed_in):
    response = signed_in.get("/api/kilns")
    assert response.status_code == 200
    kilns = response.json()
    assert len(kilns) == 2
    assert all(kiln["name"] for kiln in kilns)


def test_load_sheet_crud_round_trip(signed_in):
    kilns = signed_in.get("/api/kilns").json()
    kiln = kilns[0]

    created = signed_in.post(
        "/api/load-sheets",
        json={
            "kiln_id": kiln["id"],
            "title": _unique("Test cone sheet"),
            "cone": "Cone 6",
            "cone_temp_c": 1220,
            "ware_count": 18,
            "status": "loaded",
            "notes": "Automated contract test.",
        },
    )
    assert created.status_code == 201, created.text
    sheet = created.json()
    assert sheet["kiln_name"] == kiln["name"]
    assert sheet["ware_count"] == 18

    listed = signed_in.get("/api/load-sheets").json()
    assert any(row["id"] == sheet["id"] for row in listed)

    patched = signed_in.patch(
        f"/api/load-sheets/{sheet['id']}",
        json={
            "kiln_id": kiln["id"],
            "title": sheet["title"],
            "cone": sheet["cone"],
            "cone_temp_c": sheet["cone_temp_c"],
            "ware_count": 7,
            "status": "fired",
            "notes": "Count corrected after loading.",
        },
    )
    assert patched.status_code == 200
    assert patched.json()["ware_count"] == 7
    assert patched.json()["status"] == "fired"

    assert signed_in.delete(f"/api/load-sheets/{sheet['id']}").status_code == 204
    remaining = signed_in.get("/api/load-sheets").json()
    assert all(row["id"] != sheet["id"] for row in remaining)
    assert signed_in.delete(f"/api/load-sheets/{sheet['id']}").status_code == 404


@pytest.mark.parametrize(
    "overrides,field",
    [
        ({"ware_count": 0}, "ware_count"),
        ({"ware_count": 201}, "ware_count"),
        ({"cone_temp_c": 400}, "cone_temp_c"),
        ({"title": "x"}, "title"),
    ],
)
def test_load_sheet_validation_is_field_level(signed_in, overrides, field):
    kiln = signed_in.get("/api/kilns").json()[0]
    payload = {
        "kiln_id": kiln["id"],
        "title": _unique("Valid title"),
        "cone": "Cone 6",
        "cone_temp_c": 1220,
        "ware_count": 18,
        "status": "draft",
        "notes": "",
    }
    payload.update(overrides)
    response = signed_in.post("/api/load-sheets", json=payload)
    assert response.status_code == 422
    locations = [error["loc"][-1] for error in response.json()["detail"]]
    assert field in locations


def test_glaze_tiles_filter_by_cone_and_surface(signed_in):
    all_tiles = signed_in.get("/api/glaze-tiles").json()
    assert len(all_tiles) >= 6

    cone = all_tiles[0]["cone"]
    filtered = signed_in.get("/api/glaze-tiles", params={"cone": cone}).json()
    assert filtered
    assert all(tile["cone"] == cone for tile in filtered)

    surfaces = {tile["surface"] for tile in all_tiles}
    surface = sorted(surfaces)[0]
    by_surface = signed_in.get("/api/glaze-tiles", params={"surface": surface}).json()
    assert by_surface
    assert all(tile["surface"] == surface for tile in by_surface)


def test_glaze_tile_crud_and_rating_update(signed_in):
    created = signed_in.post(
        "/api/glaze-tiles",
        json={
            "name": _unique("Test glaze"),
            "cone": "Cone 6",
            "surface": "satin",
            "color_hex": "#3d2dd6",
            "rating": 2,
            "result_notes": "Contract test tile.",
            "tested_on": "2024-05-01",
        },
    )
    assert created.status_code == 201, created.text
    tile = created.json()

    patched = signed_in.patch(
        f"/api/glaze-tiles/{tile['id']}",
        json={
            "name": tile["name"],
            "cone": tile["cone"],
            "surface": tile["surface"],
            "color_hex": tile["color_hex"],
            "rating": 4,
            "result_notes": "Better at two dips.",
            "tested_on": tile["tested_on"],
        },
    )
    assert patched.status_code == 200
    assert patched.json()["rating"] == 4

    assert signed_in.delete(f"/api/glaze-tiles/{tile['id']}").status_code == 204
    assert signed_in.get(f"/api/glaze-tiles/{tile['id']}").status_code == 404


def test_glaze_tile_rejects_bad_colour_and_surface(signed_in):
    response = signed_in.post(
        "/api/glaze-tiles",
        json={
            "name": "Broken tile",
            "cone": "Cone 6",
            "surface": "sparkly",
            "color_hex": "blue",
            "rating": 3,
            "result_notes": "",
            "tested_on": "2024-05-01",
        },
    )
    assert response.status_code == 422
    fields = {error["loc"][-1] for error in response.json()["detail"]}
    assert {"surface", "color_hex"} <= fields


def test_firing_computes_cooldown_window(signed_in):
    kiln = signed_in.get("/api/kilns").json()[0]
    created = signed_in.post(
        "/api/firings",
        json={
            "kiln_id": kiln["id"],
            "title": _unique("Cooldown maths"),
            "target_cone": "Cone 6",
            "scheduled_start": "2031-03-10T08:00:00",
            "duration_hours": 8,
            "cooldown_hours": 12,
            "notes": "",
        },
    )
    assert created.status_code == 201, created.text
    firing = created.json()
    assert firing["cooldown_start"].startswith("2031-03-10T16:00")
    assert firing["cooldown_end"].startswith("2031-03-11T04:00")


def test_firing_overlap_returns_409_naming_the_kiln(signed_in):
    kiln = signed_in.get("/api/kilns").json()[0]
    first = signed_in.post(
        "/api/firings",
        json={
            "kiln_id": kiln["id"],
            "title": _unique("Overlap anchor"),
            "target_cone": "Cone 6",
            "scheduled_start": "2032-01-05T08:00:00",
            "duration_hours": 8,
            "cooldown_hours": 12,
            "notes": "",
        },
    )
    assert first.status_code == 201

    clash = signed_in.post(
        "/api/firings",
        json={
            "kiln_id": kiln["id"],
            "title": _unique("Overlap intruder"),
            "target_cone": "Cone 6",
            "scheduled_start": "2032-01-05T20:00:00",
            "duration_hours": 4,
            "cooldown_hours": 4,
            "notes": "",
        },
    )
    assert clash.status_code == 409
    assert kiln["name"] in clash.json()["detail"]

    # A different kiln at the same time is fine.
    other = signed_in.get("/api/kilns").json()[1]
    allowed = signed_in.post(
        "/api/firings",
        json={
            "kiln_id": other["id"],
            "title": _unique("Other kiln"),
            "target_cone": "Cone 10",
            "scheduled_start": "2032-01-05T20:00:00",
            "duration_hours": 4,
            "cooldown_hours": 4,
            "notes": "",
        },
    )
    assert allowed.status_code == 201

    # Editing into a conflict is rejected too.
    moved = signed_in.patch(
        f"/api/firings/{allowed.json()['id']}",
        json={
            "kiln_id": kiln["id"],
            "title": allowed.json()["title"],
            "target_cone": allowed.json()["target_cone"],
            "scheduled_start": "2032-01-05T22:00:00",
            "duration_hours": 4,
            "cooldown_hours": 4,
            "notes": "",
        },
    )
    assert moved.status_code == 409


def test_firings_filter_by_kiln_and_month(signed_in):
    kilns = signed_in.get("/api/kilns").json()
    kiln = kilns[0]
    signed_in.post(
        "/api/firings",
        json={
            "kiln_id": kiln["id"],
            "title": _unique("March booking"),
            "target_cone": "Cone 6",
            "scheduled_start": "2033-03-12T09:00:00",
            "duration_hours": 6,
            "cooldown_hours": 6,
            "notes": "",
        },
    )
    march = signed_in.get("/api/firings", params={"kiln_id": kiln["id"], "month": "2033-03"}).json()
    assert march
    assert all(firing["kiln_id"] == kiln["id"] for firing in march)
    assert all(firing["scheduled_start"].startswith("2033-03") for firing in march if firing["scheduled_start"].startswith("2033"))

    april = signed_in.get("/api/firings", params={"kiln_id": kiln["id"], "month": "2033-04"}).json()
    assert all(not firing["scheduled_start"].startswith("2033-03") for firing in april)

    bad = signed_in.get("/api/firings", params={"month": "not-a-month"})
    assert bad.status_code == 422


def test_dashboard_summary_shape(signed_in):
    response = signed_in.get("/api/dashboard/summary")
    assert response.status_code == 200
    summary = response.json()
    assert len(summary["upcoming_firings"]) >= 1
    assert summary["kiln_count"] == 2
    assert summary["cooling_now"] >= 1
    assert set(summary["sheet_status_counts"]) == {"draft", "loaded", "fired"}
    assert summary["recent_load_sheets"]
    assert summary["recent_glaze_tiles"]
    upcoming = summary["upcoming_firings"]
    assert all(firing["kiln_name"] and firing["target_cone"] for firing in upcoming)


def test_member_profile_update_persists(signed_in):
    before = signed_in.get("/api/members/me").json()
    updated = signed_in.patch(
        "/api/members/me",
        json={
            "display_name": "Cenius Demo Lead",
            "studio_role": "Studio lead",
            "bio": "Runs the Tuesday glaze sessions.",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["display_name"] == "Cenius Demo Lead"

    fetched = signed_in.get("/api/auth/me").json()
    assert fetched["display_name"] == "Cenius Demo Lead"
    assert fetched["bio"] == "Runs the Tuesday glaze sessions."

    restored = signed_in.patch(
        "/api/members/me",
        json={
            "display_name": before["display_name"],
            "studio_role": before["studio_role"],
            "bio": before["bio"],
        },
    )
    assert restored.status_code == 200


def test_member_profile_validation(signed_in):
    response = signed_in.patch(
        "/api/members/me", json={"display_name": "A", "studio_role": "Studio lead", "bio": ""}
    )
    assert response.status_code == 422
    fields = {error["loc"][-1] for error in response.json()["detail"]}
    assert "display_name" in fields
