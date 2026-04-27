import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.notification import NotificationCategory, NotificationPriority


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    category: NotificationCategory
    priority: NotificationPriority
    is_read: bool
    related_id: Optional[str] = None
    related_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    title: str
    message: str
    category: NotificationCategory
    priority: NotificationPriority = NotificationPriority.MEDIUM
    related_id: Optional[str] = None
    related_url: Optional[str] = None


class NotificationMarkRead(BaseModel):
    notification_ids: list[uuid.UUID]
