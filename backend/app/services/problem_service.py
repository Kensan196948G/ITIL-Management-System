from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select, func, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.base_service import BaseService
from app.core.errors import NotFoundError, ConflictError
from app.models.incident import Incident
from app.models.problem import Problem, ProblemIncident, ProblemStatus, ProblemStatusLog
from app.services.problem_workflow import ProblemWorkflowService


class ProblemService(BaseService[Problem]):
    def __init__(self):
        super().__init__(Problem)

    async def get_with_details(self, db: AsyncSession, problem_id: UUID) -> Optional[Problem]:
        result = await db.execute(
            select(Problem)
            .where(Problem.id == problem_id)
            .options(
                selectinload(Problem.status_logs),
                selectinload(Problem.linked_incidents),
            )
        )
        return result.scalar_one_or_none()

    async def create_problem(
        self,
        db: AsyncSession,
        *,
        title: str,
        description: str,
        priority,
        reporter_id: UUID,
        assignee_id: Optional[UUID] = None,
        root_cause: Optional[str] = None,
        workaround: Optional[str] = None,
    ) -> Problem:
        problem = Problem(
            title=title,
            description=description,
            status=ProblemStatus.OPEN,
            priority=priority,
            reporter_id=reporter_id,
            assignee_id=assignee_id,
            root_cause=root_cause,
            workaround=workaround,
        )
        db.add(problem)
        await db.flush()

        log = ProblemStatusLog(
            problem_id=problem.id,
            from_status=None,
            to_status=ProblemStatus.OPEN,
            changed_by_id=reporter_id,
            comment="Problem created",
        )
        db.add(log)
        await db.flush()
        await db.refresh(problem)
        return problem

    async def transition_status(
        self,
        db: AsyncSession,
        *,
        problem_id: UUID,
        to_status: ProblemStatus,
        changed_by_id: UUID,
        comment: Optional[str] = None,
    ) -> Problem:
        problem = await self.get(db, problem_id)
        if not problem:
            raise NotFoundError("Problem", str(problem_id))

        ProblemWorkflowService.validate_transition(problem.status, to_status)

        from_status = problem.status
        problem.status = to_status

        now = datetime.now(tz=timezone.utc)
        if to_status == ProblemStatus.RESOLVED:
            problem.resolved_at = now
        elif to_status == ProblemStatus.CLOSED:
            problem.closed_at = now
        elif to_status == ProblemStatus.KNOWN_ERROR:
            problem.is_known_error = True

        log = ProblemStatusLog(
            problem_id=problem.id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=changed_by_id,
            comment=comment,
        )
        db.add(log)
        await db.flush()
        await db.refresh(problem)
        return problem

    async def link_incident(
        self, db: AsyncSession, *, problem_id: UUID, incident_id: UUID
    ) -> Problem:
        problem = await self.get(db, problem_id)
        if not problem:
            raise NotFoundError("Problem", str(problem_id))

        incident = await db.get(Incident, incident_id)
        if not incident:
            raise NotFoundError("Incident", str(incident_id))

        existing = await db.execute(
            select(ProblemIncident).where(
                ProblemIncident.problem_id == problem_id,
                ProblemIncident.incident_id == incident_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError("Incident is already linked to this problem")

        link = ProblemIncident(problem_id=problem_id, incident_id=incident_id)
        db.add(link)
        await db.flush()
        return await self.get_with_details(db, problem_id)

    async def unlink_incident(
        self, db: AsyncSession, *, problem_id: UUID, incident_id: UUID
    ) -> Problem:
        problem = await self.get(db, problem_id)
        if not problem:
            raise NotFoundError("Problem", str(problem_id))

        await db.execute(
            delete(ProblemIncident).where(
                ProblemIncident.problem_id == problem_id,
                ProblemIncident.incident_id == incident_id,
            )
        )
        await db.flush()
        return await self.get_with_details(db, problem_id)

    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        status: Optional[ProblemStatus] = None,
        priority=None,
        assignee_id: Optional[UUID] = None,
        reporter_id: Optional[UUID] = None,
        is_known_error: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Problem], int]:
        query = select(Problem)
        count_query = select(func.count()).select_from(Problem)

        filters = []
        if status:
            filters.append(Problem.status == status)
        if priority:
            filters.append(Problem.priority == priority)
        if assignee_id:
            filters.append(Problem.assignee_id == assignee_id)
        if reporter_id:
            filters.append(Problem.reporter_id == reporter_id)
        if is_known_error is not None:
            filters.append(Problem.is_known_error == is_known_error)
        if search:
            pattern = f"%{search}%"
            filters.append(
                or_(
                    Problem.title.ilike(pattern),
                    Problem.description.ilike(pattern),
                )
            )

        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        result = await db.execute(
            query.order_by(Problem.created_at.desc()).offset(offset).limit(page_size)
        )
        return result.scalars().all(), total
