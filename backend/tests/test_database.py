from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base, check_database_connection, get_session


class TestBase:
    def test_base_is_declarative(self):
        assert hasattr(Base, "metadata")

    def test_metadata_is_not_none(self):
        assert Base.metadata is not None


class TestCheckDatabaseConnection:
    async def test_returns_true_when_db_reachable(self):
        mock_engine = MagicMock()
        mock_conn = AsyncMock()
        mock_engine.connect.return_value = mock_conn

        with patch("app.core.database.engine", mock_engine):
            result = await check_database_connection()
        assert result is True

    async def test_returns_false_when_db_unreachable(self):
        mock_engine = MagicMock()
        mock_engine.connect.side_effect = Exception("Connection refused")

        with patch("app.core.database.engine", mock_engine):
            result = await check_database_connection()
        assert result is False

    async def test_returns_false_on_timeout(self):
        mock_engine = MagicMock()
        mock_engine.connect.side_effect = TimeoutError("Connection timed out")

        with patch("app.core.database.engine", mock_engine):
            result = await check_database_connection()
        assert result is False


class TestGetSession:
    @pytest.fixture
    def mock_session(self):
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def mock_factory(self, mock_session):
        mock_factory = MagicMock()
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_session
        mock_factory.return_value = mock_context
        return mock_factory

    async def test_get_session_yields_session(self, mock_factory, mock_session):
        with patch("app.core.database.async_session_factory", mock_factory):
            async for session in get_session():
                assert session == mock_session

    async def test_get_session_commits_on_success(self, mock_factory, mock_session):
        with patch("app.core.database.async_session_factory", mock_factory):
            async for _ in get_session():
                pass
        mock_session.commit.assert_awaited_once()

    async def test_get_session_rolls_back_on_error(self, mock_factory, mock_session):
        with patch("app.core.database.async_session_factory", mock_factory):
            gen = get_session()
            await gen.__anext__()
            with pytest.raises(RuntimeError, match="test error"):
                await gen.athrow(RuntimeError("test error"))
        mock_session.rollback.assert_awaited_once()

    async def test_get_session_closes_session(self, mock_factory, mock_session):
        with patch("app.core.database.async_session_factory", mock_factory):
            async for _ in get_session():
                pass
        mock_session.close.assert_awaited_once()
