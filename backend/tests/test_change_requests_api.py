import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.models.change_request import (
    ChangeRequestPriority,
    ChangeRequestRisk,
    ChangeRequestStatus,
    ChangeRequestType,
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


def make_change_request(
    status=ChangeRequestStatus.DRAFT,
    change_type=ChangeRequestType.NORMAL,
):
    cr = MagicMock()
    cr.id = uuid.uuid4()
    cr.title = "Deploy new service"
    cr.description = "Rolling deploy of microservice v2"
    cr.status = status
    cr.change_type = change_type
    cr.risk_level = ChangeRequestRisk.MEDIUM
    cr.priority = ChangeRequestPriority.MEDIUM
    cr.requester_id = uuid.uuid4()
    cr.reviewer_id = None
    cr.approver_id = None
    cr.implementer_id = None
    cr.planned_start_at = None
    cr.planned_end_at = None
    cr.actual_start_at = None
    cr.actual_end_at = None
    cr.approved_at = None
    cr.rejected_at = None
    cr.completed_at = None
    cr.rejection_reason = None
    cr.rollback_plan = None
    cr.schedule = None
    cr.created_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    cr.updated_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    cr.status_logs = []
    return cr


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


class TestCreateChangeRequest:
    def test_create_returns_201(self, client):
        cr = make_change_request()
        with patch(
            "app.api.v1.change_requests._service.create_change_request",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.post(
                "/api/v1/change-requests",
                json={
                    "title": "Deploy new service",
                    "description": "Rolling deploy of microservice v2",
                    "change_type": "normal",
                    "risk_level": "medium",
                    "priority": "medium",
                },
            )
        assert resp.status_code == 201

    def test_create_returns_change_request_data(self, client):
        cr = make_change_request()
        with patch(
            "app.api.v1.change_requests._service.create_change_request",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.post(
                "/api/v1/change-requests",
                json={
                    "title": "Deploy new service",
                    "description": "Rolling deploy of microservice v2",
                },
            )
        data = resp.json()
        assert data["title"] == "Deploy new service"
        assert data["status"] == "draft"

    def test_create_requires_title(self, client):
        resp = client.post(
            "/api/v1/change-requests",
            json={"description": "No title"},
        )
        assert resp.status_code == 422

    def test_create_requires_description(self, client):
        resp = client.post(
            "/api/v1/change-requests",
            json={"title": "No description"},
        )
        assert resp.status_code == 422


class TestListChangeRequests:
    def test_list_returns_200(self, client):
        cr = make_change_request()
        with patch(
            "app.api.v1.change_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([cr], 1),
        ):
            resp = client.get("/api/v1/change-requests")
        assert resp.status_code == 200

    def test_list_returns_paginated_response(self, client):
        cr = make_change_request()
        with patch(
            "app.api.v1.change_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([cr], 1),
        ):
            resp = client.get("/api/v1/change-requests")
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1

    def test_list_accepts_status_filter(self, client):
        with patch(
            "app.api.v1.change_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_method:
            client.get("/api/v1/change-requests?status=draft")
        call_kwargs = mock_method.call_args.kwargs
        assert call_kwargs["status"] == ChangeRequestStatus.DRAFT

    def test_list_accepts_change_type_filter(self, client):
        with patch(
            "app.api.v1.change_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_method:
            client.get("/api/v1/change-requests?change_type=emergency")
        call_kwargs = mock_method.call_args.kwargs
        assert call_kwargs["change_type"] == ChangeRequestType.EMERGENCY

    def test_list_accepts_risk_level_filter(self, client):
        with patch(
            "app.api.v1.change_requests._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_method:
            client.get("/api/v1/change-requests?risk_level=high")
        call_kwargs = mock_method.call_args.kwargs
        assert call_kwargs["risk_level"] == ChangeRequestRisk.HIGH


class TestGetChangeRequest:
    def test_get_returns_200(self, client):
        cr = make_change_request()
        with patch(
            "app.api.v1.change_requests._service.get_with_logs",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}")
        assert resp.status_code == 200

    def test_get_returns_404_when_missing(self, client):
        with patch(
            "app.api.v1.change_requests._service.get_with_logs",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/change-requests/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_get_includes_status_logs(self, client):
        cr = make_change_request()
        cr.status_logs = []
        with patch(
            "app.api.v1.change_requests._service.get_with_logs",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}")
        data = resp.json()
        assert "status_logs" in data


class TestApproveChangeRequest:
    def test_approve_returns_200(self, client):
        cr = make_change_request(status=ChangeRequestStatus.APPROVED)
        with patch(
            "app.api.v1.change_requests._service.transition_status",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            with patch(
                "app.api.v1.change_requests._service.get_with_logs",
                new_callable=AsyncMock,
                return_value=cr,
            ):
                resp = client.post(
                    f"/api/v1/change-requests/{cr.id}/approve",
                    json={"comment": "Approved by CAB"},
                )
        assert resp.status_code == 200

    def test_reject_requires_reason(self, client):
        resp = client.post(
            f"/api/v1/change-requests/{uuid.uuid4()}/reject",
            json={},
        )
        assert resp.status_code == 422

    def test_reject_returns_200_with_reason(self, client):
        cr = make_change_request(status=ChangeRequestStatus.REJECTED)
        with patch(
            "app.api.v1.change_requests._service.transition_status",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            with patch(
                "app.api.v1.change_requests._service.get_with_logs",
                new_callable=AsyncMock,
                return_value=cr,
            ):
                resp = client.post(
                    f"/api/v1/change-requests/{cr.id}/reject",
                    json={"rejection_reason": "Budget constraints"},
                )
        assert resp.status_code == 200


class TestTransitionChangeRequest:
    def test_transition_returns_200(self, client):
        cr = make_change_request(status=ChangeRequestStatus.SUBMITTED)
        with patch(
            "app.api.v1.change_requests._service.transition_status",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            with patch(
                "app.api.v1.change_requests._service.get_with_logs",
                new_callable=AsyncMock,
                return_value=cr,
            ):
                resp = client.post(
                    f"/api/v1/change-requests/{cr.id}/transition",
                    json={"to_status": "under_review", "comment": "Moving to CAB"},
                )
        assert resp.status_code == 200

    def test_transition_requires_to_status(self, client):
        resp = client.post(
            f"/api/v1/change-requests/{uuid.uuid4()}/transition",
            json={"comment": "No status specified"},
        )
        assert resp.status_code == 422


class TestGetAllowedTransitions:
    def test_get_transitions_returns_200(self, client):
        cr = make_change_request(status=ChangeRequestStatus.DRAFT)
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}/transitions")
        assert resp.status_code == 200

    def test_draft_transitions_include_submitted(self, client):
        cr = make_change_request(status=ChangeRequestStatus.DRAFT)
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}/transitions")
        data = resp.json()
        assert "submitted" in data

    def test_get_transitions_returns_404_when_missing(self, client):
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/change-requests/{uuid.uuid4()}/transitions")
        assert resp.status_code == 404
