from app.models.change_request import ChangeRequestStatus
from app.core.errors import ConflictError

# ITIL change management lifecycle transitions
# Standard changes can skip review/approval and go directly to in_progress
ALLOWED_TRANSITIONS: dict[ChangeRequestStatus, set[ChangeRequestStatus]] = {
    ChangeRequestStatus.DRAFT: {
        ChangeRequestStatus.SUBMITTED,
        ChangeRequestStatus.CANCELLED,
    },
    ChangeRequestStatus.SUBMITTED: {
        ChangeRequestStatus.UNDER_REVIEW,
        ChangeRequestStatus.APPROVED,  # standard/emergency fast-track
        ChangeRequestStatus.CANCELLED,
    },
    ChangeRequestStatus.UNDER_REVIEW: {
        ChangeRequestStatus.APPROVED,
        ChangeRequestStatus.REJECTED,
        ChangeRequestStatus.CANCELLED,
    },
    ChangeRequestStatus.APPROVED: {
        ChangeRequestStatus.IN_PROGRESS,
        ChangeRequestStatus.CANCELLED,
    },
    ChangeRequestStatus.REJECTED: set(),
    ChangeRequestStatus.IN_PROGRESS: {
        ChangeRequestStatus.COMPLETED,
        ChangeRequestStatus.FAILED,
        ChangeRequestStatus.CANCELLED,
    },
    ChangeRequestStatus.COMPLETED: set(),
    ChangeRequestStatus.FAILED: set(),
    ChangeRequestStatus.CANCELLED: set(),
}


class ChangeRequestWorkflowService:
    @staticmethod
    def get_allowed_transitions(from_status: ChangeRequestStatus) -> set[ChangeRequestStatus]:
        return ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def is_valid_transition(
        from_status: ChangeRequestStatus, to_status: ChangeRequestStatus
    ) -> bool:
        return to_status in ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def validate_transition(
        from_status: ChangeRequestStatus, to_status: ChangeRequestStatus
    ) -> None:
        if not ChangeRequestWorkflowService.is_valid_transition(from_status, to_status):
            raise ConflictError(
                f"Cannot transition change request from '{from_status}' to '{to_status}'"
            )

    @staticmethod
    def is_terminal(status: ChangeRequestStatus) -> bool:
        return status in {
            ChangeRequestStatus.COMPLETED,
            ChangeRequestStatus.FAILED,
            ChangeRequestStatus.REJECTED,
            ChangeRequestStatus.CANCELLED,
        }
