import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.change_request import (
    ChangeRequest,
    ChangeRequestPriority,
    ChangeRequestRisk,
    ChangeRequestStatus,
    ChangeRequestStatusLog,
    ChangeRequestType,
)
from app.core.errors import ConflictError, NotFoundError
from app.services.change_request_service import ChangeRequestService


def make_uuid():
    return uuid.uuid4()


def make_change_request(
    status=ChangeRequestStatus.DRAFT,
    change_type=ChangeRequestType.NORMAL,
    risk_level=ChangeRequestRisk.MEDIUM,
    priority=ChangeRequestPriority.MEDIUM,
):
    cr = MagicMock(spec=ChangeRequest)
    cr.id = make_uuid()
    cr.status = status
    cr.change_type = change_type
    cr.risk_level = risk_level
    cr.priority = priority
    cr.approved_at = None
    cr.rejected_at = None
    cr.completed_at = None
    cr.actual_start_at = None
    cr.actual_end_at = None
    cr.approver_id = None
    cr.reviewer_id = None
    cr.rejection_reason = None
    return cr


class TestChangeRequestServiceCreate:
    @pytest.fixture
    def service(self):
        return ChangeRequestService()

    async def test_creates_with_draft_status(self, service):
        db = AsyncMock()
        requester_id = make_uuid()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.create_change_request(
            db,
            title="Deploy new API version",
            description="Upgrade backend API from v1 to v2",
            change_type=ChangeRequestType.NORMAL,
            risk_level=ChangeRequestRisk.MEDIUM,
            priority=ChangeRequestPriority.HIGH,
            requester_id=requester_id,
        )

        requests = [o for o in added_objects if isinstance(o, ChangeRequest)]
        assert len(requests) == 1
        assert requests[0].status == ChangeRequestStatus.DRAFT
        assert requests[0].requester_id == requester_id

    async def test_creates_status_log_on_creation(self, service):
        db = AsyncMock()
        requester_id = make_uuid()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.create_change_request(
            db,
            title="Test CR",
            description="desc",
            change_type=ChangeRequestType.STANDARD,
            risk_level=ChangeRequestRisk.LOW,
            priority=ChangeRequestPriority.MEDIUM,
            requester_id=requester_id,
        )

        logs = [o for o in added_objects if isinstance(o, ChangeRequestStatusLog)]
        assert len(logs) == 1
        assert logs[0].from_status is None
        assert logs[0].to_status == ChangeRequestStatus.DRAFT

    async def test_creates_with_planned_dates(self, service):
        db = AsyncMock()
        requester_id = make_uuid()
        planned_start = datetime(2026, 5, 1, 9, 0, tzinfo=timezone.utc)
        planned_end = datetime(2026, 5, 1, 11, 0, tzinfo=timezone.utc)

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.create_change_request(
            db,
            title="Maintenance window",
            description="Scheduled maintenance",
            change_type=ChangeRequestType.NORMAL,
            risk_level=ChangeRequestRisk.LOW,
            priority=ChangeRequestPriority.LOW,
            requester_id=requester_id,
            planned_start_at=planned_start,
            planned_end_at=planned_end,
        )

        requests = [o for o in added_objects if isinstance(o, ChangeRequest)]
        assert requests[0].planned_start_at == planned_start
        assert requests[0].planned_end_at == planned_end

    async def test_creates_with_rollback_plan(self, service):
        db = AsyncMock()
        requester_id = make_uuid()

        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        await service.create_change_request(
            db,
            title="Emergency patch",
            description="Critical security patch",
            change_type=ChangeRequestType.EMERGENCY,
            risk_level=ChangeRequestRisk.HIGH,
            priority=ChangeRequestPriority.CRITICAL,
            requester_id=requester_id,
            rollback_plan="Revert to previous version via git revert",
        )

        requests = [o for o in added_objects if isinstance(o, ChangeRequest)]
        assert requests[0].rollback_plan == "Revert to previous version via git revert"


class TestChangeRequestServiceTransition:
    @pytest.fixture
    def service(self):
        return ChangeRequestService()

    async def test_raises_not_found_when_missing(self, service):
        db = AsyncMock()
        with patch.object(service, "get", new_callable=AsyncMock, return_value=None):
            with pytest.raises(NotFoundError):
                await service.transition_status(
                    db,
                    request_id=make_uuid(),
                    to_status=ChangeRequestStatus.SUBMITTED,
                    changed_by_id=make_uuid(),
                )

    async def test_raises_conflict_on_invalid_transition(self, service):
        db = AsyncMock()
        cr = make_change_request(status=ChangeRequestStatus.COMPLETED)
        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            with pytest.raises(ConflictError):
                await service.transition_status(
                    db,
                    request_id=cr.id,
                    to_status=ChangeRequestStatus.SUBMITTED,
                    changed_by_id=make_uuid(),
                )

    async def test_sets_approved_at_on_approval(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        cr = make_change_request(status=ChangeRequestStatus.UNDER_REVIEW)
        approver_id = make_uuid()

        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            await service.transition_status(
                db,
                request_id=cr.id,
                to_status=ChangeRequestStatus.APPROVED,
                changed_by_id=approver_id,
                approver_id=approver_id,
            )
        assert cr.status == ChangeRequestStatus.APPROVED
        assert cr.approved_at is not None
        assert cr.approver_id == approver_id

    async def test_sets_rejected_at_on_rejection(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        cr = make_change_request(status=ChangeRequestStatus.UNDER_REVIEW)
        approver_id = make_uuid()

        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            await service.transition_status(
                db,
                request_id=cr.id,
                to_status=ChangeRequestStatus.REJECTED,
                changed_by_id=approver_id,
                approver_id=approver_id,
                rejection_reason="Implementation plan is incomplete",
            )
        assert cr.status == ChangeRequestStatus.REJECTED
        assert cr.rejected_at is not None
        assert cr.rejection_reason == "Implementation plan is incomplete"

    async def test_sets_actual_start_at_on_in_progress(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        cr = make_change_request(status=ChangeRequestStatus.APPROVED)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            await service.transition_status(
                db,
                request_id=cr.id,
                to_status=ChangeRequestStatus.IN_PROGRESS,
                changed_by_id=make_uuid(),
            )
        assert cr.status == ChangeRequestStatus.IN_PROGRESS
        assert cr.actual_start_at is not None

    async def test_sets_actual_end_at_on_completion(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        cr = make_change_request(status=ChangeRequestStatus.IN_PROGRESS)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            await service.transition_status(
                db,
                request_id=cr.id,
                to_status=ChangeRequestStatus.COMPLETED,
                changed_by_id=make_uuid(),
            )
        assert cr.status == ChangeRequestStatus.COMPLETED
        assert cr.completed_at is not None
        assert cr.actual_end_at is not None

    async def test_sets_actual_end_at_on_failure(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        cr = make_change_request(status=ChangeRequestStatus.IN_PROGRESS)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            await service.transition_status(
                db,
                request_id=cr.id,
                to_status=ChangeRequestStatus.FAILED,
                changed_by_id=make_uuid(),
            )
        assert cr.status == ChangeRequestStatus.FAILED
        assert cr.actual_end_at is not None

    async def test_creates_status_log_on_transition(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        added_objects = []
        db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
        cr = make_change_request(status=ChangeRequestStatus.DRAFT)

        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            await service.transition_status(
                db,
                request_id=cr.id,
                to_status=ChangeRequestStatus.SUBMITTED,
                changed_by_id=make_uuid(),
                comment="Submitting for CAB review",
            )

        logs = [o for o in added_objects if isinstance(o, ChangeRequestStatusLog)]
        assert len(logs) == 1
        assert logs[0].to_status == ChangeRequestStatus.SUBMITTED
        assert logs[0].comment == "Submitting for CAB review"

    async def test_sets_reviewer_id_on_approval(self, service):
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        db.add = MagicMock()
        cr = make_change_request(status=ChangeRequestStatus.SUBMITTED)
        reviewer_id = make_uuid()

        with patch.object(service, "get", new_callable=AsyncMock, return_value=cr):
            await service.transition_status(
                db,
                request_id=cr.id,
                to_status=ChangeRequestStatus.APPROVED,
                changed_by_id=make_uuid(),
                reviewer_id=reviewer_id,
            )
        assert cr.reviewer_id == reviewer_id


class TestChangeRequestWorkflow:
    def test_draft_can_transition_to_submitted(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        assert ChangeRequestWorkflowService.is_valid_transition(
            ChangeRequestStatus.DRAFT,
            ChangeRequestStatus.SUBMITTED,
        )

    def test_draft_can_be_cancelled(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        assert ChangeRequestWorkflowService.is_valid_transition(
            ChangeRequestStatus.DRAFT,
            ChangeRequestStatus.CANCELLED,
        )

    def test_submitted_can_go_to_under_review(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        assert ChangeRequestWorkflowService.is_valid_transition(
            ChangeRequestStatus.SUBMITTED,
            ChangeRequestStatus.UNDER_REVIEW,
        )

    def test_under_review_can_be_approved_or_rejected(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        allowed = ChangeRequestWorkflowService.get_allowed_transitions(
            ChangeRequestStatus.UNDER_REVIEW
        )
        assert ChangeRequestStatus.APPROVED in allowed
        assert ChangeRequestStatus.REJECTED in allowed

    def test_completed_cannot_transition_to_any(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        allowed = ChangeRequestWorkflowService.get_allowed_transitions(
            ChangeRequestStatus.COMPLETED
        )
        assert len(allowed) == 0

    def test_completed_is_terminal(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        assert ChangeRequestWorkflowService.is_terminal(ChangeRequestStatus.COMPLETED)

    def test_failed_is_terminal(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        assert ChangeRequestWorkflowService.is_terminal(ChangeRequestStatus.FAILED)

    def test_rejected_is_terminal(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        assert ChangeRequestWorkflowService.is_terminal(ChangeRequestStatus.REJECTED)

    def test_cancelled_is_terminal(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        assert ChangeRequestWorkflowService.is_terminal(ChangeRequestStatus.CANCELLED)

    def test_in_progress_can_complete_fail_or_cancel(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        allowed = ChangeRequestWorkflowService.get_allowed_transitions(
            ChangeRequestStatus.IN_PROGRESS
        )
        assert ChangeRequestStatus.COMPLETED in allowed
        assert ChangeRequestStatus.FAILED in allowed
        assert ChangeRequestStatus.CANCELLED in allowed

    def test_invalid_transition_raises_conflict(self):
        from app.services.change_request_workflow import ChangeRequestWorkflowService
        from app.core.errors import ConflictError
        with pytest.raises(ConflictError):
            ChangeRequestWorkflowService.validate_transition(
                ChangeRequestStatus.COMPLETED,
                ChangeRequestStatus.DRAFT,
            )
