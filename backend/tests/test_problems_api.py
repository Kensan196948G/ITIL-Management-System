import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.models.problem import ProblemPriority, ProblemStatus
from app.models.user import User


def make_user(role="agent"):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "agent@example.com"
    user.full_name = "Test Agent"
    user.role = MagicMock()
    user.role.name = role
    return user


def make_problem(
    status=ProblemStatus.OPEN,
    priority=ProblemPriority.P3_MEDIUM,
):
    p = MagicMock()
    p.id = uuid.uuid4()
    p.title = "Recurring DB timeouts"
    p.description = "Database times out under heavy load"
    p.status = status
    p.priority = priority
    p.reporter_id = uuid.uuid4()
    p.assignee_id = None
    p.root_cause = None
    p.workaround = None
    p.is_known_error = False
    p.resolved_at = None
    p.closed_at = None
    p.created_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    p.updated_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    p.status_logs = []
    p.linked_incidents = []
    return p


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


class TestCreateProblem:
    def test_create_returns_201(self, client):
        p = make_problem()
        with patch(
            "app.api.v1.problems._service.create_problem",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.post(
                "/api/v1/problems",
                json={
                    "title": "Recurring DB timeouts",
                    "description": "Database times out under heavy load",
                },
            )
        assert resp.status_code == 201

    def test_create_returns_problem_data(self, client):
        p = make_problem()
        with patch(
            "app.api.v1.problems._service.create_problem",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.post(
                "/api/v1/problems",
                json={
                    "title": "Recurring DB timeouts",
                    "description": "Database times out under heavy load",
                },
            )
        data = resp.json()
        assert data["title"] == "Recurring DB timeouts"
        assert data["status"] == "open"

    def test_create_requires_title(self, client):
        resp = client.post(
            "/api/v1/problems",
            json={"description": "No title"},
        )
        assert resp.status_code == 422

    def test_create_requires_description(self, client):
        resp = client.post(
            "/api/v1/problems",
            json={"title": "No description"},
        )
        assert resp.status_code == 422

    def test_create_with_priority(self, client):
        p = make_problem(priority=ProblemPriority.P1_CRITICAL)
        p.priority = ProblemPriority.P1_CRITICAL
        with patch(
            "app.api.v1.problems._service.create_problem",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.post(
                "/api/v1/problems",
                json={
                    "title": "Critical problem",
                    "description": "Very critical issue",
                    "priority": "p1_critical",
                },
            )
        assert resp.status_code == 201
        assert resp.json()["priority"] == "p1_critical"


class TestListProblems:
    def test_list_returns_200(self, client):
        p = make_problem()
        with patch(
            "app.api.v1.problems._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([p], 1),
        ):
            resp = client.get("/api/v1/problems")
        assert resp.status_code == 200

    def test_list_returns_paginated_response(self, client):
        p = make_problem()
        with patch(
            "app.api.v1.problems._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([p], 1),
        ):
            resp = client.get("/api/v1/problems")
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 1

    def test_list_accepts_status_filter(self, client):
        with patch(
            "app.api.v1.problems._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_method:
            client.get("/api/v1/problems?status=open")
        call_kwargs = mock_method.call_args.kwargs
        assert call_kwargs["status"] == ProblemStatus.OPEN

    def test_list_accepts_priority_filter(self, client):
        with patch(
            "app.api.v1.problems._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_method:
            client.get("/api/v1/problems?priority=p1_critical")
        call_kwargs = mock_method.call_args.kwargs
        assert call_kwargs["priority"] == ProblemPriority.P1_CRITICAL

    def test_list_accepts_is_known_error_filter(self, client):
        with patch(
            "app.api.v1.problems._service.get_multi_filtered",
            new_callable=AsyncMock,
            return_value=([], 0),
        ) as mock_method:
            client.get("/api/v1/problems?is_known_error=true")
        call_kwargs = mock_method.call_args.kwargs
        assert call_kwargs["is_known_error"] is True


class TestGetProblem:
    def test_get_returns_200(self, client):
        p = make_problem()
        with patch(
            "app.api.v1.problems._service.get_with_details",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.get(f"/api/v1/problems/{p.id}")
        assert resp.status_code == 200

    def test_get_returns_404_when_missing(self, client):
        with patch(
            "app.api.v1.problems._service.get_with_details",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/problems/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_get_includes_status_logs(self, client):
        p = make_problem()
        with patch(
            "app.api.v1.problems._service.get_with_details",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.get(f"/api/v1/problems/{p.id}")
        data = resp.json()
        assert "status_logs" in data
        assert "linked_incidents" in data


class TestUpdateProblem:
    def test_update_returns_200(self, client):
        p = make_problem()
        with patch(
            "app.api.v1.problems._service.get",
            new_callable=AsyncMock,
            return_value=p,
        ):
            with patch(
                "app.api.v1.problems._service.update",
                new_callable=AsyncMock,
                return_value=p,
            ):
                resp = client.put(
                    f"/api/v1/problems/{p.id}",
                    json={"root_cause": "Memory leak in DB connection pool"},
                )
        assert resp.status_code == 200

    def test_update_returns_404_when_missing(self, client):
        with patch(
            "app.api.v1.problems._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.put(
                f"/api/v1/problems/{uuid.uuid4()}",
                json={"root_cause": "Memory leak"},
            )
        assert resp.status_code == 404


class TestTransitionProblem:
    def test_transition_returns_200(self, client):
        p = make_problem(status=ProblemStatus.UNDER_INVESTIGATION)
        with patch(
            "app.api.v1.problems._service.transition_status",
            new_callable=AsyncMock,
            return_value=p,
        ):
            with patch(
                "app.api.v1.problems._service.get_with_details",
                new_callable=AsyncMock,
                return_value=p,
            ):
                resp = client.post(
                    f"/api/v1/problems/{p.id}/transition",
                    json={"to_status": "under_investigation"},
                )
        assert resp.status_code == 200

    def test_transition_requires_to_status(self, client):
        resp = client.post(
            f"/api/v1/problems/{uuid.uuid4()}/transition",
            json={"comment": "No status"},
        )
        assert resp.status_code == 422


class TestGetAllowedTransitions:
    def test_returns_transitions_for_open(self, client):
        p = make_problem(status=ProblemStatus.OPEN)
        with patch(
            "app.api.v1.problems._service.get",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.get(f"/api/v1/problems/{p.id}/transitions")
        assert resp.status_code == 200
        transitions = resp.json()
        assert "under_investigation" in transitions

    def test_returns_404_when_missing(self, client):
        with patch(
            "app.api.v1.problems._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/problems/{uuid.uuid4()}/transitions")
        assert resp.status_code == 404


class TestLinkIncident:
    def test_link_incident_returns_200(self, client):
        p = make_problem()
        incident_id = uuid.uuid4()
        with patch(
            "app.api.v1.problems._service.link_incident",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.post(
                f"/api/v1/problems/{p.id}/link-incident",
                json={"incident_id": str(incident_id)},
            )
        assert resp.status_code == 200

    def test_link_incident_requires_incident_id(self, client):
        resp = client.post(
            f"/api/v1/problems/{uuid.uuid4()}/link-incident",
            json={},
        )
        assert resp.status_code == 422


class TestUnlinkIncident:
    def test_unlink_incident_returns_200(self, client):
        p = make_problem()
        incident_id = uuid.uuid4()
        with patch(
            "app.api.v1.problems._service.unlink_incident",
            new_callable=AsyncMock,
            return_value=p,
        ):
            resp = client.delete(
                f"/api/v1/problems/{p.id}/unlink-incident/{incident_id}",
            )
        assert resp.status_code == 200
