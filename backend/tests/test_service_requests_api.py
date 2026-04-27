import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.models.service_request import ServiceRequestCategory, ServiceRequestStatus
from app.models.user import User


def make_user(role="agent"):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "agent@example.com"
    user.full_name = "Test Agent"
    user.role = MagicMock()
    user.role.name = role
    return user


def make_service_request(
    status=ServiceRequestStatus.SUBMITTED,
    category=ServiceRequestCategory.OTHER,
):
    sr = MagicMock()
    sr.id = uuid.uuid4()
    sr.title = "Test Service Request"
    sr.description = "A test service request"
    sr.status = status
    sr.category = category
    sr.requester_id = uuid.uuid4()
    sr.approver_id = None
    sr.assignee_id = None
    sr.due_date = None
    sr.approved_at = None
    sr.rejected_at = None
    sr.completed_at = None
    sr.catalog_item_id = None
    sr.rejection_reason = None
    sr.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    sr.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    sr.status_logs = []
    return sr


AGENT_USER = make_user("agent")


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


class TestCreateServiceRequest:
    def test_create_returns_201(self, client):
        sr = make_service_request()
        with patch(
            "app.api.v1.service_requests._service.create_service_request",
            new_callable=AsyncMock,
            return_value=sr,
        ):
            resp = client.post(
                "/api/v1/service-requests",
                json={
                    "title": "New Laptop",
                    "description": "Need a new laptop for development",
                    "category": "it_equipment",
                },
            )
        assert resp.status_code == 201

    def test_create_requires_title(self, client):
        resp = client.post(
            "/api/v1/service-requests",
            json={"description": "desc", "category": "other"},
        )
        assert resp.status_code == 422

    def test_create_requires_description(self, client):
        resp = client.post(
            "/api/v1/service-requests",
            json={"title": "Test", "category": "other"},
        )
        assert resp.status_code == 422

    def test_create_with_invalid_category_returns_422(self, client):
        resp = client.post(
            "/api/v1/service-requests",
            json={"title": "Test", "description": "desc", "category": "invalid_category"},
        )
        assert resp.status_code == 422


class TestListServiceRequests:
    def test_list_returns_200(self, client):
        with patch(
            "app.api.v1.service_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ):
            resp = client.get("/api/v1/service-requests")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] == 0

    def test_list_with_status_filter(self, client):
        sr = make_service_request(status=ServiceRequestStatus.APPROVED)
        with patch(
            "app.api.v1.service_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([sr], 1),
        ):
            resp = client.get("/api/v1/service-requests?status=approved")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_list_with_category_filter(self, client):
        with patch(
            "app.api.v1.service_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ):
            resp = client.get("/api/v1/service-requests?category=software_access")
        assert resp.status_code == 200


class TestGetServiceRequest:
    def test_get_returns_200(self, client):
        sr = make_service_request()
        with patch(
            "app.api.v1.service_requests._service.get_with_logs",
            new_callable=AsyncMock,
            return_value=sr,
        ):
            resp = client.get(f"/api/v1/service-requests/{sr.id}")
        assert resp.status_code == 200

    def test_get_returns_404_when_not_found(self, client):
        with patch(
            "app.api.v1.service_requests._service.get_with_logs",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/service-requests/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestApproveServiceRequest:
    def test_approve_returns_200(self, client):
        sr = make_service_request(status=ServiceRequestStatus.APPROVED)
        with patch(
            "app.api.v1.service_requests._service.transition_status",
            new_callable=AsyncMock,
            return_value=sr,
        ):
            with patch(
                "app.api.v1.service_requests._service.get_with_logs",
                new_callable=AsyncMock,
                return_value=sr,
            ):
                resp = client.post(
                    f"/api/v1/service-requests/{sr.id}/approve",
                    json={"comment": "Approved"},
                )
        assert resp.status_code == 200

    def test_reject_returns_200(self, client):
        sr = make_service_request(status=ServiceRequestStatus.REJECTED)
        with patch(
            "app.api.v1.service_requests._service.transition_status",
            new_callable=AsyncMock,
            return_value=sr,
        ):
            with patch(
                "app.api.v1.service_requests._service.get_with_logs",
                new_callable=AsyncMock,
                return_value=sr,
            ):
                resp = client.post(
                    f"/api/v1/service-requests/{sr.id}/reject",
                    json={"rejection_reason": "Budget not approved"},
                )
        assert resp.status_code == 200

    def test_reject_requires_rejection_reason(self, client):
        sr_id = uuid.uuid4()
        resp = client.post(
            f"/api/v1/service-requests/{sr_id}/reject",
            json={},
        )
        assert resp.status_code == 422


class TestGetAllowedTransitions:
    def test_returns_transitions_for_submitted(self, client):
        sr = make_service_request(status=ServiceRequestStatus.SUBMITTED)
        with patch(
            "app.api.v1.service_requests._service.get",
            new_callable=AsyncMock,
            return_value=sr,
        ):
            resp = client.get(f"/api/v1/service-requests/{sr.id}/transitions")
        assert resp.status_code == 200
        transitions = resp.json()
        assert "approved" in transitions or "pending_approval" in transitions
