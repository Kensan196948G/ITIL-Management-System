import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.models.change_request import ChangeRequest
from app.models.incident import Incident
from app.models.service_request import ServiceRequest
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])


def _csv_response(rows: list[dict], fieldnames: list[str], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


_INCIDENT_FIELDS = [
    "id", "title", "status", "priority", "category", "subcategory",
    "reporter_id", "assignee_id", "sla_due_at", "resolved_at", "created_at", "updated_at",
]

_SR_FIELDS = [
    "id", "title", "status", "category", "requester_id", "approver_id", "assignee_id",
    "due_date", "approved_at", "completed_at", "rejection_reason", "created_at", "updated_at",
]

_CR_FIELDS = [
    "id", "title", "status", "change_type", "risk_level", "priority",
    "requester_id", "approver_id", "planned_start_at", "planned_end_at",
    "actual_start_at", "actual_end_at", "approved_at", "completed_at",
    "rejection_reason", "created_at", "updated_at",
]


def _fmt(v: Optional[datetime]) -> str:
    return v.isoformat() if v else ""


@router.get("/incidents")
async def export_incidents(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    created_from: Optional[datetime] = Query(None),
    created_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    q = select(Incident).order_by(Incident.created_at.desc())
    if status:
        q = q.where(Incident.status == status)
    if priority:
        q = q.where(Incident.priority == priority)
    if created_from:
        q = q.where(Incident.created_at >= created_from)
    if created_to:
        q = q.where(Incident.created_at <= created_to)
    result = (await db.execute(q)).scalars().all()
    rows = [
        {
            "id": str(r.id),
            "title": r.title,
            "status": r.status.value,
            "priority": r.priority.value,
            "category": r.category or "",
            "subcategory": r.subcategory or "",
            "reporter_id": str(r.reporter_id),
            "assignee_id": str(r.assignee_id) if r.assignee_id else "",
            "sla_due_at": _fmt(r.sla_due_at),
            "resolved_at": _fmt(r.resolved_at),
            "created_at": _fmt(r.created_at),
            "updated_at": _fmt(r.updated_at),
        }
        for r in result
    ]
    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    return _csv_response(rows, _INCIDENT_FIELDS, f"incidents_{ts}.csv")


@router.get("/service-requests")
async def export_service_requests(
    status: Optional[str] = Query(None),
    created_from: Optional[datetime] = Query(None),
    created_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    q = select(ServiceRequest).order_by(ServiceRequest.created_at.desc())
    if status:
        q = q.where(ServiceRequest.status == status)
    if created_from:
        q = q.where(ServiceRequest.created_at >= created_from)
    if created_to:
        q = q.where(ServiceRequest.created_at <= created_to)
    result = (await db.execute(q)).scalars().all()
    rows = [
        {
            "id": str(r.id),
            "title": r.title,
            "status": r.status.value,
            "category": r.category.value,
            "requester_id": str(r.requester_id),
            "approver_id": str(r.approver_id) if r.approver_id else "",
            "assignee_id": str(r.assignee_id) if r.assignee_id else "",
            "due_date": _fmt(r.due_date),
            "approved_at": _fmt(r.approved_at),
            "completed_at": _fmt(r.completed_at),
            "rejection_reason": r.rejection_reason or "",
            "created_at": _fmt(r.created_at),
            "updated_at": _fmt(r.updated_at),
        }
        for r in result
    ]
    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    return _csv_response(rows, _SR_FIELDS, f"service_requests_{ts}.csv")


@router.get("/change-requests")
async def export_change_requests(
    status: Optional[str] = Query(None),
    created_from: Optional[datetime] = Query(None),
    created_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    q = select(ChangeRequest).order_by(ChangeRequest.created_at.desc())
    if status:
        q = q.where(ChangeRequest.status == status)
    if created_from:
        q = q.where(ChangeRequest.created_at >= created_from)
    if created_to:
        q = q.where(ChangeRequest.created_at <= created_to)
    result = (await db.execute(q)).scalars().all()
    rows = [
        {
            "id": str(r.id),
            "title": r.title,
            "status": r.status.value,
            "change_type": r.change_type.value,
            "risk_level": r.risk_level.value,
            "priority": r.priority.value,
            "requester_id": str(r.requester_id),
            "approver_id": str(r.approver_id) if r.approver_id else "",
            "planned_start_at": _fmt(r.planned_start_at),
            "planned_end_at": _fmt(r.planned_end_at),
            "actual_start_at": _fmt(r.actual_start_at),
            "actual_end_at": _fmt(r.actual_end_at),
            "approved_at": _fmt(r.approved_at),
            "completed_at": _fmt(r.completed_at),
            "rejection_reason": r.rejection_reason or "",
            "created_at": _fmt(r.created_at),
            "updated_at": _fmt(r.updated_at),
        }
        for r in result
    ]
    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    return _csv_response(rows, _CR_FIELDS, f"change_requests_{ts}.csv")
