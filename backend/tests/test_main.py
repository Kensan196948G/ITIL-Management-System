from unittest.mock import patch

from app.main import app, lifespan


class TestHealthEndpoint:
    async def test_health_returns_ok_when_db_connected(self, async_client):
        with patch("app.main.check_database_connection", return_value=True):
            response = await async_client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert data["database"] == "connected"

    async def test_health_returns_degraded_when_db_disconnected(self, async_client):
        with patch("app.main.check_database_connection", return_value=False):
            response = await async_client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["database"] == "disconnected"

    async def test_health_returns_json_content_type(self, async_client):
        with patch("app.main.check_database_connection", return_value=True):
            response = await async_client.get("/health")
            assert response.headers["content-type"] == "application/json"


class TestAppConfiguration:
    def test_app_title(self):
        assert app.title == "ITIL Management System API"

    def test_app_version(self):
        assert app.version == "0.1.0"

    def test_cors_middleware_installed(self):
        middleware_types = [m.cls.__name__ for m in app.user_middleware]
        assert "CORSMiddleware" in middleware_types

    def test_health_endpoint_registered(self):
        routes = [r.path for r in app.routes]
        assert "/health" in routes


class TestLifespan:
    async def test_lifespan_calls_db_check_on_startup(self):
        with patch("app.main.check_database_connection", return_value=True) as mock_check:
            async with lifespan(app):
                pass
        mock_check.assert_awaited_once()

    async def test_lifespan_handles_db_failure(self):
        with patch("app.main.check_database_connection", return_value=False) as mock_check:
            async with lifespan(app):
                pass
        mock_check.assert_awaited_once()
