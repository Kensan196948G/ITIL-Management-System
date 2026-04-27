import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user
from app.models.notification import NotificationCategory, NotificationPriority
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse


def make_user():
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "user@example.com"
    user.full_name = "Test User"
    user.role = MagicMock()
    user.role.name = "user"
    return user


def make_notification(user_id=None, is_read=False):
    n = MagicMock()
    n.id = uuid.uuid4()
    n.user_id = user_id or uuid.uuid4()
    n.title = "テスト通知"
    n.message = "テストメッセージです"
    n.category = NotificationCategory.INCIDENT
    n.priority = NotificationPriority.MEDIUM
    n.is_read = is_read
    n.related_id = str(uuid.uuid4())
    n.related_url = "/incidents/abc"
    n.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return n


TEST_USER = make_user()


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


class TestListNotifications:
    def test_list_returns_200(self, client):
        mock_result = NotificationListResponse(items=[], total=0, unread_count=0)
        with patch(
            "app.api.v1.notifications.NotificationService.list_for_user",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            resp = client.get("/api/v1/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["unread_count"] == 0
        assert data["items"] == []

    def test_list_returns_notifications(self, client):
        n = make_notification(user_id=TEST_USER.id)
        nr = NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            title=n.title,
            message=n.message,
            category=n.category,
            priority=n.priority,
            is_read=n.is_read,
            related_id=n.related_id,
            related_url=n.related_url,
            created_at=n.created_at,
        )
        mock_result = NotificationListResponse(items=[nr], total=1, unread_count=1)
        with patch(
            "app.api.v1.notifications.NotificationService.list_for_user",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            resp = client.get("/api/v1/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["unread_count"] == 1
        assert data["items"][0]["title"] == "テスト通知"

    def test_list_unread_only_filter(self, client):
        mock_result = NotificationListResponse(items=[], total=0, unread_count=0)
        with patch(
            "app.api.v1.notifications.NotificationService.list_for_user",
            new_callable=AsyncMock,
            return_value=mock_result,
        ) as mock_svc:
            resp = client.get("/api/v1/notifications?unread_only=true")
        assert resp.status_code == 200

    def test_list_category_filter(self, client):
        mock_result = NotificationListResponse(items=[], total=0, unread_count=0)
        with patch(
            "app.api.v1.notifications.NotificationService.list_for_user",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            resp = client.get("/api/v1/notifications?category=incident")
        assert resp.status_code == 200


class TestMarkRead:
    def test_mark_specific_notifications_read(self, client):
        nid = uuid.uuid4()
        with patch(
            "app.api.v1.notifications.NotificationService.mark_as_read",
            new_callable=AsyncMock,
            return_value=1,
        ):
            resp = client.patch(
                "/api/v1/notifications/read",
                json={"notification_ids": [str(nid)]},
            )
        assert resp.status_code == 200
        assert resp.json()["marked_read"] == 1

    def test_mark_all_read(self, client):
        with patch(
            "app.api.v1.notifications.NotificationService.mark_as_read",
            new_callable=AsyncMock,
            return_value=5,
        ):
            resp = client.patch("/api/v1/notifications/read-all")
        assert resp.status_code == 200
        assert resp.json()["marked_read"] == 5


class TestDeleteNotification:
    def test_delete_existing_notification(self, client):
        nid = uuid.uuid4()
        with patch(
            "app.api.v1.notifications.NotificationService.delete",
            new_callable=AsyncMock,
            return_value=True,
        ):
            resp = client.delete(f"/api/v1/notifications/{nid}")
        assert resp.status_code == 204

    def test_delete_nonexistent_notification_returns_404(self, client):
        nid = uuid.uuid4()
        with patch(
            "app.api.v1.notifications.NotificationService.delete",
            new_callable=AsyncMock,
            return_value=False,
        ):
            resp = client.delete(f"/api/v1/notifications/{nid}")
        assert resp.status_code == 404


class TestNotificationService:
    """Unit tests for NotificationService logic (no DB)."""

    def test_notification_create_schema_validates(self):
        from app.schemas.notification import NotificationCreate
        data = NotificationCreate(
            user_id=uuid.uuid4(),
            title="インシデント通知",
            message="インシデントが割り当てられました",
            category=NotificationCategory.INCIDENT,
            priority=NotificationPriority.HIGH,
            related_id="inc-123",
            related_url="/incidents/inc-123",
        )
        assert data.category == NotificationCategory.INCIDENT
        assert data.priority == NotificationPriority.HIGH

    def test_notification_mark_read_schema_validates(self):
        from app.schemas.notification import NotificationMarkRead
        ids = [uuid.uuid4(), uuid.uuid4()]
        data = NotificationMarkRead(notification_ids=ids)
        assert len(data.notification_ids) == 2

    def test_notification_response_schema_from_attributes(self):
        n = make_notification()
        nr = NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            title=n.title,
            message=n.message,
            category=n.category,
            priority=n.priority,
            is_read=n.is_read,
            related_id=n.related_id,
            related_url=n.related_url,
            created_at=n.created_at,
        )
        assert nr.is_read is False
        assert nr.category == NotificationCategory.INCIDENT
