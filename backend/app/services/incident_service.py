from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.base_service import BaseService
from app.core.errors import NotFoundError
from app.models.incident import Incident, IncidentStatus, IncidentStatusLog, SLAPolicy
from app.services.incident_workflow import IncidentWorkflowService
from app.services.sla_service import SLAService


class IncidentService(BaseService[Incident]):
    def __init__(self):
        super().__init__(Incident)

    async def get_with_logs(self, db: AsyncSession, incident_id: UUID) -> Optional[Incident]:
        result = await db.execute(
            select(Incident)
            .where(Incident.id == incident_id)
            .options(selectinload(Incident.status_logs))
        )
        return result.scalar_one_or_none()

    async def create_incident(
        self,
        db: AsyncSession,
        *,
        title: str,
        description: str,
        priority,
        reporter_id: UUID,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        assignee_id: Optional[UUID] = None,
        sla_policy: Optional[SLAPolicy] = None,
    ) -> Incident:
        sla_due_at = SLAService.compute_due_at(priority, sla_policy)
        initial_status = (
            IncidentStatus.ASSIGNED if assignee_id else IncidentStatus.NEW
        )

        incident = Incident(
            title=title,
            description=description,
            status=initial_status,
            priority=priority,
            category=category,
            subcategory=subcategory,
            reporter_id=reporter_id,
            assignee_id=assignee_id,
            sla_due_at=sla_due_at,
        )
        db.add(incident)
        await db.flush()

        log = IncidentStatusLog(
            incident_id=incident.id,
            from_status=None,
            to_status=initial_status,
            changed_by_id=reporter_id,
            comment="Incident created",
        )
        db.add(log)
        await db.flush()
        await db.refresh(incident)

        if assignee_id:
            try:
                from app.services.notification_service import NotificationService
                await NotificationService(db).notify_incident_assigned(
                    db, assignee_id, str(incident.id), incident.title
                )
            except Exception:
                pass

        return incident

    async def transition_status(
        self,
        db: AsyncSession,
        *,
        incident_id: UUID,
        to_status: IncidentStatus,
        changed_by_id: UUID,
        comment: Optional[str] = None,
        assignee_id: Optional[UUID] = None,
    ) -> Incident:
        incident = await self.get(db, incident_id)
        if not incident:
            raise NotFoundError("Incident", str(incident_id))

        IncidentWorkflowService.validate_transition(incident.status, to_status)

        from_status = incident.status
        incident.status = to_status

        if assignee_id is not None:
            incident.assignee_id = assignee_id

        now = datetime.now(tz=timezone.utc)
        if to_status == IncidentStatus.RESOLVED:
            incident.resolved_at = now
        elif to_status == IncidentStatus.CLOSED:
            incident.closed_at = now

        log = IncidentStatusLog(
            incident_id=incident.id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=changed_by_id,
            comment=comment,
        )
        db.add(log)
        await db.flush()
        await db.refresh(incident)
        return incident

    async def assign(
        self,
        db: AsyncSession,
        *,
        incident_id: UUID,
        assignee_id: UUID,
        changed_by_id: UUID,
        comment: Optional[str] = None,
    ) -> Incident:
        incident = await self.get(db, incident_id)
        if not incident:
            raise NotFoundError("Incident", str(incident_id))

        if incident.status == IncidentStatus.NEW:
            return await self.transition_status(
                db,
                incident_id=incident_id,
                to_status=IncidentStatus.ASSIGNED,
                changed_by_id=changed_by_id,
                comment=comment or f"Assigned to user {assignee_id}",
                assignee_id=assignee_id,
            )

        incident.assignee_id = assignee_id
        await db.flush()
        await db.refresh(incident)

        try:
            from app.services.notification_service import NotificationService
            await NotificationService(db).notify_incident_assigned(
                db, assignee_id, str(incident.id), incident.title
            )
        except Exception:
            pass

        return incident

    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        status: Optional[IncidentStatus] = None,
        priority=None,
        assignee_id: Optional[UUID] = None,
        reporter_id: Optional[UUID] = None,
        search: Optional[str] = None,
        created_from: Optional[datetime] = None,
        created_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Incident], int]:
        query = select(Incident)
        count_query = select(func.count()).select_from(Incident)

        filters = []
        if status:
            filters.append(Incident.status == status)
        if priority:
            filters.append(Incident.priority == priority)
        if assignee_id:
            filters.append(Incident.assignee_id == assignee_id)
        if reporter_id:
            filters.append(Incident.reporter_id == reporter_id)
        if search:
            pattern = f"%{search}%"
            filters.append(
                or_(
                    Incident.title.ilike(pattern),
                    Incident.description.ilike(pattern),
                )
            )
        if created_from:
            filters.append(Incident.created_at >= created_from)
        if created_to:
            filters.append(Incident.created_at <= created_to)

        if filters:
            for f in filters:
                query = query.where(f)
                count_query = count_query.where(f)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        result = await db.execute(
            query.order_by(Incident.created_at.desc()).offset(offset).limit(page_size)
        )
        return result.scalars().all(), total
