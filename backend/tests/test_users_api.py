import uuid
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_session
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User


def make_user_obj(role_name="agent", is_active=True):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    user.full_name = "Test User"
    user.is_active = is_active
    user.role = MagicMock()
    user.role.name = role_name
    user.created_at = datetime(2026, 4, 1, 0, 0, 0, tzinfo=timezone.utc)
    return user


ADMIN_USER = make_user_obj("admin")


def make_mock_db(rows=None):
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows if rows is not None else []
    result.scalar_one_or_none.return_value = rows[0] if rows else None
    result.scalar_one.return_value = rows[0] if rows else None
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
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


class TestListUsers:
    def test_returns_200_empty(self, client):
        resp = client.get("/api/v1/users/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_user_list(self, client, override_deps):
        user = make_user_obj("agent")
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [user]
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.get("/api/v1/users/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["role"] == "agent"
        assert data[0]["is_active"] is True

    def test_response_has_required_keys(self, client, override_deps):
        user = make_user_obj()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [user]
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.get("/api/v1/users/")
        entry = resp.json()[0]
        for key in ("id", "email", "full_name", "role", "is_active", "created_at"):
            assert key in entry, f"Missing key: {key}"

    def test_requires_authentication(self):
        app.dependency_overrides.clear()
        with TestClient(app) as c:
            resp = c.get("/api/v1/users/")
        assert resp.status_code == 401

    def test_pagination_params(self, client):
        resp = client.get("/api/v1/users/?page=1&page_size=5")
        assert resp.status_code == 200


class TestGetUser:
    def test_returns_404_when_not_found(self, client):
        resp = client.get(f"/api/v1/users/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_returns_user_when_found(self, client, override_deps):
        user = make_user_obj("admin")
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = user
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.get(f"/api/v1/users/{user.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "admin"


class TestUpdateUser:
    def test_update_full_name(self, client, override_deps):
        user = make_user_obj()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = user
        mock_result.scalar_one.return_value = user
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.put(
            f"/api/v1/users/{user.id}",
            json={"full_name": "Updated Name"},
        )
        assert resp.status_code == 200

    def test_deactivate_user(self, client, override_deps):
        user = make_user_obj()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = user
        mock_result.scalar_one.return_value = user
        override_deps.execute = AsyncMock(return_value=mock_result)

        resp = client.put(
            f"/api/v1/users/{user.id}",
            json={"is_active": False},
        )
        assert resp.status_code == 200

    def test_returns_404_for_missing_user(self, client):
        resp = client.put(
            f"/api/v1/users/{uuid.uuid4()}",
            json={"full_name": "Ghost"},
        )
        assert resp.status_code == 404
