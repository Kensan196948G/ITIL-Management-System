from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.base_service import BaseService
from app.core.errors import NotFoundError
from app.models.service_request import (
    FulfillmentTask,
    ServiceRequest,
    ServiceRequestCategory,
    ServiceRequestStatus,
    ServiceRequestStatusLog,
)
from app.services.service_request_workflow import ServiceRequestWorkflowService


class ServiceRequestService(BaseService[ServiceRequest]):
    def __init__(self):
        super().__init__(ServiceRequest)

    async def get_with_logs(
        self, db: AsyncSession, request_id: UUID
    ) -> Optional[ServiceRequest]:
        result = await db.execute(
            select(ServiceRequest)
            .where(ServiceRequest.id == request_id)
            .options(
                selectinload(ServiceRequest.status_logs),
                selectinload(ServiceRequest.fulfillment_tasks),
            )
        )
        return result.scalar_one_or_none()

    async def create_service_request(
        self,
        db: AsyncSession,
        *,
        title: str,
        description: str,
        category: ServiceRequestCategory,
        requester_id: UUID,
        catalog_item_id: Optional[UUID] = None,
        due_date: Optional[datetime] = None,
        assignee_id: Optional[UUID] = None,
    ) -> ServiceRequest:
        sr = ServiceRequest(
            title=title,
            description=description,
            status=ServiceRequestStatus.SUBMITTED,
            category=category,
            requester_id=requester_id,
            catalog_item_id=catalog_item_id,
            due_date=due_date,
            assignee_id=assignee_id,
        )
        db.add(sr)
        await db.flush()

        log = ServiceRequestStatusLog(
            service_request_id=sr.id,
            from_status=None,
            to_status=ServiceRequestStatus.SUBMITTED,
            changed_by_id=requester_id,
            comment="Service request submitted",
        )
        db.add(log)
        await db.flush()
        await db.refresh(sr)
        return sr

    async def transition_status(
        self,
        db: AsyncSession,
        *,
        request_id: UUID,
        to_status: ServiceRequestStatus,
        changed_by_id: UUID,
        comment: Optional[str] = None,
        approver_id: Optional[UUID] = None,
        assignee_id: Optional[UUID] = None,
        rejection_reason: Optional[str] = None,
    ) -> ServiceRequest:
        sr = await self.get(db, request_id)
        if not sr:
            raise NotFoundError("ServiceRequest", str(request_id))

        ServiceRequestWorkflowService.validate_transition(sr.status, to_status)

        from_status = sr.status
        sr.status = to_status

        now = datetime.now(tz=timezone.utc)
        if to_status == ServiceRequestStatus.APPROVED:
            sr.approved_at = now
            if approver_id:
                sr.approver_id = approver_id
            if assignee_id:
                sr.assignee_id = assignee_id
        elif to_status == ServiceRequestStatus.REJECTED:
            sr.rejected_at = now
            if approver_id:
                sr.approver_id = approver_id
            if rejection_reason:
                sr.rejection_reason = rejection_reason
        elif to_status == ServiceRequestStatus.COMPLETED:
            sr.completed_at = now
        elif to_status == ServiceRequestStatus.IN_PROGRESS and assignee_id:
            sr.assignee_id = assignee_id

        log = ServiceRequestStatusLog(
            service_request_id=sr.id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=changed_by_id,
            comment=comment,
        )
        db.add(log)
        await db.flush()
        await db.refresh(sr)

        if to_status == ServiceRequestStatus.PENDING_APPROVAL and approver_id:
            try:
                from app.services.notification_service import notify_sr_approval_needed
                await notify_sr_approval_needed(db, approver_id, str(sr.id), sr.title)
            except Exception:
                pass

        return sr

    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        status: Optional[ServiceRequestStatus] = None,
        category: Optional[ServiceRequestCategory] = None,
        requester_id: Optional[UUID] = None,
        assignee_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[ServiceRequest], int]:
        query = select(ServiceRequest)
        count_query = select(func.count()).select_from(ServiceRequest)

        if status:
            query = query.where(ServiceRequest.status == status)
            count_query = count_query.where(ServiceRequest.status == status)
        if category:
            query = query.where(ServiceRequest.category == category)
            count_query = count_query.where(ServiceRequest.category == category)
        if requester_id:
            query = query.where(ServiceRequest.requester_id == requester_id)
            count_query = count_query.where(ServiceRequest.requester_id == requester_id)
        if assignee_id:
            query = query.where(ServiceRequest.assignee_id == assignee_id)
            count_query = count_query.where(ServiceRequest.assignee_id == assignee_id)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        result = await db.execute(
            query.order_by(ServiceRequest.created_at.desc()).offset(offset).limit(page_size)
        )
        return result.scalars().all(), total
