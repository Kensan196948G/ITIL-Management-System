import pytest
from app.models.incident import IncidentStatus
from app.core.errors import ConflictError
from app.services.incident_workflow import IncidentWorkflowService, ALLOWED_TRANSITIONS


class TestAllowedTransitions:
    def test_new_can_go_to_assigned(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.NEW, IncidentStatus.ASSIGNED
        )

    def test_new_can_go_to_in_progress(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.NEW, IncidentStatus.IN_PROGRESS
        )

    def test_new_can_be_cancelled(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.NEW, IncidentStatus.CANCELLED
        )

    def test_new_cannot_go_to_resolved(self):
        assert not IncidentWorkflowService.is_valid_transition(
            IncidentStatus.NEW, IncidentStatus.RESOLVED
        )

    def test_new_cannot_go_to_closed(self):
        assert not IncidentWorkflowService.is_valid_transition(
            IncidentStatus.NEW, IncidentStatus.CLOSED
        )

    def test_in_progress_can_go_to_pending(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.IN_PROGRESS, IncidentStatus.PENDING
        )

    def test_in_progress_can_go_to_resolved(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED
        )

    def test_resolved_can_be_closed(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.RESOLVED, IncidentStatus.CLOSED
        )

    def test_resolved_can_be_reopened(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.RESOLVED, IncidentStatus.IN_PROGRESS
        )

    def test_closed_has_no_transitions(self):
        assert IncidentWorkflowService.get_allowed_transitions(IncidentStatus.CLOSED) == set()

    def test_cancelled_has_no_transitions(self):
        assert IncidentWorkflowService.get_allowed_transitions(IncidentStatus.CANCELLED) == set()

    def test_pending_can_return_to_in_progress(self):
        assert IncidentWorkflowService.is_valid_transition(
            IncidentStatus.PENDING, IncidentStatus.IN_PROGRESS
        )


class TestValidateTransition:
    def test_valid_transition_does_not_raise(self):
        IncidentWorkflowService.validate_transition(
            IncidentStatus.NEW, IncidentStatus.ASSIGNED
        )

    def test_invalid_transition_raises_conflict_error(self):
        with pytest.raises(ConflictError):
            IncidentWorkflowService.validate_transition(
                IncidentStatus.CLOSED, IncidentStatus.NEW
            )

    def test_terminal_to_any_raises(self):
        for status in IncidentStatus:
            if status not in {IncidentStatus.CLOSED, IncidentStatus.CANCELLED}:
                with pytest.raises(ConflictError):
                    IncidentWorkflowService.validate_transition(
                        IncidentStatus.CLOSED, status
                    )


class TestIsTerminal:
    def test_closed_is_terminal(self):
        assert IncidentWorkflowService.is_terminal(IncidentStatus.CLOSED)

    def test_cancelled_is_terminal(self):
        assert IncidentWorkflowService.is_terminal(IncidentStatus.CANCELLED)

    def test_new_is_not_terminal(self):
        assert not IncidentWorkflowService.is_terminal(IncidentStatus.NEW)

    def test_resolved_is_not_terminal(self):
        assert not IncidentWorkflowService.is_terminal(IncidentStatus.RESOLVED)


class TestGetAllowedTransitions:
    def test_returns_set_for_known_status(self):
        result = IncidentWorkflowService.get_allowed_transitions(IncidentStatus.NEW)
        assert isinstance(result, set)
        assert len(result) > 0

    def test_all_statuses_covered(self):
        for status in IncidentStatus:
            result = IncidentWorkflowService.get_allowed_transitions(status)
            assert isinstance(result, set)
