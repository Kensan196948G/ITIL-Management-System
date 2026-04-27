"""Tests for authentication endpoints.

All tests use mocked DB session so no real database is required.
FastAPI dependency_overrides is used to inject fake sessions.
"""
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token, create_refresh_token, hash_password


# ---------------------------------------------------------------------------
# Helpers / factories
# ---------------------------------------------------------------------------

def make_mock_user(
    *,
    email: str = "user@example.com",
    full_name: str = "Test User",
    password: str = "password123",
    is_active: bool = True,
    role_name: str | None = None,
) -> MagicMock:
    """Return a MagicMock that behaves like a User ORM object."""
    user = MagicMock()
    user.id = uuid.uuid4()
    user.email = email
    user.full_name = full_name
    user.hashed_password = hash_password(password)
    user.is_active = is_active
    user.created_at = datetime(2026, 1, 1, 0, 0, 0)
    user.updated_at = datetime(2026, 1, 1, 0, 0, 0)

    if role_name:
        role = MagicMock()
        role.name = role_name
        user.role = role
    else:
        user.role = None

    return user


def _make_scalar_result(value):
    """Return an object whose scalar_one_or_none() / scalar_one() returns value."""
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=value)
    result.scalar_one = MagicMock(return_value=value)
    return result


def _make_scalars_result(values: list):
    """Return an object whose scalars().all() returns values."""
    scalars = MagicMock()
    scalars.all = MagicMock(return_value=values)
    result = MagicMock()
    result.scalars = MagicMock(return_value=scalars)
    return result


def _make_async_session(execute_side_effect=None, execute_return=None) -> AsyncMock:
    """Build a minimal async SQLAlchemy session mock."""
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    if execute_side_effect is not None:
        session.execute = AsyncMock(side_effect=execute_side_effect)
    elif execute_return is not None:
        session.execute = AsyncMock(return_value=execute_return)
    return session


def _session_override(session: AsyncMock):
    """Return an async generator that yields the fake session (DI compatible)."""
    async def _override():
        yield session
    return _override


# ---------------------------------------------------------------------------
# Test: POST /api/v1/auth/register
# ---------------------------------------------------------------------------

class TestRegisterUser:
    async def test_register_user_success(self):
        """Registering a new user returns 201 with user data."""
        from app.main import app
        from app.core.database import get_session

        created_user = make_mock_user(email="new@example.com", full_name="New User")
        session = _make_async_session(execute_side_effect=[
            _make_scalar_result(None),          # duplicate check → not found
            _make_scalar_result(created_user),  # reload after flush
        ])

        app.dependency_overrides[get_session] = _session_override(session)
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/auth/register",
                    json={
                        "email": "new@example.com",
                        "password": "password123",
                        "full_name": "New User",
                    },
                )
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert data["full_name"] == "New User"
        assert data["is_active"] is True

    async def test_register_duplicate_email(self):
        """Registering with an existing email returns 409."""
        from app.main import app
        from app.core.database import get_session

        existing_user = make_mock_user(email="taken@example.com")
        session = _make_async_session(execute_return=_make_scalar_result(existing_user))

        app.dependency_overrides[get_session] = _session_override(session)
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/auth/register",
                    json={
                        "email": "taken@example.com",
                        "password": "password123",
                        "full_name": "Another User",
                    },
                )
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 409
        assert "already registered" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Test: POST /api/v1/auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    async def test_login_success(self):
        """Valid credentials return 200 with access and refresh tokens."""
        from app.main import app
        from app.core.database import get_session

        user = make_mock_user(email="user@example.com", password="password123")
        session = _make_async_session(execute_return=_make_scalar_result(user))

        app.dependency_overrides[get_session] = _session_override(session)
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/auth/login",
                    json={"email": "user@example.com", "password": "password123"},
                )
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self):
        """Wrong password returns 401."""
        from app.main import app
        from app.core.database import get_session

        user = make_mock_user(email="user@example.com", password="correctpassword")
        session = _make_async_session(execute_return=_make_scalar_result(user))

        app.dependency_overrides[get_session] = _session_override(session)
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/auth/login",
                    json={"email": "user@example.com", "password": "wrongpassword"},
                )
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 401

    async def test_login_nonexistent_user(self):
        """Non-existent user returns 401."""
        from app.main import app
        from app.core.database import get_session

        session = _make_async_session(execute_return=_make_scalar_result(None))

        app.dependency_overrides[get_session] = _session_override(session)
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/auth/login",
                    json={"email": "nobody@example.com", "password": "password123"},
                )
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Test: GET /api/v1/auth/me
# ---------------------------------------------------------------------------

class TestGetMe:
    def _valid_token(self, user_id: uuid.UUID) -> str:
        return create_access_token({"sub": str(user_id)})

    async def test_get_me_authenticated(self):
        """Authenticated user receives their profile."""
        from app.main import app
        from app.core.database import get_session

        user = make_mock_user(email="me@example.com", full_name="Me Myself")
        session = _make_async_session(execute_return=_make_scalar_result(user))
        token = self._valid_token(user.id)

        app.dependency_overrides[get_session] = _session_override(session)
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {token}"},
                )
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "me@example.com"
        assert data["full_name"] == "Me Myself"

    async def test_get_me_unauthenticated(self):
        """No token → 403 (HTTPBearer returns 403 when no Authorization header is present)."""
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/auth/me")

        # FastAPI's HTTPBearer returns 403 when Authorization header is missing
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Test: POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------

class TestRefreshToken:
    async def test_refresh_token_success(self):
        """Valid refresh token returns new access and refresh tokens."""
        from app.main import app
        from app.core.database import get_session

        user = make_mock_user(email="user@example.com")
        session = _make_async_session(execute_return=_make_scalar_result(user))
        refresh = create_refresh_token({"sub": str(user.id)})

        app.dependency_overrides[get_session] = _session_override(session)
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/auth/refresh",
                    json={"refresh_token": refresh},
                )
        finally:
            app.dependency_overrides.pop(get_session, None)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_token_invalid(self):
        """Invalid refresh token returns 401."""
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": "this.is.not.valid"},
            )

        assert response.status_code == 401
