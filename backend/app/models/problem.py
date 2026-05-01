import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.user import User


class ProblemStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_INVESTIGATION = "under_investigation"
    KNOWN_ERROR = "known_error"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ProblemPriority(str, enum.Enum):
    P1_CRITICAL = "p1_critical"
    P2_HIGH = "p2_high"
    P3_MEDIUM = "p3_medium"
    P4_LOW = "p4_low"


class ProblemIncident(Base):
    """Association table linking problems to related incidents."""

    __tablename__ = "problem_incidents"

    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id"), primary_key=True
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incidents.id"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ProblemStatus] = mapped_column(
        SAEnum(ProblemStatus, name="problem_status"),
        nullable=False,
        default=ProblemStatus.OPEN,
    )
    priority: Mapped[ProblemPriority] = mapped_column(
        SAEnum(ProblemPriority, name="problem_priority"),
        nullable=False,
        default=ProblemPriority.P3_MEDIUM,
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    workaround: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_known_error: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    reporter: Mapped["User"] = relationship("User", foreign_keys=[reporter_id])
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    status_logs: Mapped[list["ProblemStatusLog"]] = relationship(
        "ProblemStatusLog",
        back_populates="problem",
        order_by="ProblemStatusLog.created_at",
    )
    linked_incidents: Mapped[list["Incident"]] = relationship(
        "Incident",
        secondary="problem_incidents",
        lazy="raise",
        viewonly=True,
    )


class ProblemStatusLog(Base):
    __tablename__ = "problem_status_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    problem_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("problems.id"), nullable=False, index=True
    )
    from_status: Mapped[Optional[ProblemStatus]] = mapped_column(
        SAEnum(ProblemStatus, name="problem_status"), nullable=True
    )
    to_status: Mapped[ProblemStatus] = mapped_column(
        SAEnum(ProblemStatus, name="problem_status"), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    problem: Mapped["Problem"] = relationship("Problem", back_populates="status_logs")
    changed_by: Mapped["User"] = relationship("User")
