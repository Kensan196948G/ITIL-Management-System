from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_session as get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.incident import Incident, IncidentStatus, IncidentPriority
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.change_request import ChangeRequest, ChangeRequestStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    incident_rows = (await db.execute(
        select(Incident.status, func.count().label("cnt")).group_by(Incident.status)
    )).all()
    incident_by_status = {r.status.value: r.cnt for r in incident_rows}

    priority_rows = (await db.execute(
        select(Incident.priority, func.count().label("cnt"))
        .where(Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.CANCELLED]))
        .group_by(Incident.priority)
    )).all()
    incident_by_priority = {r.priority.value: r.cnt for r in priority_rows}

    sr_rows = (await db.execute(
        select(ServiceRequest.status, func.count().label("cnt")).group_by(ServiceRequest.status)
    )).all()
    sr_by_status = {r.status.value: r.cnt for r in sr_rows}

    cr_rows = (await db.execute(
        select(ChangeRequest.status, func.count().label("cnt")).group_by(ChangeRequest.status)
    )).all()
    cr_by_status = {r.status.value: r.cnt for r in cr_rows}

    return {
        "incidents": {
            "total": sum(incident_by_status.values()),
            "open": incident_by_status.get("new", 0) + incident_by_status.get("assigned", 0) + incident_by_status.get("in_progress", 0),
            "pending": incident_by_status.get("pending", 0),
            "resolved": incident_by_status.get("resolved", 0),
            "closed": incident_by_status.get("closed", 0),
            "by_priority": {
                "p1_critical": incident_by_priority.get("p1_critical", 0),
                "p2_high": incident_by_priority.get("p2_high", 0),
                "p3_medium": incident_by_priority.get("p3_medium", 0),
                "p4_low": incident_by_priority.get("p4_low", 0),
            },
        },
        "service_requests": {
            "total": sum(sr_by_status.values()),
            "open": sr_by_status.get("submitted", 0) + sr_by_status.get("pending_approval", 0) + sr_by_status.get("in_progress", 0),
            "approved": sr_by_status.get("approved", 0),
            "completed": sr_by_status.get("completed", 0),
            "rejected": sr_by_status.get("rejected", 0),
        },
        "change_requests": {
            "total": sum(cr_by_status.values()),
            "draft": cr_by_status.get("draft", 0),
            "in_review": cr_by_status.get("under_review", 0),
            "approved": cr_by_status.get("approved", 0),
            "in_progress": cr_by_status.get("in_progress", 0),
            "completed": cr_by_status.get("completed", 0),
        },
    }
