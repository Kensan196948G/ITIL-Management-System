from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.core.errors import NotFoundError
from app.core.pagination import PaginatedResponse
from app.models.incident import IncidentPriority, IncidentStatus
from app.models.user import User
from app.schemas.incident import (
    IncidentAssign,
    IncidentCreate,
    IncidentDetailResponse,
    IncidentResponse,
    IncidentTransition,
    IncidentUpdate,
)
from app.services.incident_service import IncidentService
from app.services.incident_workflow import IncidentWorkflowService
from app.services.sla_service import SLAService

router = APIRouter(prefix="/incidents", tags=["incidents"])
_service = IncidentService()


@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident(
    body: IncidentCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    incident = await _service.create_incident(
        db,
        title=body.title,
        description=body.description,
        priority=body.priority,
        reporter_id=current_user.id,
        category=body.category,
        subcategory=body.subcategory,
        assignee_id=body.assignee_id,
    )
    return incident


@router.get("", response_model=PaginatedResponse[IncidentResponse])
async def list_incidents(
    status: Optional[IncidentStatus] = Query(None),
    priority: Optional[IncidentPriority] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None, description="Keyword search in title and description"),
    created_from: Optional[datetime] = Query(None, description="Filter by created_at >= this datetime (ISO 8601)"),
    created_to: Optional[datetime] = Query(None, description="Filter by created_at <= this datetime (ISO 8601)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    items, total = await _service.get_multi_filtered(
        db,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        created_from=created_from,
        created_to=created_to,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        items=[IncidentResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
async def get_incident(
    incident_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    incident = await _service.get_with_logs(db, incident_id)
    if not incident:
        raise NotFoundError("Incident", str(incident_id))
    return incident


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: UUID,
    body: IncidentUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    incident = await _service.get(db, incident_id)
    if not incident:
        raise NotFoundError("Incident", str(incident_id))
    updated = await _service.update(
        db,
        incident,
        **{k: v for k, v in body.model_dump(exclude_none=True).items()},
    )
    return updated


@router.post("/{incident_id}/transition", response_model=IncidentDetailResponse)
async def transition_incident(
    incident_id: UUID,
    body: IncidentTransition,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    incident = await _service.transition_status(
        db,
        incident_id=incident_id,
        to_status=body.to_status,
        changed_by_id=current_user.id,
        comment=body.comment,
        assignee_id=body.assignee_id,
    )
    result = await _service.get_with_logs(db, incident.id)
    return result


@router.post("/{incident_id}/assign", response_model=IncidentResponse)
async def assign_incident(
    incident_id: UUID,
    body: IncidentAssign,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    incident = await _service.assign(
        db,
        incident_id=incident_id,
        assignee_id=body.assignee_id,
        changed_by_id=current_user.id,
        comment=body.comment,
    )
    return incident


@router.get("/{incident_id}/sla", response_model=dict)
async def get_sla_status(
    incident_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    incident = await _service.get(db, incident_id)
    if not incident:
        raise NotFoundError("Incident", str(incident_id))
    return {
        "incident_id": str(incident_id),
        "sla_due_at": incident.sla_due_at.isoformat() if incident.sla_due_at else None,
        "is_overdue": SLAService.is_overdue(incident),
        "remaining_minutes": SLAService.remaining_minutes(incident),
    }


@router.get("/{incident_id}/transitions", response_model=list[str])
async def get_allowed_transitions(
    incident_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    incident = await _service.get(db, incident_id)
    if not incident:
        raise NotFoundError("Incident", str(incident_id))
    allowed = IncidentWorkflowService.get_allowed_transitions(incident.status)
    return [s.value for s in allowed]
