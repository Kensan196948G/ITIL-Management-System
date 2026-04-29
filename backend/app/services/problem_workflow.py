from app.models.problem import ProblemStatus
from app.core.errors import ConflictError

# Valid state transitions for ITIL problem lifecycle
ALLOWED_TRANSITIONS: dict[ProblemStatus, set[ProblemStatus]] = {
    ProblemStatus.OPEN: {
        ProblemStatus.UNDER_INVESTIGATION,
    },
    ProblemStatus.UNDER_INVESTIGATION: {
        ProblemStatus.KNOWN_ERROR,
        ProblemStatus.RESOLVED,
    },
    ProblemStatus.KNOWN_ERROR: {
        ProblemStatus.RESOLVED,
    },
    ProblemStatus.RESOLVED: {
        ProblemStatus.CLOSED,
        ProblemStatus.UNDER_INVESTIGATION,  # reopen
    },
    ProblemStatus.CLOSED: set(),
}


class ProblemWorkflowService:
    @staticmethod
    def get_allowed_transitions(from_status: ProblemStatus) -> set[ProblemStatus]:
        return ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def is_valid_transition(from_status: ProblemStatus, to_status: ProblemStatus) -> bool:
        return to_status in ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def validate_transition(from_status: ProblemStatus, to_status: ProblemStatus) -> None:
        if not ProblemWorkflowService.is_valid_transition(from_status, to_status):
            raise ConflictError(
                f"Cannot transition problem from '{from_status}' to '{to_status}'"
            )

    @staticmethod
    def is_terminal(status: ProblemStatus) -> bool:
        return status == ProblemStatus.CLOSED
