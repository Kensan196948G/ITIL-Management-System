import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_session
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User


def make_admin_user():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.role = MagicMock()
    user.role.name = "admin"
    return user


ADMIN_USER = make_admin_user()


def make_audit_log_row(
    table_name="incidents",
    record_id=None,
    action="CREATE",
    user_id=None,
    changes=None,
):
    row = MagicMock()
    row.id = uuid.uuid4()
    row.table_name = table_name
    row.record_id = str(record_id or uuid.uuid4())
    row.action = action
    row.user_id = user_id or uuid.uuid4()
    row.changes = changes or {"status": ["new", "assigned"]}
    from datetime import datetime, timezone
    row.created_at = datetime(2026, 4, 27, 12, 0, 0, tzinfo=timezone.utc)
    return row


def make_mock_db(rows=None):
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows if rows is not None else []
    result.scalar_one_or_none.return_value = rows[0] if rows else None
    db.execute = AsyncMock(return_value=result)
    return db


@pytest.fixture(autouse=True)
def override_deps():
    mock_db = make_mock_db()

    async def _get_db():
        return mock_db

    app.dependency_overrides[get_current_user] = lambda: ADMIN_USER
    app.dependency_overrides[require_admin] = lambda: ADMIN_USER
    app.dependency_overrides[get_session] = _get_db
    yield mock_db
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


class TestListAuditLogs:
    def test_returns_200_empty(self, client):
        resp = client.get("/api/v1/audit-logs/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_list_of_logs(self, client, override_deps):
        log = make_audit_log_row()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [log]
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.get("/api/v1/audit-logs/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["table_name"] == "incidents"
        assert data[0]["action"] == "CREATE"

    def test_response_has_required_keys(self, client, override_deps):
        log = make_audit_log_row()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [log]
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.get("/api/v1/audit-logs/")
        entry = resp.json()[0]
        for key in ("id", "table_name", "record_id", "action", "user_id", "changes", "created_at"):
            assert key in entry, f"Missing key: {key}"

    def test_requires_authentication(self):
        app.dependency_overrides.clear()
        with TestClient(app) as c:
            resp = c.get("/api/v1/audit-logs/")
        assert resp.status_code == 401

    def test_accepts_table_name_filter(self, client):
        resp = client.get("/api/v1/audit-logs/?table_name=incidents")
        assert resp.status_code == 200

    def test_accepts_action_filter(self, client):
        resp = client.get("/api/v1/audit-logs/?action=CREATE")
        assert resp.status_code == 200

    def test_accepts_pagination(self, client):
        resp = client.get("/api/v1/audit-logs/?page=1&page_size=10")
        assert resp.status_code == 200


class TestGetAuditLog:
    def test_returns_404_when_not_found(self, client):
        resp = client.get(f"/api/v1/audit-logs/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_returns_log_when_found(self, client, override_deps):
        log = make_audit_log_row()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = log
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.get(f"/api/v1/audit-logs/{log.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["table_name"] == "incidents"
        assert data["action"] == "CREATE"
