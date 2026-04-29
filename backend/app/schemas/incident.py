import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.incident import IncidentPriority, IncidentStatus


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    priority: IncidentPriority = IncidentPriority.P3_MEDIUM
    category: Optional[str] = Field(None, max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    assignee_id: Optional[uuid.UUID] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    priority: Optional[IncidentPriority] = None
    category: Optional[str] = Field(None, max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)


class IncidentTransition(BaseModel):
    to_status: IncidentStatus
    comment: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None


class IncidentAssign(BaseModel):
    assignee_id: uuid.UUID
    comment: Optional[str] = None


class StatusLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    incident_id: uuid.UUID
    from_status: Optional[IncidentStatus]
    to_status: IncidentStatus
    changed_by_id: uuid.UUID
    comment: Optional[str]
    created_at: datetime


class IncidentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    description: str
    status: IncidentStatus
    priority: IncidentPriority
    category: Optional[str]
    subcategory: Optional[str]
    reporter_id: uuid.UUID
    assignee_id: Optional[uuid.UUID]
    sla_due_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class IncidentDetailResponse(IncidentResponse):
    status_logs: list[StatusLogResponse] = []


# ---- SLA Policy schemas ----

class SLAPolicyCreate(BaseModel):
    priority: IncidentPriority
    response_time_minutes: int = Field(..., ge=1)
    resolution_time_minutes: int = Field(..., ge=1)
    is_active: bool = True


class SLAPolicyUpdate(BaseModel):
    response_time_minutes: Optional[int] = Field(None, ge=1)
    resolution_time_minutes: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None


class SLAPolicyResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    priority: IncidentPriority
    response_time_minutes: int
    resolution_time_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class IncidentSLAStatus(BaseModel):
    incident_id: uuid.UUID
    sla_due_at: Optional[datetime]
    is_overdue: bool
    remaining_minutes: Optional[int]
    priority: IncidentPriority
    status: IncidentStatus
