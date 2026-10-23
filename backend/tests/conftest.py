"""Test fixtures: the app is pointed at a throwaway SQLite file before import."""

import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

_TMP_DIR = Path(tempfile.mkdtemp(prefix="kiln-tests-"))
os.environ["KILN_DATABASE_URL"] = f"sqlite:///{_TMP_DIR / 'test.db'}"
os.environ["KILN_JWT_SECRET"] = "kiln-tests-only-signing-secret-0123456789"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

DEMO_EMAIL = "cenius@cenius.ai"
DEMO_PASSWORD = "cenius"


@pytest.fixture(scope="session")
def client():
    # Entering the context runs the lifespan hook: schema creation + seed.
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def signed_in(client):
    client.cookies.clear()
    response = client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    yield client
    client.post("/api/auth/logout")
    client.cookies.clear()
