from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.core.errors import NotFoundError
from app.core.pagination import PaginatedResponse
from app.models.service_request import ServiceRequestCategory, ServiceRequestStatus
from app.models.user import User
from app.schemas.service_request import (
    ServiceRequestApprove,
    ServiceRequestCreate,
    ServiceRequestDetailResponse,
    ServiceRequestReject,
    ServiceRequestResponse,
    ServiceRequestTransition,
    ServiceRequestUpdate,
)
from app.services.service_request_service import ServiceRequestService
from app.services.service_request_workflow import ServiceRequestWorkflowService

router = APIRouter(prefix="/service-requests", tags=["service-requests"])
_service = ServiceRequestService()


@router.post("", response_model=ServiceRequestResponse, status_code=201)
async def create_service_request(
    body: ServiceRequestCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    sr = await _service.create_service_request(
        db,
        title=body.title,
        description=body.description,
        category=body.category,
        requester_id=current_user.id,
        due_date=body.due_date,
        assignee_id=body.assignee_id,
    )
    return sr


@router.get("", response_model=PaginatedResponse[ServiceRequestResponse])
async def list_service_requests(
    status: Optional[ServiceRequestStatus] = Query(None),
    category: Optional[ServiceRequestCategory] = Query(None),
    requester_id: Optional[UUID] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    items, total = await _service.get_multi_filtered(
        db,
        status=status,
        category=category,
        requester_id=requester_id,
        assignee_id=assignee_id,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        items=[ServiceRequestResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{request_id}", response_model=ServiceRequestDetailResponse)
async def get_service_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    sr = await _service.get_with_logs(db, request_id)
    if not sr:
        raise NotFoundError("ServiceRequest", str(request_id))
    return sr


@router.put("/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(
    request_id: UUID,
    body: ServiceRequestUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    sr = await _service.get(db, request_id)
    if not sr:
        raise NotFoundError("ServiceRequest", str(request_id))
    updated = await _service.update(
        db,
        sr,
        **{k: v for k, v in body.model_dump(exclude_none=True).items()},
    )
    return updated


@router.post("/{request_id}/approve", response_model=ServiceRequestDetailResponse)
async def approve_service_request(
    request_id: UUID,
    body: ServiceRequestApprove,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    sr = await _service.transition_status(
        db,
        request_id=request_id,
        to_status=ServiceRequestStatus.APPROVED,
        changed_by_id=current_user.id,
        comment=body.comment,
        approver_id=current_user.id,
        assignee_id=body.assignee_id,
    )
    result = await _service.get_with_logs(db, sr.id)
    return result


@router.post("/{request_id}/reject", response_model=ServiceRequestDetailResponse)
async def reject_service_request(
    request_id: UUID,
    body: ServiceRequestReject,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    sr = await _service.transition_status(
        db,
        request_id=request_id,
        to_status=ServiceRequestStatus.REJECTED,
        changed_by_id=current_user.id,
        comment=body.rejection_reason,
        approver_id=current_user.id,
        rejection_reason=body.rejection_reason,
    )
    result = await _service.get_with_logs(db, sr.id)
    return result


@router.post("/{request_id}/transition", response_model=ServiceRequestDetailResponse)
async def transition_service_request(
    request_id: UUID,
    body: ServiceRequestTransition,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    sr = await _service.transition_status(
        db,
        request_id=request_id,
        to_status=body.to_status,
        changed_by_id=current_user.id,
        comment=body.comment,
    )
    result = await _service.get_with_logs(db, sr.id)
    return result


@router.get("/{request_id}/transitions", response_model=list[str])
async def get_allowed_transitions(
    request_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    sr = await _service.get(db, request_id)
    if not sr:
        raise NotFoundError("ServiceRequest", str(request_id))
    allowed = ServiceRequestWorkflowService.get_allowed_transitions(sr.status)
    return [s.value for s in allowed]
