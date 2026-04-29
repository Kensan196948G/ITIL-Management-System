import uuid
from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationCategory, NotificationPriority
from app.schemas.notification import NotificationCreate, NotificationListResponse, NotificationResponse


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: NotificationCreate) -> Notification:
        notification = Notification(
            user_id=data.user_id,
            title=data.title,
            message=data.message,
            category=data.category,
            priority=data.priority,
            related_id=data.related_id,
            related_url=data.related_url,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
        category: Optional[NotificationCategory] = None,
    ) -> NotificationListResponse:
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = select(func.count()).select_from(Notification).where(Notification.user_id == user_id)
        unread_query = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id, Notification.is_read.is_(False)
        )

        if unread_only:
            query = query.where(Notification.is_read.is_(False))
            count_query = count_query.where(Notification.is_read.is_(False))

        if category:
            query = query.where(Notification.category == category)
            count_query = count_query.where(Notification.category == category)

        query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        items = result.scalars().all()

        total = (await self.db.execute(count_query)).scalar_one()
        unread_count = (await self.db.execute(unread_query)).scalar_one()

        return NotificationListResponse(
            items=[NotificationResponse.model_validate(n) for n in items],
            total=total,
            unread_count=unread_count,
        )

    async def mark_as_read(
        self, user_id: uuid.UUID, notification_ids: Optional[list[uuid.UUID]] = None
    ) -> int:
        query = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        )
        if notification_ids:
            query = query.where(Notification.id.in_(notification_ids))

        result = await self.db.execute(query.values(is_read=True))
        await self.db.commit()
        return result.rowcount

    async def delete(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id, Notification.user_id == user_id
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            return False
        await self.db.delete(notification)
        await self.db.commit()
        return True

    async def notify_incident_assigned(
        self, db: AsyncSession, assignee_id: uuid.UUID, incident_id: str, incident_title: str
    ) -> Notification:
        svc = NotificationService(db)
        return await svc.create(
            NotificationCreate(
                user_id=assignee_id,
                title="インシデントが割り当てられました",
                message=f"インシデント「{incident_title}」があなたに割り当てられました。",
                category=NotificationCategory.INCIDENT,
                priority=NotificationPriority.HIGH,
                related_id=incident_id,
                related_url=f"/incidents/{incident_id}",
            )
        )


async def notify_sr_approval_needed(
    db: AsyncSession, approver_id: uuid.UUID, sr_id: str, sr_title: str
) -> Notification:
    svc = NotificationService(db)
    return await svc.create(
        NotificationCreate(
            user_id=approver_id,
            title="サービスリクエストの承認が必要です",
            message=f"サービスリクエスト「{sr_title}」の承認が必要です。",
            category=NotificationCategory.SERVICE_REQUEST,
            priority=NotificationPriority.MEDIUM,
            related_id=sr_id,
            related_url=f"/service-requests/{sr_id}",
        )
    )


async def notify_cr_approval_needed(
    db: AsyncSession, approver_id: uuid.UUID, cr_id: str, cr_title: str
) -> Notification:
    svc = NotificationService(db)
    return await svc.create(
        NotificationCreate(
            user_id=approver_id,
            title="変更申請の承認が必要です",
            message=f"変更申請「{cr_title}」の承認が必要です。",
            category=NotificationCategory.CHANGE_REQUEST,
            priority=NotificationPriority.MEDIUM,
            related_id=cr_id,
            related_url=f"/change-requests/{cr_id}",
        )
    )
