import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User


def make_user(role="agent"):
    user = MagicMock(spec=User)
    user.id = None
    user.role = MagicMock()
    user.role.name = role
    return user


AGENT_USER = make_user("agent")


def make_mock_db():
    """Return AsyncMock db that returns empty rows for all execute() calls."""
    db = AsyncMock()
    empty_result = MagicMock()
    empty_result.all.return_value = []
    db.execute = AsyncMock(return_value=empty_result)
    return db


@pytest.fixture(autouse=True)
def override_auth():
    mock_db = make_mock_db()

    async def _get_db():
        return mock_db

    app.dependency_overrides[get_current_user] = lambda: AGENT_USER
    app.dependency_overrides[get_session] = _get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


class TestDashboardSummary:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/dashboard/summary")
        assert resp.status_code == 200

    def test_response_has_required_keys(self, client):
        resp = client.get("/api/v1/dashboard/summary")
        data = resp.json()
        assert "incidents" in data
        assert "service_requests" in data
        assert "change_requests" in data

    def test_incidents_has_expected_fields(self, client):
        resp = client.get("/api/v1/dashboard/summary")
        incidents = resp.json()["incidents"]
        assert "total" in incidents
        assert "open" in incidents
        assert "by_priority" in incidents
        assert "p1_critical" in incidents["by_priority"]

    def test_service_requests_has_expected_fields(self, client):
        resp = client.get("/api/v1/dashboard/summary")
        sr = resp.json()["service_requests"]
        assert "total" in sr
        assert "open" in sr
        assert "completed" in sr

    def test_change_requests_has_expected_fields(self, client):
        resp = client.get("/api/v1/dashboard/summary")
        cr = resp.json()["change_requests"]
        assert "total" in cr
        assert "in_review" in cr
        assert "approved" in cr

    def test_empty_db_returns_zeros(self, client):
        resp = client.get("/api/v1/dashboard/summary")
        data = resp.json()
        assert data["incidents"]["total"] == 0
        assert data["service_requests"]["total"] == 0
        assert data["change_requests"]["total"] == 0

    def test_requires_authentication(self):
        app.dependency_overrides.clear()
        with TestClient(app) as c:
            resp = c.get("/api/v1/dashboard/summary")
        assert resp.status_code == 401
