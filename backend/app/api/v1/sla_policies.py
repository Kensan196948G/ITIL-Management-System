from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_admin
from app.models.incident import Incident, IncidentPriority, SLAPolicy
from app.models.user import User
from app.schemas.incident import (
    IncidentSLAStatus,
    SLAPolicyCreate,
    SLAPolicyResponse,
    SLAPolicyUpdate,
)
from app.services.sla_service import SLAService

router = APIRouter(prefix="/sla-policies", tags=["sla-policies"])


@router.get("", response_model=list[SLAPolicyResponse])
async def list_sla_policies(
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(SLAPolicy).order_by(SLAPolicy.priority))
    return result.scalars().all()


@router.post("", response_model=SLAPolicyResponse, status_code=201)
async def create_sla_policy(
    body: SLAPolicyCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    existing = await db.execute(
        select(SLAPolicy).where(SLAPolicy.priority == body.priority)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SLA policy for priority '{body.priority}' already exists",
        )
    policy = SLAPolicy(
        priority=body.priority,
        response_time_minutes=body.response_time_minutes,
        resolution_time_minutes=body.resolution_time_minutes,
        is_active=body.is_active,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy


@router.get("/{priority}", response_model=SLAPolicyResponse)
async def get_sla_policy(
    priority: IncidentPriority,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SLAPolicy).where(SLAPolicy.priority == priority)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="SLA policy not found")
    return policy


@router.put("/{priority}", response_model=SLAPolicyResponse)
async def update_sla_policy(
    priority: IncidentPriority,
    body: SLAPolicyUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(SLAPolicy).where(SLAPolicy.priority == priority)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="SLA policy not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(policy, field, value)
    await db.commit()
    await db.refresh(policy)
    return policy


@router.delete("/{priority}", status_code=204)
async def delete_sla_policy(
    priority: IncidentPriority,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(SLAPolicy).where(SLAPolicy.priority == priority)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="SLA policy not found")
    await db.delete(policy)
    await db.commit()


@router.get("/incidents/{incident_id}/sla", response_model=IncidentSLAStatus, tags=["incidents"])
async def get_incident_sla_status(
    incident_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return IncidentSLAStatus(
        incident_id=incident.id,
        sla_due_at=incident.sla_due_at,
        is_overdue=SLAService.is_overdue(incident),
        remaining_minutes=SLAService.remaining_minutes(incident),
        priority=incident.priority,
        status=incident.status,
    )
