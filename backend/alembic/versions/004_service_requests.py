"""Add service_requests and service_request_status_logs tables

Revision ID: 004
Revises: 003
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "submitted", "pending_approval", "approved", "rejected",
                "in_progress", "completed", "cancelled",
                name="service_request_status",
                create_type=True,
            ),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column(
            "category",
            sa.Enum(
                "it_equipment", "software_access", "network_access", "user_account", "other",
                name="service_request_category",
                create_type=True,
            ),
            nullable=False,
            server_default="other",
        ),
        sa.Column("requester_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approver_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assignee_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "service_request_status_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "service_request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("service_requests.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "from_status",
            sa.Enum(
                "submitted", "pending_approval", "approved", "rejected",
                "in_progress", "completed", "cancelled",
                name="service_request_status",
                create_type=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "to_status",
            sa.Enum(
                "submitted", "pending_approval", "approved", "rejected",
                "in_progress", "completed", "cancelled",
                name="service_request_status",
                create_type=True,
            ),
            nullable=False,
        ),
        sa.Column("changed_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("service_request_status_logs")
    op.drop_table("service_requests")
    op.execute("DROP TYPE IF EXISTS service_request_category")
    op.execute("DROP TYPE IF EXISTS service_request_status")
