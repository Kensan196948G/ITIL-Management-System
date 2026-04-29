from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.base_service import BaseService
from app.core.errors import NotFoundError
from app.models.change_request import (
    ChangeRequest,
    ChangeRequestPriority,
    ChangeRequestRisk,
    ChangeRequestStatus,
    ChangeRequestStatusLog,
    ChangeRequestType,
)
from app.services.change_request_workflow import ChangeRequestWorkflowService


class ChangeRequestService(BaseService[ChangeRequest]):
    def __init__(self):
        super().__init__(ChangeRequest)

    async def get_with_logs(
        self, db: AsyncSession, request_id: UUID
    ) -> Optional[ChangeRequest]:
        result = await db.execute(
            select(ChangeRequest)
            .where(ChangeRequest.id == request_id)
            .options(selectinload(ChangeRequest.status_logs))
        )
        return result.scalar_one_or_none()

    async def create_change_request(
        self,
        db: AsyncSession,
        *,
        title: str,
        description: str,
        change_type: ChangeRequestType,
        risk_level: ChangeRequestRisk,
        priority: ChangeRequestPriority,
        requester_id: UUID,
        planned_start_at: Optional[datetime] = None,
        planned_end_at: Optional[datetime] = None,
        rollback_plan: Optional[str] = None,
        implementer_id: Optional[UUID] = None,
    ) -> ChangeRequest:
        cr = ChangeRequest(
            title=title,
            description=description,
            status=ChangeRequestStatus.DRAFT,
            change_type=change_type,
            risk_level=risk_level,
            priority=priority,
            requester_id=requester_id,
            planned_start_at=planned_start_at,
            planned_end_at=planned_end_at,
            rollback_plan=rollback_plan,
            implementer_id=implementer_id,
        )
        db.add(cr)
        await db.flush()

        log = ChangeRequestStatusLog(
            change_request_id=cr.id,
            from_status=None,
            to_status=ChangeRequestStatus.DRAFT,
            changed_by_id=requester_id,
            comment="Change request created",
        )
        db.add(log)
        await db.flush()
        await db.refresh(cr)
        return cr

    async def transition_status(
        self,
        db: AsyncSession,
        *,
        request_id: UUID,
        to_status: ChangeRequestStatus,
        changed_by_id: UUID,
        comment: Optional[str] = None,
        approver_id: Optional[UUID] = None,
        reviewer_id: Optional[UUID] = None,
        rejection_reason: Optional[str] = None,
    ) -> ChangeRequest:
        cr = await self.get(db, request_id)
        if not cr:
            raise NotFoundError("ChangeRequest", str(request_id))

        ChangeRequestWorkflowService.validate_transition(cr.status, to_status)

        from_status = cr.status
        cr.status = to_status

        now = datetime.now(tz=timezone.utc)
        if to_status == ChangeRequestStatus.APPROVED:
            cr.approved_at = now
            if approver_id:
                cr.approver_id = approver_id
            if reviewer_id:
                cr.reviewer_id = reviewer_id
        elif to_status == ChangeRequestStatus.REJECTED:
            cr.rejected_at = now
            if approver_id:
                cr.approver_id = approver_id
            if rejection_reason:
                cr.rejection_reason = rejection_reason
        elif to_status == ChangeRequestStatus.IN_PROGRESS:
            cr.actual_start_at = now
        elif to_status in {ChangeRequestStatus.COMPLETED, ChangeRequestStatus.FAILED}:
            cr.completed_at = now
            cr.actual_end_at = now

        log = ChangeRequestStatusLog(
            change_request_id=cr.id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=changed_by_id,
            comment=comment,
        )
        db.add(log)
        await db.flush()
        await db.refresh(cr)

        if to_status == ChangeRequestStatus.SUBMITTED and reviewer_id:
            try:
                from app.services.notification_service import notify_cr_approval_needed
                await notify_cr_approval_needed(db, reviewer_id, str(cr.id), cr.title)
            except Exception:
                pass

        return cr

    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        status: Optional[ChangeRequestStatus] = None,
        change_type: Optional[ChangeRequestType] = None,
        risk_level: Optional[ChangeRequestRisk] = None,
        priority: Optional[ChangeRequestPriority] = None,
        requester_id: Optional[UUID] = None,
        implementer_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[ChangeRequest], int]:
        query = select(ChangeRequest)
        count_query = select(func.count()).select_from(ChangeRequest)

        filters = []
        if status:
            filters.append(ChangeRequest.status == status)
        if change_type:
            filters.append(ChangeRequest.change_type == change_type)
        if risk_level:
            filters.append(ChangeRequest.risk_level == risk_level)
        if priority:
            filters.append(ChangeRequest.priority == priority)
        if requester_id:
            filters.append(ChangeRequest.requester_id == requester_id)
        if implementer_id:
            filters.append(ChangeRequest.implementer_id == implementer_id)

        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        result = await db.execute(
            query.order_by(ChangeRequest.created_at.desc()).offset(offset).limit(page_size)
        )
        return result.scalars().all(), total
