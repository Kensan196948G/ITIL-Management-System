import os
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient


def pytest_configure(config):
    os.environ["ENVIRONMENT"] = "test"
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost:9999/test_db"


@pytest.fixture
def app():
    from app.main import app as fastapi_app
    return fastapi_app


@pytest.fixture
async def async_client() -> AsyncGenerator:
    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
