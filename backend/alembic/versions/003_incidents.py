"""Add incidents, incident_status_logs, and sla_policies tables

Revision ID: 003
Revises: 002
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "incidents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "new", "assigned", "in_progress", "pending",
                "resolved", "closed", "cancelled",
                name="incident_status",
                create_type=True,
            ),
            nullable=False,
            server_default="new",
        ),
        sa.Column(
            "priority",
            sa.Enum(
                "p1_critical", "p2_high", "p3_medium", "p4_low",
                name="incident_priority",
                create_type=True,
            ),
            nullable=False,
            server_default="p3_medium",
        ),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("subcategory", sa.String(100), nullable=True),
        sa.Column("reporter_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assignee_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("sla_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "incident_status_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("incident_id", UUID(as_uuid=True), sa.ForeignKey("incidents.id"), nullable=False, index=True),
        sa.Column(
            "from_status",
            sa.Enum(
                "new", "assigned", "in_progress", "pending",
                "resolved", "closed", "cancelled",
                name="incident_status",
                create_type=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "to_status",
            sa.Enum(
                "new", "assigned", "in_progress", "pending",
                "resolved", "closed", "cancelled",
                name="incident_status",
                create_type=True,
            ),
            nullable=False,
        ),
        sa.Column("changed_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "sla_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "priority",
            sa.Enum(
                "p1_critical", "p2_high", "p3_medium", "p4_low",
                name="incident_priority",
                create_type=True,
            ),
            unique=True,
            nullable=False,
        ),
        sa.Column("response_time_minutes", sa.Integer, nullable=False),
        sa.Column("resolution_time_minutes", sa.Integer, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("sla_policies")
    op.drop_table("incident_status_logs")
    op.drop_table("incidents")
    op.execute("DROP TYPE IF EXISTS incident_priority")
    op.execute("DROP TYPE IF EXISTS incident_status")
