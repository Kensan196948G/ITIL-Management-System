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
    db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    db.execute = AsyncMock(return_value=mock_result)
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


class TestIncidentExport:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/reports/incidents")
        assert resp.status_code == 200

    def test_content_type_is_csv(self, client):
        resp = client.get("/api/v1/reports/incidents")
        assert "text/csv" in resp.headers["content-type"]

    def test_content_disposition_is_attachment(self, client):
        resp = client.get("/api/v1/reports/incidents")
        assert "attachment" in resp.headers["content-disposition"]
        assert "incidents_" in resp.headers["content-disposition"]

    def test_empty_result_returns_header_only(self, client):
        resp = client.get("/api/v1/reports/incidents")
        lines = resp.text.strip().splitlines()
        assert len(lines) == 1
        assert "id" in lines[0]
        assert "title" in lines[0]
        assert "status" in lines[0]

    def test_requires_authentication(self):
        app.dependency_overrides.clear()
        with TestClient(app) as c:
            resp = c.get("/api/v1/reports/incidents")
        assert resp.status_code == 401


class TestServiceRequestExport:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/reports/service-requests")
        assert resp.status_code == 200

    def test_content_type_is_csv(self, client):
        resp = client.get("/api/v1/reports/service-requests")
        assert "text/csv" in resp.headers["content-type"]

    def test_content_disposition_is_attachment(self, client):
        resp = client.get("/api/v1/reports/service-requests")
        assert "attachment" in resp.headers["content-disposition"]
        assert "service_requests_" in resp.headers["content-disposition"]

    def test_empty_result_returns_header_only(self, client):
        resp = client.get("/api/v1/reports/service-requests")
        lines = resp.text.strip().splitlines()
        assert len(lines) == 1
        assert "id" in lines[0]
        assert "status" in lines[0]

    def test_requires_authentication(self):
        app.dependency_overrides.clear()
        with TestClient(app) as c:
            resp = c.get("/api/v1/reports/service-requests")
        assert resp.status_code == 401


class TestChangeRequestExport:
    def test_returns_200(self, client):
        resp = client.get("/api/v1/reports/change-requests")
        assert resp.status_code == 200

    def test_content_type_is_csv(self, client):
        resp = client.get("/api/v1/reports/change-requests")
        assert "text/csv" in resp.headers["content-type"]

    def test_content_disposition_is_attachment(self, client):
        resp = client.get("/api/v1/reports/change-requests")
        assert "attachment" in resp.headers["content-disposition"]
        assert "change_requests_" in resp.headers["content-disposition"]

    def test_empty_result_returns_header_only(self, client):
        resp = client.get("/api/v1/reports/change-requests")
        lines = resp.text.strip().splitlines()
        assert len(lines) == 1
        assert "id" in lines[0]
        assert "status" in lines[0]
        assert "change_type" in lines[0]

    def test_requires_authentication(self):
        app.dependency_overrides.clear()
        with TestClient(app) as c:
            resp = c.get("/api/v1/reports/change-requests")
        assert resp.status_code == 401
