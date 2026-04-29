import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_session
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.models.service_request import (
    FulfillmentTaskStatus,
    ServiceRequestCategory,
    ServiceRequestStatus,
)
from app.models.user import User


def make_user(role="agent"):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "agent@example.com"
    user.full_name = "Test Agent"
    user.role = MagicMock()
    user.role.name = role
    return user


def make_catalog_item():
    item = MagicMock()
    item.id = uuid.uuid4()
    item.name = "Laptop Request"
    item.description = "Request for a laptop"
    item.category = ServiceRequestCategory.IT_EQUIPMENT
    item.estimated_days = 5
    item.requires_approval = True
    item.is_active = True
    item.created_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    item.updated_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    return item


def make_fulfillment_task(sr_id=None):
    task = MagicMock()
    task.id = uuid.uuid4()
    task.service_request_id = sr_id or uuid.uuid4()
    task.title = "Provision device"
    task.description = "Configure and set up laptop"
    task.status = FulfillmentTaskStatus.PENDING
    task.assignee_id = None
    task.due_date = None
    task.completed_at = None
    task.notes = None
    task.order = 0
    task.created_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    task.updated_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    return task


def make_service_request():
    sr = MagicMock()
    sr.id = uuid.uuid4()
    sr.title = "Need a laptop"
    sr.description = "New employee needs a laptop"
    sr.status = ServiceRequestStatus.SUBMITTED
    sr.category = ServiceRequestCategory.IT_EQUIPMENT
    sr.catalog_item_id = None
    sr.requester_id = uuid.uuid4()
    sr.approver_id = None
    sr.assignee_id = None
    sr.due_date = None
    sr.approved_at = None
    sr.rejected_at = None
    sr.completed_at = None
    sr.rejection_reason = None
    sr.created_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    sr.updated_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    sr.status_logs = []
    sr.fulfillment_tasks = []
    return sr


AGENT_USER = make_user("agent")
ADMIN_USER = make_user("admin")


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: AGENT_USER
    app.dependency_overrides[require_agent_or_admin] = lambda: AGENT_USER
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


_UNSET = object()


def make_mock_db(scalar_list=None, scalar_one=_UNSET):
    mock_db = AsyncMock()
    mock_result = MagicMock()
    if scalar_list is not None:
        mock_result.scalars.return_value.all.return_value = scalar_list
    if scalar_one is not _UNSET:
        mock_result.scalar_one_or_none.return_value = scalar_one
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db.add = MagicMock()
    return mock_db


# ---- Service Catalog tests ----

class TestListCatalogItems:
    def test_list_catalog_items_returns_200(self, client):
        item = make_catalog_item()
        mock_db = make_mock_db(scalar_list=[item])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get("/api/v1/service-requests/catalog")
        assert resp.status_code == 200

    def test_list_catalog_items_empty(self, client):
        mock_db = make_mock_db(scalar_list=[])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get("/api/v1/service-requests/catalog")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_catalog_items_requires_auth(self):
        app.dependency_overrides.clear()
        with TestClient(app) as client:
            resp = client.get("/api/v1/service-requests/catalog")
        assert resp.status_code == 401


class TestCreateCatalogItem:
    def test_create_catalog_item_validation_requires_name(self, client):
        resp = client.post(
            "/api/v1/service-requests/catalog",
            json={"description": "Request for something"},
        )
        assert resp.status_code == 422

    def test_create_catalog_item_validation_requires_description(self, client):
        resp = client.post(
            "/api/v1/service-requests/catalog",
            json={"name": "Laptop Request"},
        )
        assert resp.status_code == 422

    def test_create_catalog_item_requires_auth(self):
        app.dependency_overrides.clear()
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/service-requests/catalog",
                json={"name": "Laptop Request", "description": "Request for a laptop"},
            )
        assert resp.status_code == 401

    def test_create_catalog_item_success(self, client):
        item = make_catalog_item()
        mock_db = make_mock_db()
        mock_db.refresh = AsyncMock(side_effect=lambda obj: None)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch("app.api.v1.service_requests.ServiceCatalogItem", return_value=item):
            resp = client.post(
                "/api/v1/service-requests/catalog",
                json={
                    "name": "Laptop Request",
                    "description": "Request for a laptop",
                    "category": "it_equipment",
                },
            )
        assert resp.status_code in (201, 200)


class TestGetCatalogItem:
    def test_get_nonexistent_catalog_item_returns_404(self, client):
        mock_db = make_mock_db(scalar_one=None)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get(f"/api/v1/service-requests/catalog/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_get_catalog_item_success(self, client):
        item = make_catalog_item()
        mock_db = make_mock_db(scalar_one=item)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get(f"/api/v1/service-requests/catalog/{item.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == item.name
        assert data["category"] == "it_equipment"


class TestUpdateCatalogItem:
    def test_update_nonexistent_catalog_item_returns_404(self, client):
        mock_db = make_mock_db(scalar_one=None)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.put(
            f"/api/v1/service-requests/catalog/{uuid.uuid4()}",
            json={"is_active": False},
        )
        assert resp.status_code == 404


# ---- Fulfillment Task tests ----

class TestListFulfillmentTasks:
    def test_list_tasks_sr_not_found_returns_404(self, client):
        with patch(
            "app.api.v1.service_requests._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/service-requests/{uuid.uuid4()}/tasks")
        assert resp.status_code == 404

    def test_list_tasks_returns_200(self, client):
        sr = make_service_request()
        task = make_fulfillment_task(sr_id=sr.id)
        mock_db = make_mock_db(scalar_list=[task])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch(
            "app.api.v1.service_requests._service.get",
            new_callable=AsyncMock,
            return_value=sr,
        ):
            resp = client.get(f"/api/v1/service-requests/{sr.id}/tasks")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == task.title

    def test_list_tasks_empty(self, client):
        sr = make_service_request()
        mock_db = make_mock_db(scalar_list=[])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch(
            "app.api.v1.service_requests._service.get",
            new_callable=AsyncMock,
            return_value=sr,
        ):
            resp = client.get(f"/api/v1/service-requests/{sr.id}/tasks")
        assert resp.status_code == 200
        assert resp.json() == []


class TestCreateFulfillmentTask:
    def test_create_task_sr_not_found_returns_404(self, client):
        with patch(
            "app.api.v1.service_requests._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.post(
                f"/api/v1/service-requests/{uuid.uuid4()}/tasks",
                json={"title": "Provision device", "order": 0},
            )
        assert resp.status_code == 404

    def test_create_task_validation_requires_title(self, client):
        resp = client.post(
            f"/api/v1/service-requests/{uuid.uuid4()}/tasks",
            json={"order": 0},
        )
        assert resp.status_code == 422

    def test_create_task_success(self, client):
        sr = make_service_request()
        task = make_fulfillment_task(sr_id=sr.id)
        mock_db = make_mock_db()

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with (
            patch(
                "app.api.v1.service_requests._service.get",
                new_callable=AsyncMock,
                return_value=sr,
            ),
            patch("app.api.v1.service_requests.FulfillmentTask", return_value=task),
        ):
            resp = client.post(
                f"/api/v1/service-requests/{sr.id}/tasks",
                json={"title": "Provision device", "order": 0},
            )
        assert resp.status_code in (201, 200)


class TestUpdateFulfillmentTask:
    def test_update_task_not_found_returns_404(self, client):
        mock_db = make_mock_db(scalar_one=None)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.put(
            f"/api/v1/service-requests/{uuid.uuid4()}/tasks/{uuid.uuid4()}",
            json={"status": "in_progress"},
        )
        assert resp.status_code == 404

    def test_update_task_invalid_status(self, client):
        resp = client.put(
            f"/api/v1/service-requests/{uuid.uuid4()}/tasks/{uuid.uuid4()}",
            json={"status": "INVALID_STATUS"},
        )
        assert resp.status_code == 422
