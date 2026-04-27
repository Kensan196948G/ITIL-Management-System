import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.service_request import ServiceRequestCategory, ServiceRequestStatus


class ServiceRequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    category: ServiceRequestCategory = ServiceRequestCategory.OTHER
    due_date: Optional[datetime] = None
    assignee_id: Optional[uuid.UUID] = None


class ServiceRequestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    category: Optional[ServiceRequestCategory] = None
    due_date: Optional[datetime] = None


class ServiceRequestApprove(BaseModel):
    comment: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None


class ServiceRequestReject(BaseModel):
    rejection_reason: str = Field(..., min_length=1)


class ServiceRequestTransition(BaseModel):
    to_status: ServiceRequestStatus
    comment: Optional[str] = None


class ServiceRequestStatusLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    service_request_id: uuid.UUID
    from_status: Optional[ServiceRequestStatus]
    to_status: ServiceRequestStatus
    changed_by_id: uuid.UUID
    comment: Optional[str]
    created_at: datetime


class ServiceRequestResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    title: str
    description: str
    status: ServiceRequestStatus
    category: ServiceRequestCategory
    requester_id: uuid.UUID
    approver_id: Optional[uuid.UUID]
    assignee_id: Optional[uuid.UUID]
    due_date: Optional[datetime]
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    completed_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime
    updated_at: datetime


class ServiceRequestDetailResponse(ServiceRequestResponse):
    status_logs: list[ServiceRequestStatusLogResponse] = []
