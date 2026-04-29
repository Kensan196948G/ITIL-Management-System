import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.problem import ProblemPriority, ProblemStatus
from app.schemas.incident import IncidentResponse


class ProblemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    priority: ProblemPriority = ProblemPriority.P3_MEDIUM
    assignee_id: Optional[uuid.UUID] = None
    root_cause: Optional[str] = None
    workaround: Optional[str] = None


class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    priority: Optional[ProblemPriority] = None
    assignee_id: Optional[uuid.UUID] = None
    root_cause: Optional[str] = None
    workaround: Optional[str] = None
    is_known_error: Optional[bool] = None


class ProblemTransition(BaseModel):
    to_status: ProblemStatus
    comment: Optional[str] = None


class ProblemStatusLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    problem_id: uuid.UUID
    from_status: Optional[ProblemStatus]
    to_status: ProblemStatus
    changed_by_id: uuid.UUID
    comment: Optional[str]
    created_at: datetime


class ProblemResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    description: str
    status: ProblemStatus
    priority: ProblemPriority
    reporter_id: uuid.UUID
    assignee_id: Optional[uuid.UUID]
    root_cause: Optional[str]
    workaround: Optional[str]
    is_known_error: bool
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class ProblemDetailResponse(ProblemResponse):
    status_logs: list[ProblemStatusLogResponse] = []
    linked_incidents: list[IncidentResponse] = []


class LinkIncidentRequest(BaseModel):
    incident_id: uuid.UUID
