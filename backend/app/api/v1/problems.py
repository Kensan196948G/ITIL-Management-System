from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.core.errors import NotFoundError
from app.core.pagination import PaginatedResponse
from app.models.problem import ProblemPriority, ProblemStatus
from app.models.user import User
from app.schemas.problem import (
    LinkIncidentRequest,
    ProblemCreate,
    ProblemDetailResponse,
    ProblemResponse,
    ProblemTransition,
    ProblemUpdate,
)
from app.services.problem_service import ProblemService
from app.services.problem_workflow import ProblemWorkflowService

router = APIRouter(prefix="/problems", tags=["problems"])
_service = ProblemService()


@router.post("", response_model=ProblemResponse, status_code=201)
async def create_problem(
    body: ProblemCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    problem = await _service.create_problem(
        db,
        title=body.title,
        description=body.description,
        priority=body.priority,
        reporter_id=current_user.id,
        assignee_id=body.assignee_id,
        root_cause=body.root_cause,
        workaround=body.workaround,
    )
    return problem


@router.get("", response_model=PaginatedResponse[ProblemResponse])
async def list_problems(
    status: Optional[ProblemStatus] = Query(None),
    priority: Optional[ProblemPriority] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    is_known_error: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
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
        is_known_error=is_known_error,
        search=search,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(
        items=[ProblemResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{problem_id}", response_model=ProblemDetailResponse)
async def get_problem(
    problem_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    problem = await _service.get_with_details(db, problem_id)
    if not problem:
        raise NotFoundError("Problem", str(problem_id))
    return problem


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: UUID,
    body: ProblemUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    problem = await _service.get(db, problem_id)
    if not problem:
        raise NotFoundError("Problem", str(problem_id))
    updated = await _service.update(
        db,
        problem,
        **{k: v for k, v in body.model_dump(exclude_none=True).items()},
    )
    return updated


@router.post("/{problem_id}/transition", response_model=ProblemDetailResponse)
async def transition_problem(
    problem_id: UUID,
    body: ProblemTransition,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_agent_or_admin),
):
    await _service.transition_status(
        db,
        problem_id=problem_id,
        to_status=body.to_status,
        changed_by_id=current_user.id,
        comment=body.comment,
    )
    result = await _service.get_with_details(db, problem_id)
    return result


@router.get("/{problem_id}/transitions", response_model=list[str])
async def get_allowed_transitions(
    problem_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    problem = await _service.get(db, problem_id)
    if not problem:
        raise NotFoundError("Problem", str(problem_id))
    allowed = ProblemWorkflowService.get_allowed_transitions(problem.status)
    return [s.value for s in allowed]


@router.post("/{problem_id}/link-incident", response_model=ProblemDetailResponse)
async def link_incident(
    problem_id: UUID,
    body: LinkIncidentRequest,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    return await _service.link_incident(
        db, problem_id=problem_id, incident_id=body.incident_id
    )


@router.delete("/{problem_id}/unlink-incident/{incident_id}", response_model=ProblemDetailResponse)
async def unlink_incident(
    problem_id: UUID,
    incident_id: UUID,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_agent_or_admin),
):
    return await _service.unlink_incident(
        db, problem_id=problem_id, incident_id=incident_id
    )
