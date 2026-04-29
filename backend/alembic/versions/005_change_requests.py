"""Add change_requests and change_request_status_logs tables

Revision ID: 005
Revises: 004
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE change_request_status AS ENUM "
        "('draft', 'submitted', 'under_review', 'approved', 'rejected', "
        "'in_progress', 'completed', 'failed', 'cancelled')"
    )
    op.execute(
        "CREATE TYPE change_request_type AS ENUM "
        "('standard', 'normal', 'emergency')"
    )
    op.execute(
        "CREATE TYPE change_request_risk AS ENUM "
        "('low', 'medium', 'high')"
    )
    op.execute(
        "CREATE TYPE change_request_priority AS ENUM "
        "('low', 'medium', 'high', 'critical')"
    )

    op.create_table(
        "change_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "draft", "submitted", "under_review", "approved", "rejected",
                "in_progress", "completed", "failed", "cancelled",
                name="change_request_status",
                create_type=False,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "change_type",
            sa.Enum(
                "standard", "normal", "emergency",
                name="change_request_type",
                create_type=False,
            ),
            nullable=False,
            server_default="normal",
        ),
        sa.Column(
            "risk_level",
            sa.Enum(
                "low", "medium", "high",
                name="change_request_risk",
                create_type=False,
            ),
            nullable=False,
            server_default="medium",
        ),
        sa.Column(
            "priority",
            sa.Enum(
                "low", "medium", "high", "critical",
                name="change_request_priority",
                create_type=False,
            ),
            nullable=False,
            server_default="medium",
        ),
        sa.Column("requester_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewer_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approver_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("implementer_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("planned_start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("planned_end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("rollback_plan", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "change_request_status_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "change_request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("change_requests.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "from_status",
            sa.Enum(
                "draft", "submitted", "under_review", "approved", "rejected",
                "in_progress", "completed", "failed", "cancelled",
                name="change_request_status",
                create_type=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "to_status",
            sa.Enum(
                "draft", "submitted", "under_review", "approved", "rejected",
                "in_progress", "completed", "failed", "cancelled",
                name="change_request_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("changed_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("change_request_status_logs")
    op.drop_table("change_requests")
    op.execute("DROP TYPE IF EXISTS change_request_priority")
    op.execute("DROP TYPE IF EXISTS change_request_risk")
    op.execute("DROP TYPE IF EXISTS change_request_type")
    op.execute("DROP TYPE IF EXISTS change_request_status")
