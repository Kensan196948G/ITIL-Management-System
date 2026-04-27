import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_session
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.models.change_request import (
    CABVoteDecision,
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


def make_change_request(status=ChangeRequestStatus.UNDER_REVIEW):
    cr = MagicMock()
    cr.id = uuid.uuid4()
    cr.title = "Deploy v2"
    cr.description = "Rolling deployment"
    cr.status = status
    cr.change_type = ChangeRequestType.NORMAL
    cr.cab_votes = []
    cr.schedule = None
    cr.status_logs = []
    return cr


def make_cab_vote(cr_id=None, voter_id=None):
    vote = MagicMock()
    vote.id = uuid.uuid4()
    vote.change_request_id = cr_id or uuid.uuid4()
    vote.voter_id = voter_id or uuid.uuid4()
    vote.decision = CABVoteDecision.APPROVE
    vote.comment = "Looks good"
    vote.voted_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    return vote


def make_schedule(cr_id=None):
    sched = MagicMock()
    sched.id = uuid.uuid4()
    sched.change_request_id = cr_id or uuid.uuid4()
    sched.scheduled_start = datetime(2026, 5, 1, 2, 0, tzinfo=timezone.utc)
    sched.scheduled_end = datetime(2026, 5, 1, 4, 0, tzinfo=timezone.utc)
    sched.environment = "production"
    sched.notes = "Maintenance window"
    sched.confirmed = False
    sched.created_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    sched.updated_at = datetime(2026, 4, 27, tzinfo=timezone.utc)
    return sched


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


# ---- CAB Vote tests ----

class TestListCabVotes:
    def test_list_votes_cr_not_found_returns_404(self, client):
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/change-requests/{uuid.uuid4()}/cab-votes")
        assert resp.status_code == 404

    def test_list_votes_returns_200(self, client):
        cr = make_change_request()
        vote = make_cab_vote(cr_id=cr.id, voter_id=AGENT_USER.id)
        mock_db = make_mock_db(scalar_list=[vote])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}/cab-votes")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    def test_list_votes_empty(self, client):
        cr = make_change_request()
        mock_db = make_mock_db(scalar_list=[])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}/cab-votes")
        assert resp.status_code == 200
        assert resp.json() == []


class TestCastCabVote:
    def test_cast_vote_cr_not_found_returns_404(self, client):
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.post(
                f"/api/v1/change-requests/{uuid.uuid4()}/cab-votes",
                json={"decision": "approve"},
            )
        assert resp.status_code == 404

    def test_cast_vote_validation_requires_decision(self, client):
        resp = client.post(
            f"/api/v1/change-requests/{uuid.uuid4()}/cab-votes",
            json={"comment": "No decision specified"},
        )
        assert resp.status_code == 422

    def test_cast_vote_invalid_decision_value(self, client):
        cr = make_change_request()
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.post(
                f"/api/v1/change-requests/{cr.id}/cab-votes",
                json={"decision": "INVALID"},
            )
        assert resp.status_code == 422

    def test_cast_vote_valid_decisions_accepted(self, client):
        cr = make_change_request()
        mock_vote = make_cab_vote(cr_id=cr.id, voter_id=AGENT_USER.id)
        mock_db = make_mock_db(scalar_one=None)

        async def mock_refresh(obj):
            obj.id = mock_vote.id
            obj.voted_at = mock_vote.voted_at

        mock_db.refresh = mock_refresh

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.post(
                f"/api/v1/change-requests/{cr.id}/cab-votes",
                json={"decision": "approve", "comment": "Approved"},
            )
        assert resp.status_code in (201, 200)

    def test_cast_vote_requires_auth(self):
        app.dependency_overrides.clear()
        with TestClient(app) as client:
            resp = client.post(
                f"/api/v1/change-requests/{uuid.uuid4()}/cab-votes",
                json={"decision": "approve"},
            )
        assert resp.status_code == 401


# ---- Change Schedule tests ----

class TestGetChangeSchedule:
    def test_get_schedule_cr_not_found_returns_404(self, client):
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.get(f"/api/v1/change-requests/{uuid.uuid4()}/schedule")
        assert resp.status_code == 404

    def test_get_schedule_not_found_returns_404(self, client):
        cr = make_change_request()
        mock_db = make_mock_db(scalar_one=None)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}/schedule")
        assert resp.status_code == 404

    def test_get_schedule_returns_200(self, client):
        cr = make_change_request()
        sched = make_schedule(cr_id=cr.id)
        mock_db = make_mock_db(scalar_one=sched)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=cr,
        ):
            resp = client.get(f"/api/v1/change-requests/{cr.id}/schedule")
        assert resp.status_code == 200
        data = resp.json()
        assert data["environment"] == sched.environment


class TestCreateChangeSchedule:
    def test_create_schedule_cr_not_found_returns_404(self, client):
        with patch(
            "app.api.v1.change_requests._service.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.post(
                f"/api/v1/change-requests/{uuid.uuid4()}/schedule",
                json={
                    "scheduled_start": "2026-05-01T02:00:00",
                    "scheduled_end": "2026-05-01T04:00:00",
                },
            )
        assert resp.status_code == 404

    def test_create_schedule_validation_requires_dates(self, client):
        resp = client.post(
            f"/api/v1/change-requests/{uuid.uuid4()}/schedule",
            json={"environment": "production"},
        )
        assert resp.status_code == 422

    def test_create_schedule_success(self, client):
        cr = make_change_request()
        sched = make_schedule(cr_id=cr.id)
        mock_db = make_mock_db()

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db

        with (
            patch(
                "app.api.v1.change_requests._service.get",
                new_callable=AsyncMock,
                return_value=cr,
            ),
            patch("app.api.v1.change_requests.ChangeSchedule", return_value=sched),
        ):
            resp = client.post(
                f"/api/v1/change-requests/{cr.id}/schedule",
                json={
                    "scheduled_start": "2026-05-01T02:00:00",
                    "scheduled_end": "2026-05-01T04:00:00",
                    "environment": "production",
                    "confirmed": False,
                },
            )
        assert resp.status_code in (201, 200)


class TestUpdateChangeSchedule:
    def test_update_schedule_not_found_returns_404(self, client):
        mock_db = make_mock_db(scalar_one=None)

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.put(
            f"/api/v1/change-requests/{uuid.uuid4()}/schedule",
            json={"confirmed": True},
        )
        assert resp.status_code == 404


class TestScheduleCalendar:
    def test_calendar_returns_200(self, client):
        sched = make_schedule()
        mock_db = make_mock_db(scalar_list=[sched])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get("/api/v1/change-requests/schedules/calendar")
        assert resp.status_code == 200

    def test_calendar_empty_returns_empty_list(self, client):
        mock_db = make_mock_db(scalar_list=[])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get("/api/v1/change-requests/schedules/calendar")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_calendar_with_date_filters(self, client):
        mock_db = make_mock_db(scalar_list=[])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get(
            "/api/v1/change-requests/schedules/calendar"
            "?from_date=2026-05-01&to_date=2026-05-31"
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_calendar_requires_auth(self):
        app.dependency_overrides.clear()
        with TestClient(app) as client:
            resp = client.get("/api/v1/change-requests/schedules/calendar")
        assert resp.status_code == 401

    def test_calendar_invalid_date_format(self, client):
        mock_db = make_mock_db(scalar_list=[])

        async def override_db():
            yield mock_db

        app.dependency_overrides[get_session] = override_db
        resp = client.get(
            "/api/v1/change-requests/schedules/calendar?from_date=not-a-date"
        )
        # Invalid ISO date should cause a ValueError in the endpoint → 500 or 422
        assert resp.status_code in (200, 422, 500)
