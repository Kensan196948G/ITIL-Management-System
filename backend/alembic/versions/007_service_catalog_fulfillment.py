"""Add service_catalog_items, fulfillment_tasks, cab_votes, change_schedules tables

Revision ID: 007
Revises: 006
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # fulfillment_task_status enum
    op.execute(
        "CREATE TYPE fulfillment_task_status AS ENUM "
        "('pending', 'in_progress', 'completed', 'skipped')"
    )

    # service_catalog_items (must be before FK on service_requests)
    op.create_table(
        "service_catalog_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "it_equipment", "software_access", "network_access", "user_account", "other",
                name="service_request_category",
                create_type=False,
            ),
            nullable=False,
            server_default="other",
        ),
        sa.Column("estimated_days", sa.Integer, nullable=True),
        sa.Column("requires_approval", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Add catalog_item_id FK to service_requests after service_catalog_items exists
    op.add_column(
        "service_requests",
        sa.Column(
            "catalog_item_id",
            UUID(as_uuid=True),
            sa.ForeignKey("service_catalog_items.id"),
            nullable=True,
        ),
    )

    # fulfillment_tasks
    op.create_table(
        "fulfillment_tasks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "service_request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("service_requests.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "in_progress", "completed", "skipped",
                name="fulfillment_task_status",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("assignee_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # cab_vote_decision enum
    op.execute(
        "CREATE TYPE cab_vote_decision AS ENUM ('approve', 'reject', 'abstain')"
    )

    # cab_votes
    op.create_table(
        "cab_votes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "change_request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("change_requests.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("voter_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "decision",
            sa.Enum("approve", "reject", "abstain", name="cab_vote_decision", create_type=False),
            nullable=False,
        ),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("voted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # change_schedules
    op.create_table(
        "change_schedules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "change_request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("change_requests.id"),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("environment", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("confirmed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("change_schedules")
    op.drop_table("cab_votes")
    op.execute("DROP TYPE IF EXISTS cab_vote_decision")
    op.drop_table("fulfillment_tasks")
    op.drop_table("service_catalog_items")
    op.execute("DROP TYPE IF EXISTS fulfillment_task_status")
    op.drop_column("service_requests", "catalog_item_id")
