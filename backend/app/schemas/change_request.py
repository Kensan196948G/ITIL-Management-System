import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.change_request import (
    ChangeRequestPriority,
    ChangeRequestRisk,
    ChangeRequestStatus,
    ChangeRequestType,
)


class ChangeRequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    change_type: ChangeRequestType = ChangeRequestType.NORMAL
    risk_level: ChangeRequestRisk = ChangeRequestRisk.MEDIUM
    priority: ChangeRequestPriority = ChangeRequestPriority.MEDIUM
    planned_start_at: Optional[datetime] = None
    planned_end_at: Optional[datetime] = None
    rollback_plan: Optional[str] = None
    implementer_id: Optional[uuid.UUID] = None


class ChangeRequestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    change_type: Optional[ChangeRequestType] = None
    risk_level: Optional[ChangeRequestRisk] = None
    priority: Optional[ChangeRequestPriority] = None
    planned_start_at: Optional[datetime] = None
    planned_end_at: Optional[datetime] = None
    rollback_plan: Optional[str] = None
    implementer_id: Optional[uuid.UUID] = None


class ChangeRequestApprove(BaseModel):
    comment: Optional[str] = None
    reviewer_id: Optional[uuid.UUID] = None


class ChangeRequestReject(BaseModel):
    rejection_reason: str = Field(..., min_length=1)


class ChangeRequestTransition(BaseModel):
    to_status: ChangeRequestStatus
    comment: Optional[str] = None


class ChangeRequestStatusLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    change_request_id: uuid.UUID
    from_status: Optional[ChangeRequestStatus]
    to_status: ChangeRequestStatus
    changed_by_id: uuid.UUID
    comment: Optional[str]
    created_at: datetime


class ChangeRequestResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    description: str
    status: ChangeRequestStatus
    change_type: ChangeRequestType
    risk_level: ChangeRequestRisk
    priority: ChangeRequestPriority
    requester_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID]
    approver_id: Optional[uuid.UUID]
    implementer_id: Optional[uuid.UUID]
    planned_start_at: Optional[datetime]
    planned_end_at: Optional[datetime]
    actual_start_at: Optional[datetime]
    actual_end_at: Optional[datetime]
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    completed_at: Optional[datetime]
    rejection_reason: Optional[str]
    rollback_plan: Optional[str]
    created_at: datetime
    updated_at: datetime


class ChangeRequestDetailResponse(ChangeRequestResponse):
    status_logs: list[ChangeRequestStatusLogResponse] = []
