from app.models.incident import IncidentStatus
from app.core.errors import ConflictError

# Valid state transitions for ITIL incident lifecycle
ALLOWED_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.NEW: {
        IncidentStatus.ASSIGNED,
        IncidentStatus.IN_PROGRESS,
        IncidentStatus.CANCELLED,
    },
    IncidentStatus.ASSIGNED: {
        IncidentStatus.IN_PROGRESS,
        IncidentStatus.CANCELLED,
    },
    IncidentStatus.IN_PROGRESS: {
        IncidentStatus.PENDING,
        IncidentStatus.RESOLVED,
        IncidentStatus.CANCELLED,
    },
    IncidentStatus.PENDING: {
        IncidentStatus.IN_PROGRESS,
        IncidentStatus.RESOLVED,
        IncidentStatus.CANCELLED,
    },
    IncidentStatus.RESOLVED: {
        IncidentStatus.CLOSED,
        IncidentStatus.IN_PROGRESS,  # reopen
    },
    IncidentStatus.CLOSED: set(),
    IncidentStatus.CANCELLED: set(),
}


class IncidentWorkflowService:
    @staticmethod
    def get_allowed_transitions(from_status: IncidentStatus) -> set[IncidentStatus]:
        return ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def is_valid_transition(from_status: IncidentStatus, to_status: IncidentStatus) -> bool:
        return to_status in ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def validate_transition(from_status: IncidentStatus, to_status: IncidentStatus) -> None:
        if not IncidentWorkflowService.is_valid_transition(from_status, to_status):
            raise ConflictError(
                f"Cannot transition incident from '{from_status}' to '{to_status}'"
            )

    @staticmethod
    def is_terminal(status: IncidentStatus) -> bool:
        return status in {IncidentStatus.CLOSED, IncidentStatus.CANCELLED}
