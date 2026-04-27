from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.core.errors import NotFoundError
from app.core.pagination import PaginatedResponse
from app.models.change_request import (
    ChangeRequestPriority,
    ChangeRequestRisk,
    ChangeRequestStatus,
    ChangeRequestType,
)
from app.models.user import User
from app.schemas.change_request import (
    ChangeRequestApprove,
    ChangeRequestCreate,
    ChangeRequestDetailResponse,
    ChangeRequestReject,
    ChangeRequestResponse,
    ChangeRequestTransition,
    ChangeRequestUpdate,
)
from app.services.change_request_service import ChangeRequestService
from app.services.change_request_workflow import ChangeRequestWorkflowService

router = APIRouter(prefix="/change-requests", tags=["change-requests"])
_service = ChangeRequestService()


@router.post("", response_model=ChangeRequestResponse, status_code=201)
async def create_change_request(
    body: ChangeRequestCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    cr = await _service.create_change_request(
        db,
        title=body.title,
        description=body.description,
        change_type=body.change_type,
        risk_level=body.risk_level,
        priority=body.priority,
        requester_id=current_user.id,
        planned_start_at=body.planned_start_at,
        planned_end_at=body.planned_end_at,
        rollback_plan=body.rollback_plan,
        implementer_id=body.implementer_id,
    )
    return cr


@router.get("", response_model=PaginatedResponse[ChangeRequestResponse])
async def list_change_requests(
    status: Optional[ChangeRequestStatus] = Query(None),
    change_type: Optional[ChangeRequestType] = Query(None),
    risk_level: Optional[ChangeRequestRisk] = Query(None),
    priority: Optional[ChangeRequestPriority] = Query(None),
    requester_id: Optional[UUID] = Query(None),
    implementer_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    items, total = await _service.get_multi_filtered(
        db,
        status=status,
        change_type=change_type,
        risk_level=risk_level,
        priority=priority,
        requester_id=requester_id,
        implementer_id=implementer_id,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        items=[ChangeRequestResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{request_id}", response_model=ChangeRequestDetailResponse)
async def get_change_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    cr = await _service.get_with_logs(db, request_id)
    if not cr:
        raise NotFoundError("ChangeRequest", str(request_id))
    return cr


@router.put("/{request_id}", response_model=ChangeRequestResponse)
async def update_change_request(
    request_id: UUID,
    body: ChangeRequestUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    cr = await _service.get(db, request_id)
    if not cr:
        raise NotFoundError("ChangeRequest", str(request_id))
    updated = await _service.update(
        db,
        cr,
        **{k: v for k, v in body.model_dump(exclude_none=True).items()},
    )
    return updated


@router.post("/{request_id}/approve", response_model=ChangeRequestDetailResponse)
async def approve_change_request(
    request_id: UUID,
    body: ChangeRequestApprove,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    cr = await _service.transition_status(
        db,
        request_id=request_id,
        to_status=ChangeRequestStatus.APPROVED,
        changed_by_id=current_user.id,
        comment=body.comment,
        approver_id=current_user.id,
        reviewer_id=body.reviewer_id,
    )
    result = await _service.get_with_logs(db, cr.id)
    return result


@router.post("/{request_id}/reject", response_model=ChangeRequestDetailResponse)
async def reject_change_request(
    request_id: UUID,
    body: ChangeRequestReject,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    cr = await _service.transition_status(
        db,
        request_id=request_id,
        to_status=ChangeRequestStatus.REJECTED,
        changed_by_id=current_user.id,
        comment=body.rejection_reason,
        approver_id=current_user.id,
        rejection_reason=body.rejection_reason,
    )
    result = await _service.get_with_logs(db, cr.id)
    return result


@router.post("/{request_id}/transition", response_model=ChangeRequestDetailResponse)
async def transition_change_request(
    request_id: UUID,
    body: ChangeRequestTransition,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    cr = await _service.transition_status(
        db,
        request_id=request_id,
        to_status=body.to_status,
        changed_by_id=current_user.id,
        comment=body.comment,
    )
    result = await _service.get_with_logs(db, cr.id)
    return result


@router.get("/{request_id}/transitions", response_model=list[str])
async def get_allowed_transitions(
    request_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    cr = await _service.get(db, request_id)
    if not cr:
        raise NotFoundError("ChangeRequest", str(request_id))
    allowed = ChangeRequestWorkflowService.get_allowed_transitions(cr.status)
    return [s.value for s in allowed]
