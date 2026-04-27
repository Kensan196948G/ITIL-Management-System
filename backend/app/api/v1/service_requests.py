from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.core.errors import NotFoundError
from app.core.pagination import PaginatedResponse
from app.models.service_request import (
    FulfillmentTask,
    ServiceCatalogItem,
    ServiceRequestCategory,
    ServiceRequestStatus,
)
from app.models.user import User
from app.schemas.service_request import (
    FulfillmentTaskCreate,
    FulfillmentTaskResponse,
    FulfillmentTaskUpdate,
    ServiceCatalogItemCreate,
    ServiceCatalogItemResponse,
    ServiceCatalogItemUpdate,
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


# ---- Service Catalog endpoints ----

@router.get("/catalog", response_model=list[ServiceCatalogItemResponse])
async def list_catalog_items(
    active_only: bool = Query(True, description="Return only active items"),
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    query = select(ServiceCatalogItem)
    if active_only:
        query = query.where(ServiceCatalogItem.is_active == True)  # noqa: E712
    result = await db.execute(query.order_by(ServiceCatalogItem.name))
    return result.scalars().all()


@router.post("/catalog", response_model=ServiceCatalogItemResponse, status_code=201)
async def create_catalog_item(
    body: ServiceCatalogItemCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    item = ServiceCatalogItem(**body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.get("/catalog/{item_id}", response_model=ServiceCatalogItemResponse)
async def get_catalog_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(ServiceCatalogItem).where(ServiceCatalogItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundError("ServiceCatalogItem", str(item_id))
    return item


@router.put("/catalog/{item_id}", response_model=ServiceCatalogItemResponse)
async def update_catalog_item(
    item_id: UUID,
    body: ServiceCatalogItemUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    result = await db.execute(select(ServiceCatalogItem).where(ServiceCatalogItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundError("ServiceCatalogItem", str(item_id))
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(item, key, value)
    await db.flush()
    await db.refresh(item)
    return item


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
        catalog_item_id=body.catalog_item_id,
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


# ---- Fulfillment Task endpoints ----

@router.get("/{request_id}/tasks", response_model=list[FulfillmentTaskResponse])
async def list_fulfillment_tasks(
    request_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    sr = await _service.get(db, request_id)
    if not sr:
        raise NotFoundError("ServiceRequest", str(request_id))
    result = await db.execute(
        select(FulfillmentTask)
        .where(FulfillmentTask.service_request_id == request_id)
        .order_by(FulfillmentTask.order, FulfillmentTask.created_at)
    )
    return result.scalars().all()


@router.post("/{request_id}/tasks", response_model=FulfillmentTaskResponse, status_code=201)
async def create_fulfillment_task(
    request_id: UUID,
    body: FulfillmentTaskCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    sr = await _service.get(db, request_id)
    if not sr:
        raise NotFoundError("ServiceRequest", str(request_id))
    task = FulfillmentTask(
        service_request_id=request_id,
        title=body.title,
        description=body.description,
        assignee_id=body.assignee_id,
        due_date=body.due_date,
        order=body.order,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.put("/{request_id}/tasks/{task_id}", response_model=FulfillmentTaskResponse)
async def update_fulfillment_task(
    request_id: UUID,
    task_id: UUID,
    body: FulfillmentTaskUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    result = await db.execute(
        select(FulfillmentTask).where(
            FulfillmentTask.id == task_id,
            FulfillmentTask.service_request_id == request_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundError("FulfillmentTask", str(task_id))
    from datetime import datetime, timezone
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(task, key, value)
    if body.status and body.status.value == "completed" and not task.completed_at:
        task.completed_at = datetime.now(tz=timezone.utc)
    await db.flush()
    await db.refresh(task)
    return task
