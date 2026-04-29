import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.models.incident import IncidentPriority, IncidentStatus
from app.models.user import User


def make_user(role="agent"):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "agent@example.com"
    user.full_name = "Test Agent"
    user.role = MagicMock()
    user.role.name = role
    return user


def make_incident(
    status=IncidentStatus.NEW,
    priority=IncidentPriority.P3_MEDIUM,
):
    inc = MagicMock()
    inc.id = uuid.uuid4()
    inc.title = "Test Incident"
    inc.description = "A test incident"
    inc.status = status
    inc.priority = priority
    inc.category = None
    inc.subcategory = None
    inc.reporter_id = uuid.uuid4()
    inc.assignee_id = None
    inc.sla_due_at = datetime(2026, 12, 31, tzinfo=timezone.utc)
    inc.resolved_at = None
    inc.closed_at = None
    inc.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    inc.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    inc.status_logs = []
    return inc


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


class TestCreateIncident:
    def test_create_returns_201(self, client):
        incident = make_incident()
        with patch(
            "app.api.v1.incidents._service.create_incident",
            new_callable=AsyncMock,
            return_value=incident,
        ):
            resp = client.post(
                "/api/v1/incidents",
                json={
                    "title": "Test Incident",
                    "description": "A test incident",
                    "priority": "p3_medium",
                },
            )
        assert resp.status_code == 201

    def test_create_returns_incident_data(self, client):
        incident = make_incident()
        with patch(
            "app.api.v1.incidents._service.create_incident",
            new_callable=AsyncMock,
            return_value=incident,
        ):
            resp = client.post(
                "/api/v1/incidents",
                json={
                    "title": "Test Incident",
                    "description": "A test incident",
                },
            )
        data = resp.json()
        assert data["title"] == "Test Incident"
        assert data["status"] == "new"

    def test_create_requires_title(self, client):
        resp = client.post(
            "/api/v1/incidents",
            json={"description": "No title"},
        )
        assert resp.status_code == 422


class TestListIncidents:
    def test_list_returns_200(self, client):
        incident = make_incident()
        with patch(
            "app.api.v1.incidents._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([incident], 1),
        ):
            resp = client.get("/api/v1/incidents")
        assert resp.status_code == 200

    def test_list_returns_paginated(self, client):
        incident = make_incident()
        with patch(
            "app.api.v1.incidents._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([incident], 1),
        ):
            resp = client.get("/api/v1/incidents")
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1

    def test_list_accepts_status_filter(self, client):
        with patch(
            "app.api.v1.incidents._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_method:
            client.get("/api/v1/incidents?status=new")
        call_kwargs = mock_method.call_args.kwargs
        assert call_kwargs["status"] == IncidentStatus.NEW


class TestGetIncident:
    def test_get_returns_200(self, client):
        incident = make_incident()
        with patch(
            "app.api.v1.incidents._service.get_with_logs",
            new_callable=AsyncMock,
            return_value=incident,
        ):
            resp = client.get(f"/api/v1/incidents/{incident.id}")
        assert resp.status_code == 200

    def test_get_returns_404_when_missing(self, client):
        with patch(
            "app.api.v1.incidents._service.get_with_logs",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/incidents/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestTransitionIncident:
    def test_transition_returns_200(self, client):
        incident = make_incident(status=IncidentStatus.IN_PROGRESS)
        with patch(
            "app.api.v1.incidents._service.transition_status",
            new_callable=AsyncMock,
            return_value=incident,
        ):
            with patch(
                "app.api.v1.incidents._service.get_with_logs",
                new_callable=AsyncMock,
                return_value=incident,
            ):
                resp = client.post(
                    f"/api/v1/incidents/{incident.id}/transition",
                    json={"to_status": "resolved", "comment": "Fixed"},
                )
        assert resp.status_code == 200

    def test_transition_invalid_status_returns_422(self, client):
        resp = client.post(
            f"/api/v1/incidents/{uuid.uuid4()}/transition",
            json={"to_status": "invalid_status"},
        )
        assert resp.status_code == 422


class TestAssignIncident:
    def test_assign_returns_200(self, client):
        incident = make_incident()
        assignee_id = uuid.uuid4()
        with patch(
            "app.api.v1.incidents._service.assign",
            new_callable=AsyncMock,
            return_value=incident,
        ):
            resp = client.post(
                f"/api/v1/incidents/{incident.id}/assign",
                json={"assignee_id": str(assignee_id)},
            )
        assert resp.status_code == 200


class TestSLAStatus:
    def test_sla_returns_200(self, client):
        incident = make_incident()
        with patch(
            "app.api.v1.incidents._service.get",
            new_callable=AsyncMock,
            return_value=incident,
        ):
            resp = client.get(f"/api/v1/incidents/{incident.id}/sla")
        assert resp.status_code == 200
        data = resp.json()
        assert "is_overdue" in data
        assert "remaining_minutes" in data

    def test_sla_returns_404_when_missing(self, client):
        with patch(
            "app.api.v1.incidents._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/incidents/{uuid.uuid4()}/sla")
        assert resp.status_code == 404


class TestAllowedTransitions:
    def test_transitions_endpoint_returns_list(self, client):
        incident = make_incident(status=IncidentStatus.NEW)
        with patch(
            "app.api.v1.incidents._service.get",
            new_callable=AsyncMock,
            return_value=incident,
        ):
            resp = client.get(f"/api/v1/incidents/{incident.id}/transitions")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert "assigned" in data or "in_progress" in data
