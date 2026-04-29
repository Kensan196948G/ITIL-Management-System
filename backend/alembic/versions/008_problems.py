"""Add problems, problem_incidents, problem_status_logs tables

Revision ID: 008
Revises: 007
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE problem_status AS ENUM "
        "('open', 'under_investigation', 'known_error', 'resolved', 'closed')"
    )
    op.execute(
        "CREATE TYPE problem_priority AS ENUM "
        "('p1_critical', 'p2_high', 'p3_medium', 'p4_low')"
    )

    op.create_table(
        "problems",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("open", "under_investigation", "known_error", "resolved", "closed",
                    name="problem_status", create_type=False),
            nullable=False,
            server_default="open",
        ),
        sa.Column(
            "priority",
            sa.Enum("p1_critical", "p2_high", "p3_medium", "p4_low",
                    name="problem_priority", create_type=False),
            nullable=False,
            server_default="p3_medium",
        ),
        sa.Column("reporter_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assignee_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("root_cause", sa.Text, nullable=True),
        sa.Column("workaround", sa.Text, nullable=True),
        sa.Column("is_known_error", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "problem_incidents",
        sa.Column("problem_id", UUID(as_uuid=True), sa.ForeignKey("problems.id"), primary_key=True),
        sa.Column("incident_id", UUID(as_uuid=True), sa.ForeignKey("incidents.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "problem_status_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("problem_id", UUID(as_uuid=True), sa.ForeignKey("problems.id"), nullable=False, index=True),
        sa.Column(
            "from_status",
            sa.Enum("open", "under_investigation", "known_error", "resolved", "closed",
                    name="problem_status", create_type=False),
            nullable=True,
        ),
        sa.Column(
            "to_status",
            sa.Enum("open", "under_investigation", "known_error", "resolved", "closed",
                    name="problem_status", create_type=False),
            nullable=False,
        ),
        sa.Column("changed_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("problem_status_logs")
    op.drop_table("problem_incidents")
    op.drop_table("problems")
    op.execute("DROP TYPE IF EXISTS problem_priority")
    op.execute("DROP TYPE IF EXISTS problem_status")
