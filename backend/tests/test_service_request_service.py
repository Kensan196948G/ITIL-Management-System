import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.service_request import (
    ServiceRequest,
    ServiceRequestCategory,
    ServiceRequestStatus,
    ServiceRequestStatusLog,
)
from app.core.errors import ConflictError, NotFoundError
from app.services.service_request_service import ServiceRequestService


def make_uuid():
    return uuid.uuid4()


def make_service_request(
    status=ServiceRequestStatus.SUBMITTED,
    category=ServiceRequestCategory.OTHER,
):
    sr = MagicMock(spec=ServiceRequest)
    sr.id = make_uuid()
    sr.status = status
    sr.category = category
    sr.approved_at = None
    sr.rejected_at = None
    sr.completed_at = None
    sr.approver_id = None
    sr.assignee_id = None
    sr.rejection_reason = None
    return sr


class TestServiceRequestServiceCreate:
    @pytest.fixture
    def service(self):
        return ServiceRequestService()

    async def test_creates_with_submitted_status(self, service):
        db = AsyncMock()
        requester_id = make_uuid()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.create_service_request(
            db,
            title="Test Service Request",
            description="A test service request",
            category=ServiceRequestCategory.IT_EQUIPMENT,
            requester_id=requester_id,
        )

        requests = [o for o in added_objects if isinstance(o, ServiceRequest)]
        assert len(requests) == 1
        assert requests[0].status == ServiceRequestStatus.SUBMITTED
        assert requests[0].requester_id == requester_id

    async def test_creates_status_log_on_creation(self, service):
        db = AsyncMock()
        requester_id = make_uuid()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.create_service_request(
            db,
            title="Test",
            description="desc",
            category=ServiceRequestCategory.SOFTWARE_ACCESS,
            requester_id=requester_id,
        )

        logs = [o for o in added_objects if isinstance(o, ServiceRequestStatusLog)]
        assert len(logs) == 1
        assert logs[0].from_status is None
        assert logs[0].to_status == ServiceRequestStatus.SUBMITTED

    async def test_creates_with_due_date(self, service):
        db = AsyncMock()
        requester_id = make_uuid()
        due_date = datetime(2026, 12, 31, tzinfo=timezone.utc)

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.create_service_request(
            db,
            title="Test",
            description="desc",
            category=ServiceRequestCategory.OTHER,
            requester_id=requester_id,
            due_date=due_date,
        )

        requests = [o for o in added_objects if isinstance(o, ServiceRequest)]
        assert requests[0].due_date == due_date


class TestServiceRequestServiceTransition:
    @pytest.fixture
    def service(self):
        return ServiceRequestService()

    async def test_raises_not_found_when_missing(self, service):
        db = AsyncMock()
        with patch.object(service, "get", new_callable=AsyncMock, return_value=None):
            with pytest.raises(NotFoundError):
                await service.transition_status(
                    db,
                    request_id=make_uuid(),
                    to_status=ServiceRequestStatus.APPROVED,
                    changed_by_id=make_uuid(),
                )

    async def test_raises_conflict_on_invalid_transition(self, service):
        db = AsyncMock()
        sr = make_service_request(status=ServiceRequestStatus.COMPLETED)
        with patch.object(service, "get", new_callable=AsyncMock, return_value=sr):
            with pytest.raises(ConflictError):
                await service.transition_status(
                    db,
                    request_id=sr.id,
                    to_status=ServiceRequestStatus.SUBMITTED,
                    changed_by_id=make_uuid(),
                )

    async def test_sets_approved_at_on_approval(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        sr = make_service_request(status=ServiceRequestStatus.SUBMITTED)
        approver_id = make_uuid()

        with patch.object(service, "get", new_callable=AsyncMock, return_value=sr):
            await service.transition_status(
                db,
                request_id=sr.id,
                to_status=ServiceRequestStatus.APPROVED,
                changed_by_id=approver_id,
                approver_id=approver_id,
            )
        assert sr.status == ServiceRequestStatus.APPROVED
        assert sr.approved_at is not None
        assert sr.approver_id == approver_id

    async def test_sets_rejected_at_on_rejection(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        sr = make_service_request(status=ServiceRequestStatus.PENDING_APPROVAL)
        approver_id = make_uuid()

        with patch.object(service, "get", new_callable=AsyncMock, return_value=sr):
            await service.transition_status(
                db,
                request_id=sr.id,
                to_status=ServiceRequestStatus.REJECTED,
                changed_by_id=approver_id,
                approver_id=approver_id,
                rejection_reason="Budget not approved",
            )
        assert sr.status == ServiceRequestStatus.REJECTED
        assert sr.rejected_at is not None
        assert sr.rejection_reason == "Budget not approved"

    async def test_sets_completed_at_on_completion(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        sr = make_service_request(status=ServiceRequestStatus.IN_PROGRESS)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=sr):
            await service.transition_status(
                db,
                request_id=sr.id,
                to_status=ServiceRequestStatus.COMPLETED,
                changed_by_id=make_uuid(),
            )
        assert sr.status == ServiceRequestStatus.COMPLETED
        assert sr.completed_at is not None

    async def test_creates_status_log_on_transition(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        sr = make_service_request(status=ServiceRequestStatus.SUBMITTED)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=sr):
            await service.transition_status(
                db,
                request_id=sr.id,
                to_status=ServiceRequestStatus.APPROVED,
                changed_by_id=make_uuid(),
                comment="Approved by manager",
            )

        logs = [o for o in added_objects if isinstance(o, ServiceRequestStatusLog)]
        assert len(logs) == 1
        assert logs[0].to_status == ServiceRequestStatus.APPROVED
        assert logs[0].comment == "Approved by manager"


class TestServiceRequestWorkflow:
    def test_submitted_can_transition_to_approved(self):
        from app.services.service_request_workflow import ServiceRequestWorkflowService
        assert ServiceRequestWorkflowService.is_valid_transition(
            ServiceRequestStatus.SUBMITTED,
            ServiceRequestStatus.APPROVED,
        )

    def test_submitted_can_transition_to_pending_approval(self):
        from app.services.service_request_workflow import ServiceRequestWorkflowService
        assert ServiceRequestWorkflowService.is_valid_transition(
            ServiceRequestStatus.SUBMITTED,
            ServiceRequestStatus.PENDING_APPROVAL,
        )

    def test_completed_cannot_transition_to_any(self):
        from app.services.service_request_workflow import ServiceRequestWorkflowService
        allowed = ServiceRequestWorkflowService.get_allowed_transitions(
            ServiceRequestStatus.COMPLETED
        )
        assert len(allowed) == 0

    def test_rejected_is_terminal(self):
        from app.services.service_request_workflow import ServiceRequestWorkflowService
        assert ServiceRequestWorkflowService.is_terminal(ServiceRequestStatus.REJECTED)

    def test_cancelled_is_terminal(self):
        from app.services.service_request_workflow import ServiceRequestWorkflowService
        assert ServiceRequestWorkflowService.is_terminal(ServiceRequestStatus.CANCELLED)

    def test_in_progress_can_complete_or_cancel(self):
        from app.services.service_request_workflow import ServiceRequestWorkflowService
        allowed = ServiceRequestWorkflowService.get_allowed_transitions(
            ServiceRequestStatus.IN_PROGRESS
        )
        assert ServiceRequestStatus.COMPLETED in allowed
        assert ServiceRequestStatus.CANCELLED in allowed

    def test_invalid_transition_raises_conflict(self):
        from app.services.service_request_workflow import ServiceRequestWorkflowService
        from app.core.errors import ConflictError
        with pytest.raises(ConflictError):
            ServiceRequestWorkflowService.validate_transition(
                ServiceRequestStatus.COMPLETED,
                ServiceRequestStatus.SUBMITTED,
            )
