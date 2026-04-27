import pytest

from app.models.problem import ProblemStatus
from app.services.problem_workflow import ProblemWorkflowService
from app.core.errors import ConflictError


class TestGetAllowedTransitions:
    def test_open_can_go_to_under_investigation(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.OPEN)
        assert ProblemStatus.UNDER_INVESTIGATION in allowed

    def test_open_cannot_go_to_closed(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.OPEN)
        assert ProblemStatus.CLOSED not in allowed

    def test_under_investigation_can_go_to_known_error(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.UNDER_INVESTIGATION)
        assert ProblemStatus.KNOWN_ERROR in allowed

    def test_under_investigation_can_go_to_resolved(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.UNDER_INVESTIGATION)
        assert ProblemStatus.RESOLVED in allowed

    def test_known_error_can_go_to_resolved(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.KNOWN_ERROR)
        assert ProblemStatus.RESOLVED in allowed

    def test_resolved_can_go_to_closed(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.RESOLVED)
        assert ProblemStatus.CLOSED in allowed

    def test_resolved_can_reopen(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.RESOLVED)
        assert ProblemStatus.UNDER_INVESTIGATION in allowed

    def test_closed_has_no_transitions(self):
        allowed = ProblemWorkflowService.get_allowed_transitions(ProblemStatus.CLOSED)
        assert len(allowed) == 0


class TestIsValidTransition:
    def test_valid_transition_returns_true(self):
        assert ProblemWorkflowService.is_valid_transition(
            ProblemStatus.OPEN, ProblemStatus.UNDER_INVESTIGATION
        )

    def test_invalid_transition_returns_false(self):
        assert not ProblemWorkflowService.is_valid_transition(
            ProblemStatus.OPEN, ProblemStatus.CLOSED
        )


class TestValidateTransition:
    def test_valid_transition_does_not_raise(self):
        ProblemWorkflowService.validate_transition(
            ProblemStatus.OPEN, ProblemStatus.UNDER_INVESTIGATION
        )

    def test_invalid_transition_raises_conflict(self):
        with pytest.raises(ConflictError):
            ProblemWorkflowService.validate_transition(
                ProblemStatus.OPEN, ProblemStatus.CLOSED
            )


class TestIsTerminal:
    def test_closed_is_terminal(self):
        assert ProblemWorkflowService.is_terminal(ProblemStatus.CLOSED)

    def test_open_is_not_terminal(self):
        assert not ProblemWorkflowService.is_terminal(ProblemStatus.OPEN)

    def test_resolved_is_not_terminal(self):
        assert not ProblemWorkflowService.is_terminal(ProblemStatus.RESOLVED)
