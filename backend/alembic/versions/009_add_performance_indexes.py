"""Add performance indexes for incidents, service_requests, change_requests, problems, change_schedules, notifications

Revision ID: 009
Revises: 008
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Incident indexes
    op.create_index("idx_incidents_status", "incidents", ["status"])
    op.create_index("idx_incidents_priority", "incidents", ["priority"])
    op.create_index("idx_incidents_assigned_to", "incidents", ["assignee_id"])
    op.create_index("idx_incidents_created_at", "incidents", [sa.text("created_at DESC")])
    op.create_index("idx_incidents_sla_due_at", "incidents", ["sla_due_at"])

    # Service request indexes
    op.create_index("idx_service_requests_status", "service_requests", ["status"])
    op.create_index("idx_service_requests_requester", "service_requests", ["requester_id"])
    op.create_index("idx_service_requests_approver", "service_requests", ["approver_id"])

    # Change request indexes
    op.create_index("idx_change_requests_status", "change_requests", ["status"])
    op.create_index("idx_change_requests_type", "change_requests", ["change_type"])
    op.create_index("idx_change_requests_requester", "change_requests", ["requester_id"])

    # Problem indexes
    op.create_index("idx_problems_status", "problems", ["status"])
    op.create_index("idx_problems_priority", "problems", ["priority"])

    # Change schedule composite index
    op.create_index(
        "idx_change_schedules_scheduled",
        "change_schedules",
        ["scheduled_start", "scheduled_end"],
    )

    # Notification composite index
    op.create_index(
        "idx_notifications_user_read",
        "notifications",
        ["user_id", "is_read"],
    )


def downgrade() -> None:
    op.drop_index("idx_notifications_user_read", table_name="notifications")
    op.drop_index("idx_change_schedules_scheduled", table_name="change_schedules")
    op.drop_index("idx_problems_priority", table_name="problems")
    op.drop_index("idx_problems_status", table_name="problems")
    op.drop_index("idx_change_requests_requester", table_name="change_requests")
    op.drop_index("idx_change_requests_type", table_name="change_requests")
    op.drop_index("idx_change_requests_status", table_name="change_requests")
    op.drop_index("idx_service_requests_approver", table_name="service_requests")
    op.drop_index("idx_service_requests_requester", table_name="service_requests")
    op.drop_index("idx_service_requests_status", table_name="service_requests")
    op.drop_index("idx_incidents_sla_due_at", table_name="incidents")
    op.drop_index("idx_incidents_created_at", table_name="incidents")
    op.drop_index("idx_incidents_assigned_to", table_name="incidents")
    op.drop_index("idx_incidents_priority", table_name="incidents")
    op.drop_index("idx_incidents_status", table_name="incidents")
