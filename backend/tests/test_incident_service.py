import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.incident import Incident, IncidentPriority, IncidentStatus, IncidentStatusLog
from app.core.errors import ConflictError, NotFoundError
from app.services.incident_service import IncidentService


def make_uuid():
    return uuid.uuid4()


def make_incident(
    status=IncidentStatus.NEW,
    priority=IncidentPriority.P3_MEDIUM,
    assignee_id=None,
):
    inc = MagicMock(spec=Incident)
    inc.id = make_uuid()
    inc.status = status
    inc.priority = priority
    inc.assignee_id = assignee_id
    inc.sla_due_at = datetime(2026, 12, 31, tzinfo=timezone.utc)
    inc.resolved_at = None
    inc.closed_at = None
    return inc


class TestIncidentServiceCreateIncident:
    @pytest.fixture
    def service(self):
        return IncidentService()

    async def test_creates_with_new_status_when_no_assignee(self, service):
        db = AsyncMock()
        reporter_id = make_uuid()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        with patch("app.services.incident_service.SLAService.compute_due_at") as mock_sla:
            mock_sla.return_value = datetime(2026, 12, 31, tzinfo=timezone.utc)
            await service.create_incident(
                db,
                title="Test Incident",
                description="A test incident",
                priority=IncidentPriority.P3_MEDIUM,
                reporter_id=reporter_id,
            )

        incidents = [o for o in added_objects if isinstance(o, Incident)]
        assert len(incidents) == 1
        assert incidents[0].status == IncidentStatus.NEW
        assert incidents[0].assignee_id is None
        assert db.flush.called

    async def test_creates_with_assigned_status_when_assignee_given(self, service):
        db = AsyncMock()
        reporter_id = make_uuid()
        assignee_id = make_uuid()

        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))

        with patch("app.services.incident_service.SLAService.compute_due_at") as mock_sla:
            mock_sla.return_value = datetime(2026, 12, 31, tzinfo=timezone.utc)
            await service.create_incident(
                db,
                title="Test",
                description="desc",
                priority=IncidentPriority.P2_HIGH,
                reporter_id=reporter_id,
                assignee_id=assignee_id,
            )

        incidents = [o for o in added_objects if isinstance(o, Incident)]
        assert len(incidents) == 1
        assert incidents[0].status == IncidentStatus.ASSIGNED
        assert incidents[0].assignee_id == assignee_id

    async def test_creates_status_log_on_creation(self, service):
        db = AsyncMock()
        reporter_id = make_uuid()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        with patch("app.services.incident_service.SLAService.compute_due_at") as mock_sla:
            mock_sla.return_value = datetime(2026, 12, 31, tzinfo=timezone.utc)
            await service.create_incident(
                db,
                title="Test",
                description="desc",
                priority=IncidentPriority.P3_MEDIUM,
                reporter_id=reporter_id,
            )

        logs = [o for o in added_objects if isinstance(o, IncidentStatusLog)]
        assert len(logs) == 1
        assert logs[0].from_status is None
        assert logs[0].to_status == IncidentStatus.NEW


class TestIncidentServiceTransitionStatus:
    @pytest.fixture
    def service(self):
        return IncidentService()

    async def test_raises_not_found_when_incident_missing(self, service):
        db = AsyncMock()
        with patch.object(service, "get", new_callable=AsyncMock, return_value=None):
            with pytest.raises(NotFoundError):
                await service.transition_status(
                    db,
                    incident_id=make_uuid(),
                    to_status=IncidentStatus.IN_PROGRESS,
                    changed_by_id=make_uuid(),
                )

    async def test_raises_conflict_on_invalid_transition(self, service):
        db = AsyncMock()
        incident = make_incident(status=IncidentStatus.CLOSED)
        with patch.object(service, "get", new_callable=AsyncMock, return_value=incident):
            with pytest.raises(ConflictError):
                await service.transition_status(
                    db,
                    incident_id=incident.id,
                    to_status=IncidentStatus.NEW,
                    changed_by_id=make_uuid(),
                )

    async def test_sets_resolved_at_when_resolving(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        incident = make_incident(status=IncidentStatus.IN_PROGRESS)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=incident):
            await service.transition_status(
                db,
                incident_id=incident.id,
                to_status=IncidentStatus.RESOLVED,
                changed_by_id=make_uuid(),
            )
        assert incident.status == IncidentStatus.RESOLVED
        assert incident.resolved_at is not None

    async def test_sets_closed_at_when_closing(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        incident = make_incident(status=IncidentStatus.RESOLVED)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=incident):
            await service.transition_status(
                db,
                incident_id=incident.id,
                to_status=IncidentStatus.CLOSED,
                changed_by_id=make_uuid(),
            )
        assert incident.closed_at is not None

    async def test_creates_status_log(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        incident = make_incident(status=IncidentStatus.IN_PROGRESS)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=incident):
            await service.transition_status(
                db,
                incident_id=incident.id,
                to_status=IncidentStatus.RESOLVED,
                changed_by_id=make_uuid(),
                comment="Fixed",
            )

        logs = [o for o in added_objects if isinstance(o, IncidentStatusLog)]
        assert len(logs) == 1
        assert logs[0].to_status == IncidentStatus.RESOLVED
        assert logs[0].comment == "Fixed"


class TestIncidentServiceAssign:
    @pytest.fixture
    def service(self):
        return IncidentService()

    async def test_raises_not_found_when_missing(self, service):
        db = AsyncMock()
        with patch.object(service, "get", new_callable=AsyncMock, return_value=None):
            with pytest.raises(NotFoundError):
                await service.assign(
                    db,
                    incident_id=make_uuid(),
                    assignee_id=make_uuid(),
                    changed_by_id=make_uuid(),
                )

    async def test_transitions_new_to_assigned(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        incident = make_incident(status=IncidentStatus.NEW)
        assignee_id = make_uuid()

        with patch.object(service, "get", new_callable=AsyncMock, return_value=incident):
            with patch.object(
                service, "transition_status", new_callable=AsyncMock, return_value=incident
            ) as mock_transition:
                await service.assign(
                    db,
                    incident_id=incident.id,
                    assignee_id=assignee_id,
                    changed_by_id=make_uuid(),
                )
                mock_transition.assert_awaited_once()

    async def test_updates_assignee_without_transition_when_in_progress(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        incident = make_incident(status=IncidentStatus.IN_PROGRESS)
        assignee_id = make_uuid()

        with patch.object(service, "get", new_callable=AsyncMock, return_value=incident):
            await service.assign(
                db,
                incident_id=incident.id,
                assignee_id=assignee_id,
                changed_by_id=make_uuid(),
            )
        assert incident.assignee_id == assignee_id
