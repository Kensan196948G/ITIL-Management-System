import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.database import get_session
from app.models.notification import NotificationCategory
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationMarkRead
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
    category: Optional[NotificationCategory] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    svc = NotificationService(db)
    return await svc.list_for_user(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
        category=category,
    )


@router.patch("/read", status_code=status.HTTP_200_OK)
async def mark_notifications_read(
    body: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    svc = NotificationService(db)
    count = await svc.mark_as_read(user_id=current_user.id, notification_ids=body.notification_ids)
    return {"marked_read": count}


@router.patch("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    svc = NotificationService(db)
    count = await svc.mark_as_read(user_id=current_user.id)
    return {"marked_read": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    svc = NotificationService(db)
    deleted = await svc.delete(notification_id=notification_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
