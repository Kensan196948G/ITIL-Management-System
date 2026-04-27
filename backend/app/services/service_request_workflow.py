from app.models.service_request import ServiceRequestStatus
from app.core.errors import ConflictError

# ITIL service request lifecycle transitions
ALLOWED_TRANSITIONS: dict[ServiceRequestStatus, set[ServiceRequestStatus]] = {
    ServiceRequestStatus.SUBMITTED: {
        ServiceRequestStatus.PENDING_APPROVAL,
        ServiceRequestStatus.APPROVED,  # auto-approval path
        ServiceRequestStatus.CANCELLED,
    },
    ServiceRequestStatus.PENDING_APPROVAL: {
        ServiceRequestStatus.APPROVED,
        ServiceRequestStatus.REJECTED,
        ServiceRequestStatus.CANCELLED,
    },
    ServiceRequestStatus.APPROVED: {
        ServiceRequestStatus.IN_PROGRESS,
        ServiceRequestStatus.CANCELLED,
    },
    ServiceRequestStatus.REJECTED: set(),
    ServiceRequestStatus.IN_PROGRESS: {
        ServiceRequestStatus.COMPLETED,
        ServiceRequestStatus.CANCELLED,
    },
    ServiceRequestStatus.COMPLETED: set(),
    ServiceRequestStatus.CANCELLED: set(),
}


class ServiceRequestWorkflowService:
    @staticmethod
    def get_allowed_transitions(from_status: ServiceRequestStatus) -> set[ServiceRequestStatus]:
        return ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def is_valid_transition(
        from_status: ServiceRequestStatus, to_status: ServiceRequestStatus
    ) -> bool:
        return to_status in ALLOWED_TRANSITIONS.get(from_status, set())

    @staticmethod
    def validate_transition(
        from_status: ServiceRequestStatus, to_status: ServiceRequestStatus
    ) -> None:
        if not ServiceRequestWorkflowService.is_valid_transition(from_status, to_status):
            raise ConflictError(
                f"Cannot transition service request from '{from_status}' to '{to_status}'"
            )

    @staticmethod
    def is_terminal(status: ServiceRequestStatus) -> bool:
        return status in {
            ServiceRequestStatus.COMPLETED,
            ServiceRequestStatus.REJECTED,
            ServiceRequestStatus.CANCELLED,
        }
