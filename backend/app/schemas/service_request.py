import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.service_request import (
    FulfillmentTaskStatus,
    ServiceRequestCategory,
    ServiceRequestStatus,
)


# ---- Service Catalog schemas ----

class ServiceCatalogItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: ServiceRequestCategory = ServiceRequestCategory.OTHER
    estimated_days: Optional[int] = Field(None, ge=1)
    requires_approval: bool = True
    is_active: bool = True


class ServiceCatalogItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    category: Optional[ServiceRequestCategory] = None
    estimated_days: Optional[int] = Field(None, ge=1)
    requires_approval: Optional[bool] = None
    is_active: Optional[bool] = None


class ServiceCatalogItemResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    description: str
    category: ServiceRequestCategory
    estimated_days: Optional[int]
    requires_approval: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ---- Fulfillment Task schemas ----

class FulfillmentTaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    order: int = 0


class FulfillmentTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = None
    status: Optional[FulfillmentTaskStatus] = None
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    order: Optional[int] = None


class FulfillmentTaskResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    service_request_id: uuid.UUID
    title: str
    description: Optional[str]
    status: FulfillmentTaskStatus
    assignee_id: Optional[uuid.UUID]
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    notes: Optional[str]
    order: int
    created_at: datetime
    updated_at: datetime


# ---- Service Request schemas ----

class ServiceRequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    category: ServiceRequestCategory = ServiceRequestCategory.OTHER
    catalog_item_id: Optional[uuid.UUID] = None
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
    catalog_item_id: Optional[uuid.UUID]
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
    fulfillment_tasks: list[FulfillmentTaskResponse] = []
