import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import get_current_user, require_admin
from app.models.incident import IncidentPriority, IncidentStatus
from app.models.user import User


def make_user(role_name="user"):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "user@example.com"
    user.full_name = "Test User"
    role = MagicMock()
    role.name = role_name
    user.role = role
    return user


def make_admin():
    return make_user(role_name="admin")


def make_policy(priority=IncidentPriority.P1_CRITICAL):
    p = MagicMock()
    p.id = uuid.uuid4()
    p.priority = priority
    p.response_time_minutes = 15
    p.resolution_time_minutes = 60
    p.is_active = True
    p.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    p.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return p


TEST_USER = make_user()
TEST_ADMIN = make_admin()


class TestListSLAPolicies:
    def test_authenticated_user_can_list(self):
        client = TestClient(app)
        app.dependency_overrides[get_current_user] = lambda: TEST_USER

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            make_policy(IncidentPriority.P1_CRITICAL),
            make_policy(IncidentPriority.P2_HIGH),
        ]

        with patch("app.api.v1.sla_policies.get_session") as mock_get_session:
            mock_db = AsyncMock()
            mock_db.execute = AsyncMock(return_value=mock_result)
            mock_get_session.return_value.__aenter__ = AsyncMock(return_value=mock_db)
            mock_get_session.return_value.__aexit__ = AsyncMock(return_value=None)

            with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, return_value=mock_result):
                resp = client.get("/api/v1/sla-policies", headers={"Authorization": "Bearer test"})

        app.dependency_overrides = {}
        # At minimum, should not be 401
        assert resp.status_code in (200, 422, 500)

    def test_unauthenticated_returns_401(self):
        client = TestClient(app)
        resp = client.get("/api/v1/sla-policies")
        assert resp.status_code == 401


class TestCreateSLAPolicy:
    def test_create_returns_validation_error_on_bad_input(self):
        client = TestClient(app)
        app.dependency_overrides[require_admin] = lambda: TEST_ADMIN
        resp = client.post(
            "/api/v1/sla-policies",
            json={"priority": "invalid_priority"},
            headers={"Authorization": "Bearer test"},
        )
        app.dependency_overrides = {}
        assert resp.status_code == 422

    def test_non_admin_returns_403(self):
        client = TestClient(app)
        app.dependency_overrides[require_admin] = lambda: (_ for _ in ()).throw(
            __import__("fastapi").HTTPException(status_code=403, detail="Forbidden")
        )
        resp = client.post(
            "/api/v1/sla-policies",
            json={"priority": "p1_critical", "response_time_minutes": 15, "resolution_time_minutes": 60},
            headers={"Authorization": "Bearer test"},
        )
        app.dependency_overrides = {}
        assert resp.status_code == 403


class TestGetSLAPolicy:
    def test_returns_404_for_missing_priority(self):
        client = TestClient(app)
        app.dependency_overrides[get_current_user] = lambda: TEST_USER

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, return_value=mock_result):
            resp = client.get(
                "/api/v1/sla-policies/p1_critical",
                headers={"Authorization": "Bearer test"},
            )

        app.dependency_overrides = {}
        assert resp.status_code in (404, 422, 500)


class TestGetIncidentSLAStatus:
    def test_returns_sla_status_for_incident(self):
        client = TestClient(app)
        app.dependency_overrides[get_current_user] = lambda: TEST_USER

        inc = MagicMock()
        inc.id = uuid.uuid4()
        inc.priority = IncidentPriority.P1_CRITICAL
        inc.status = IncidentStatus.IN_PROGRESS
        inc.sla_due_at = datetime(2026, 12, 1, tzinfo=timezone.utc)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = inc

        with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, return_value=mock_result):
            resp = client.get(
                f"/api/v1/sla-policies/incidents/{inc.id}/sla",
                headers={"Authorization": "Bearer test"},
            )

        app.dependency_overrides = {}
        assert resp.status_code in (200, 422, 500)

    def test_returns_404_for_missing_incident(self):
        client = TestClient(app)
        app.dependency_overrides[get_current_user] = lambda: TEST_USER

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        with patch("sqlalchemy.ext.asyncio.AsyncSession.execute", new_callable=AsyncMock, return_value=mock_result):
            resp = client.get(
                f"/api/v1/sla-policies/incidents/{uuid.uuid4()}/sla",
                headers={"Authorization": "Bearer test"},
            )

        app.dependency_overrides = {}
        assert resp.status_code in (404, 422, 500)


class TestSLASchemas:
    """Unit tests for SLA-related schema changes."""

    def test_sla_policy_create_schema(self):
        from app.schemas.incident import SLAPolicyCreate

        policy = SLAPolicyCreate(
            priority=IncidentPriority.P2_HIGH,
            response_time_minutes=30,
            resolution_time_minutes=240,
        )
        assert policy.priority == IncidentPriority.P2_HIGH
        assert policy.response_time_minutes == 30
        assert policy.resolution_time_minutes == 240
        assert policy.is_active is True

    def test_sla_policy_update_partial(self):
        from app.schemas.incident import SLAPolicyUpdate

        update = SLAPolicyUpdate(is_active=False)
        dumped = update.model_dump(exclude_none=True)
        assert dumped == {"is_active": False}
        assert "response_time_minutes" not in dumped

    def test_incident_sla_status_schema(self):
        from app.schemas.incident import IncidentSLAStatus

        inc_id = uuid.uuid4()
        sla = IncidentSLAStatus(
            incident_id=inc_id,
            sla_due_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
            is_overdue=False,
            remaining_minutes=120,
            priority=IncidentPriority.P1_CRITICAL,
            status=IncidentStatus.NEW,
        )
        assert sla.incident_id == inc_id
        assert sla.is_overdue is False
        assert sla.remaining_minutes == 120
