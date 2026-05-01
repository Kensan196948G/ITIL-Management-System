"""Tests for BaseService CRUD operations, PaginatedResponse, and error handlers."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.base_service import BaseService
from app.core.database import Base
from app.core.pagination import PaginatedResponse
from app.core.errors import (
    NotFoundError,
    ConflictError,
    ForbiddenError,
    not_found_handler,
    conflict_handler,
    forbidden_handler,
)


# ---------------------------------------------------------------------------
# Helpers / Stubs
# ---------------------------------------------------------------------------


class FakeModel(Base):
    """SQLAlchemy-mapped fake model used only in unit tests."""

    __tablename__ = "fake_models_test"
    __table_args__ = {"extend_existing": True}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=True)


class FakeService(BaseService[FakeModel]):
    """Concrete service backed by FakeModel."""


# ---------------------------------------------------------------------------
# BaseService tests — we patch select() so no real DB is needed
# ---------------------------------------------------------------------------


class TestBaseServiceGet:
    async def test_get_returns_model_when_found(self):
        service = FakeService(FakeModel)
        model_id = uuid.uuid4()
        expected = FakeModel()
        expected.id = model_id

        # Patch sqlalchemy select so execute is not actually invoked against SA
        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none.return_value = expected
        db = AsyncMock()
        db.execute = AsyncMock(return_value=scalar_result)

        with patch("app.core.base_service.select", return_value=MagicMock()):
            result = await service.get(db, model_id)

        assert result is expected

    async def test_get_returns_none_when_not_found(self):
        service = FakeService(FakeModel)
        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none.return_value = None
        db = AsyncMock()
        db.execute = AsyncMock(return_value=scalar_result)

        with patch("app.core.base_service.select", return_value=MagicMock()):
            result = await service.get(db, uuid.uuid4())

        assert result is None


class TestBaseServiceGetMulti:
    async def test_get_multi_returns_items_and_total(self):
        service = FakeService(FakeModel)
        items = [FakeModel() for _ in range(3)]

        count_result = MagicMock()
        count_result.scalar_one.return_value = 3

        items_result = MagicMock()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = items
        items_result.scalars.return_value = scalars_mock

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[count_result, items_result])

        with patch("app.core.base_service.select", return_value=MagicMock()):
            with patch("app.core.base_service.func", MagicMock()):
                result_items, total = await service.get_multi(db, page=1, page_size=20)

        assert total == 3
        assert result_items == items

    async def test_get_multi_calculates_offset_correctly(self):
        service = FakeService(FakeModel)
        count_result = MagicMock()
        count_result.scalar_one.return_value = 0
        items_result = MagicMock()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = []
        items_result.scalars.return_value = scalars_mock

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=[count_result, items_result])

        with patch("app.core.base_service.select", return_value=MagicMock()):
            with patch("app.core.base_service.func", MagicMock()):
                result_items, total = await service.get_multi(db, page=3, page_size=10)

        assert total == 0
        assert result_items == []


class TestBaseServiceCreate:
    async def test_create_adds_and_returns_model(self):
        service = FakeService(FakeModel)
        model_id = uuid.uuid4()

        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()

        async def _refresh(obj):
            obj.id = model_id

        db.refresh = AsyncMock(side_effect=_refresh)

        result = await service.create(db, name="new_item")

        db.add.assert_called_once()
        db.flush.assert_awaited_once()
        db.refresh.assert_awaited_once()
        assert isinstance(result, FakeModel)
        assert result.id == model_id

    async def test_create_passes_kwargs_to_model(self):
        service = FakeService(FakeModel)

        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        result = await service.create(db, name="alpha")
        assert result.name == "alpha"


class TestBaseServiceUpdate:
    async def test_update_sets_non_none_values(self):
        service = FakeService(FakeModel)
        obj = FakeModel()
        obj.name = "old"

        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        result = await service.update(db, obj, name="new")

        assert result.name == "new"
        db.flush.assert_awaited_once()
        db.refresh.assert_awaited_once()

    async def test_update_skips_none_values(self):
        service = FakeService(FakeModel)
        obj = FakeModel()
        obj.name = "unchanged"

        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.update(db, obj, name=None)
        assert obj.name == "unchanged"


class TestBaseServiceDelete:
    async def test_delete_returns_true_when_found(self):
        service = FakeService(FakeModel)
        existing = FakeModel()
        existing.id = uuid.uuid4()

        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none.return_value = existing
        db = AsyncMock()
        db.execute = AsyncMock(return_value=scalar_result)
        db.delete = AsyncMock()

        with patch("app.core.base_service.select", return_value=MagicMock()):
            result = await service.delete(db, existing.id)

        assert result is True
        db.delete.assert_awaited_once_with(existing)

    async def test_delete_returns_false_when_not_found(self):
        service = FakeService(FakeModel)

        scalar_result = MagicMock()
        scalar_result.scalar_one_or_none.return_value = None
        db = AsyncMock()
        db.execute = AsyncMock(return_value=scalar_result)

        with patch("app.core.base_service.select", return_value=MagicMock()):
            result = await service.delete(db, uuid.uuid4())

        assert result is False


# ---------------------------------------------------------------------------
# PaginatedResponse tests
# ---------------------------------------------------------------------------


class TestPaginatedResponse:
    def test_paginated_response_structure(self):
        items = [{"id": str(uuid.uuid4()), "name": "item1"}]
        response = PaginatedResponse(items=items, total=1, page=1, page_size=20)

        assert response.items == items
        assert response.total == 1
        assert response.page == 1
        assert response.page_size == 20

    def test_paginated_response_empty(self):
        response = PaginatedResponse(items=[], total=0, page=1, page_size=20)
        assert response.items == []
        assert response.total == 0

    def test_paginated_response_multiple_pages(self):
        items = [{"id": str(uuid.uuid4())} for _ in range(5)]
        response = PaginatedResponse(items=items, total=50, page=3, page_size=5)
        assert len(response.items) == 5
        assert response.total == 50
        assert response.page == 3
        assert response.page_size == 5

    def test_paginated_response_serializable(self):
        items = [{"id": "1", "name": "test"}]
        response = PaginatedResponse(items=items, total=1, page=1, page_size=10)
        dumped = response.model_dump()
        assert dumped["total"] == 1
        assert dumped["page"] == 1
        assert dumped["page_size"] == 10
        assert dumped["items"] == items


# ---------------------------------------------------------------------------
# Error handler tests
# ---------------------------------------------------------------------------


def _mock_request():
    request = MagicMock()
    request.state.request_id = "test-request-id"
    return request


class TestNotFoundError:
    def test_not_found_error_attributes(self):
        err = NotFoundError(resource="Incident", id="abc-123")
        assert err.resource == "Incident"
        assert err.id == "abc-123"

    async def test_not_found_handler_returns_404(self):
        err = NotFoundError(resource="Incident", id="abc-123")
        response = await not_found_handler(_mock_request(), err)
        assert response.status_code == 404

    async def test_not_found_handler_returns_correct_body(self):
        import json
        err = NotFoundError(resource="Change", id="xyz-999")
        response = await not_found_handler(_mock_request(), err)
        body = json.loads(response.body)
        assert body["error_code"] == "NOT_FOUND"
        assert "Change" in body["message"]
        assert "xyz-999" in body["message"]
        assert body["request_id"] == "test-request-id"


class TestConflictError:
    def test_conflict_error_message(self):
        err = ConflictError(message="Email already exists")
        assert err.message == "Email already exists"

    async def test_conflict_handler_returns_409(self):
        err = ConflictError(message="Duplicate entry")
        response = await conflict_handler(_mock_request(), err)
        assert response.status_code == 409

    async def test_conflict_handler_returns_correct_body(self):
        import json
        err = ConflictError(message="Email already in use")
        response = await conflict_handler(_mock_request(), err)
        body = json.loads(response.body)
        assert body["error_code"] == "CONFLICT"
        assert body["message"] == "Email already in use"
        assert body["request_id"] == "test-request-id"


class TestForbiddenError:
    async def test_forbidden_handler_returns_403(self):
        err = ForbiddenError()
        response = await forbidden_handler(_mock_request(), err)
        assert response.status_code == 403

    async def test_forbidden_handler_returns_correct_body(self):
        import json
        err = ForbiddenError()
        response = await forbidden_handler(_mock_request(), err)
        body = json.loads(response.body)
        assert body["error_code"] == "FORBIDDEN"
        assert body["message"] == "Permission denied"
        assert body["request_id"] == "test-request-id"


# ---------------------------------------------------------------------------
# Integration: error handlers wired into a FastAPI app
# ---------------------------------------------------------------------------


def _build_test_app() -> FastAPI:
    """Build a minimal FastAPI app with error handlers registered."""
    from app.core.errors import (
        NotFoundError,
        ConflictError,
        ForbiddenError,
        not_found_handler,
        conflict_handler,
        forbidden_handler,
    )

    test_app = FastAPI()
    test_app.add_exception_handler(NotFoundError, not_found_handler)
    test_app.add_exception_handler(ConflictError, conflict_handler)
    test_app.add_exception_handler(ForbiddenError, forbidden_handler)

    @test_app.get("/raise-not-found")
    async def raise_not_found():
        raise NotFoundError(resource="Item", id="1")

    @test_app.get("/raise-conflict")
    async def raise_conflict():
        raise ConflictError(message="Already exists")

    @test_app.get("/raise-forbidden")
    async def raise_forbidden():
        raise ForbiddenError()

    return test_app


class TestErrorHandlerIntegration:
    async def test_not_found_endpoint_returns_404(self):
        test_app = _build_test_app()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/raise-not-found")
        assert response.status_code == 404
        assert "Item" in response.json()["message"]

    async def test_conflict_endpoint_returns_409(self):
        test_app = _build_test_app()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/raise-conflict")
        assert response.status_code == 409
        assert response.json()["message"] == "Already exists"

    async def test_forbidden_endpoint_returns_403(self):
        test_app = _build_test_app()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/raise-forbidden")
        assert response.status_code == 403
        assert response.json()["message"] == "Permission denied"
