"""add notifications table

Revision ID: 006
Revises: 005
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE notification_category AS ENUM ('incident', 'service_request', 'change_request', 'system')")
    op.execute("CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high')")

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "incident", "service_request", "change_request", "system",
                name="notification_category",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.Enum(
                "low", "medium", "high",
                name="notification_priority",
                create_type=False,
            ),
            nullable=False,
            server_default="medium",
        ),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("related_id", sa.String(255), nullable=True),
        sa.Column("related_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])
    op.create_index("ix_notifications_category", "notifications", ["category"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.execute("DROP TYPE IF EXISTS notification_category")
    op.execute("DROP TYPE IF EXISTS notification_priority")
