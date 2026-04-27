from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, IncidentStatus, IncidentPriority
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.change_request import ChangeRequest, ChangeRequestStatus


async def get_incident_stats(db: AsyncSession) -> dict:
    total_q = await db.execute(select(func.count()).select_from(Incident))
    total = total_q.scalar_one()

    open_statuses = [
        IncidentStatus.NEW,
        IncidentStatus.ASSIGNED,
        IncidentStatus.IN_PROGRESS,
        IncidentStatus.PENDING,
    ]
    open_q = await db.execute(
        select(func.count()).select_from(Incident).where(Incident.status.in_(open_statuses))
    )
    open_count = open_q.scalar_one()

    resolved_q = await db.execute(
        select(func.count()).select_from(Incident).where(
            Incident.status.in_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
        )
    )
    resolved_count = resolved_q.scalar_one()

    now = datetime.now(timezone.utc)
    overdue_q = await db.execute(
        select(func.count()).select_from(Incident).where(
            Incident.status.in_(open_statuses),
            Incident.sla_due_at.isnot(None),
            Incident.sla_due_at < now,
        )
    )
    overdue_count = overdue_q.scalar_one()

    by_priority_q = await db.execute(
        select(Incident.priority, func.count()).group_by(Incident.priority)
    )
    by_priority = {row[0].value: row[1] for row in by_priority_q}

    return {
        "total": total,
        "open": open_count,
        "resolved": resolved_count,
        "overdue": overdue_count,
        "by_priority": {
            "p1_critical": by_priority.get(IncidentPriority.P1_CRITICAL.value, 0),
            "p2_high": by_priority.get(IncidentPriority.P2_HIGH.value, 0),
            "p3_medium": by_priority.get(IncidentPriority.P3_MEDIUM.value, 0),
            "p4_low": by_priority.get(IncidentPriority.P4_LOW.value, 0),
        },
    }


async def get_service_request_stats(db: AsyncSession) -> dict:
    total_q = await db.execute(select(func.count()).select_from(ServiceRequest))
    total = total_q.scalar_one()

    pending_statuses = [
        ServiceRequestStatus.SUBMITTED,
        ServiceRequestStatus.PENDING_APPROVAL,
        ServiceRequestStatus.IN_PROGRESS,
    ]
    pending_q = await db.execute(
        select(func.count()).select_from(ServiceRequest).where(
            ServiceRequest.status.in_(pending_statuses)
        )
    )
    pending_count = pending_q.scalar_one()

    completed_q = await db.execute(
        select(func.count()).select_from(ServiceRequest).where(
            ServiceRequest.status == ServiceRequestStatus.COMPLETED
        )
    )
    completed_count = completed_q.scalar_one()

    approval_q = await db.execute(
        select(func.count()).select_from(ServiceRequest).where(
            ServiceRequest.status == ServiceRequestStatus.PENDING_APPROVAL
        )
    )
    pending_approval_count = approval_q.scalar_one()

    return {
        "total": total,
        "pending": pending_count,
        "completed": completed_count,
        "pending_approval": pending_approval_count,
    }


async def get_change_request_stats(db: AsyncSession) -> dict:
    total_q = await db.execute(select(func.count()).select_from(ChangeRequest))
    total = total_q.scalar_one()

    active_statuses = [
        ChangeRequestStatus.SUBMITTED,
        ChangeRequestStatus.UNDER_REVIEW,
        ChangeRequestStatus.APPROVED,
        ChangeRequestStatus.IN_PROGRESS,
    ]
    active_q = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status.in_(active_statuses)
        )
    )
    active_count = active_q.scalar_one()

    pending_approval_q = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status.in_([ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.UNDER_REVIEW])
        )
    )
    pending_approval_count = pending_approval_q.scalar_one()

    completed_q = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status == ChangeRequestStatus.COMPLETED
        )
    )
    completed_count = completed_q.scalar_one()

    failed_q = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status == ChangeRequestStatus.FAILED
        )
    )
    failed_count = failed_q.scalar_one()

    return {
        "total": total,
        "active": active_count,
        "pending_approval": pending_approval_count,
        "completed": completed_count,
        "failed": failed_count,
    }


async def get_dashboard_summary(db: AsyncSession) -> dict:
    incidents = await get_incident_stats(db)
    service_requests = await get_service_request_stats(db)
    change_requests = await get_change_request_stats(db)

    return {
        "incidents": incidents,
        "service_requests": service_requests,
        "change_requests": change_requests,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
