from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.incident import Incident, IncidentPriority, IncidentStatus, SLAPolicy

# Default resolution SLA in minutes when no DB policy exists
_DEFAULT_RESOLUTION_MINUTES: dict[IncidentPriority, int] = {
    IncidentPriority.P1_CRITICAL: 60,    # 1 hour
    IncidentPriority.P2_HIGH: 240,        # 4 hours
    IncidentPriority.P3_MEDIUM: 480,      # 8 hours
    IncidentPriority.P4_LOW: 2880,        # 2 days
}

_TERMINAL_STATUSES = {IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED}


class SLAService:
    @staticmethod
    def compute_due_at(
        priority: IncidentPriority,
        policy: Optional[SLAPolicy] = None,
        base_time: Optional[datetime] = None,
    ) -> datetime:
        now = base_time or datetime.now(tz=timezone.utc)
        if policy and policy.is_active:
            minutes = policy.resolution_time_minutes
        else:
            minutes = _DEFAULT_RESOLUTION_MINUTES[priority]
        return now + timedelta(minutes=minutes)

    @staticmethod
    def is_overdue(incident: Incident, now: Optional[datetime] = None) -> bool:
        if incident.sla_due_at is None:
            return False
        if incident.status in _TERMINAL_STATUSES:
            return False
        current = now or datetime.now(tz=timezone.utc)
        due = incident.sla_due_at
        # Normalize to UTC-aware for comparison
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return current > due

    @staticmethod
    def remaining_minutes(incident: Incident, now: Optional[datetime] = None) -> Optional[int]:
        if incident.sla_due_at is None:
            return None
        current = now or datetime.now(tz=timezone.utc)
        due = incident.sla_due_at
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        delta = due - current
        return int(delta.total_seconds() / 60)
