import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ChangeRequestStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ChangeRequestType(str, enum.Enum):
    STANDARD = "standard"    # Pre-approved, low-risk routine changes
    NORMAL = "normal"        # Requires CAB review and approval
    EMERGENCY = "emergency"  # Urgent change with expedited approval


class ChangeRequestRisk(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ChangeRequestPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ChangeRequestStatus] = mapped_column(
        SAEnum(ChangeRequestStatus, name="change_request_status"),
        nullable=False,
        default=ChangeRequestStatus.DRAFT,
    )
    change_type: Mapped[ChangeRequestType] = mapped_column(
        SAEnum(ChangeRequestType, name="change_request_type"),
        nullable=False,
        default=ChangeRequestType.NORMAL,
    )
    risk_level: Mapped[ChangeRequestRisk] = mapped_column(
        SAEnum(ChangeRequestRisk, name="change_request_risk"),
        nullable=False,
        default=ChangeRequestRisk.MEDIUM,
    )
    priority: Mapped[ChangeRequestPriority] = mapped_column(
        SAEnum(ChangeRequestPriority, name="change_request_priority"),
        nullable=False,
        default=ChangeRequestPriority.MEDIUM,
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    implementer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    planned_start_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    planned_end_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    actual_start_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    actual_end_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rollback_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewer_id])
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approver_id])
    implementer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[implementer_id])
    status_logs: Mapped[list["ChangeRequestStatusLog"]] = relationship(
        "ChangeRequestStatusLog",
        back_populates="change_request",
        order_by="ChangeRequestStatusLog.created_at",
    )
    cab_votes: Mapped[list["CABVote"]] = relationship(
        "CABVote",
        back_populates="change_request",
        order_by="CABVote.voted_at",
    )
    schedule: Mapped[Optional["ChangeSchedule"]] = relationship(
        "ChangeSchedule",
        back_populates="change_request",
        uselist=False,
    )


class ChangeRequestStatusLog(Base):
    __tablename__ = "change_request_status_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    change_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("change_requests.id"), nullable=False, index=True
    )
    from_status: Mapped[Optional[ChangeRequestStatus]] = mapped_column(
        SAEnum(ChangeRequestStatus, name="change_request_status"), nullable=True
    )
    to_status: Mapped[ChangeRequestStatus] = mapped_column(
        SAEnum(ChangeRequestStatus, name="change_request_status"), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    change_request: Mapped["ChangeRequest"] = relationship(
        "ChangeRequest", back_populates="status_logs"
    )
    changed_by: Mapped["User"] = relationship("User")


class CABVoteDecision(str, enum.Enum):
    APPROVE = "approve"
    REJECT = "reject"
    ABSTAIN = "abstain"


class CABVote(Base):
    """CAB member voting record for a change request."""

    __tablename__ = "cab_votes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    change_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("change_requests.id"), nullable=False, index=True
    )
    voter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    decision: Mapped[CABVoteDecision] = mapped_column(
        SAEnum(CABVoteDecision, name="cab_vote_decision"),
        nullable=False,
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    voted_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    change_request: Mapped["ChangeRequest"] = relationship(
        "ChangeRequest", back_populates="cab_votes"
    )
    voter: Mapped["User"] = relationship("User")


class ChangeSchedule(Base):
    """Planned maintenance / deployment window for a change request."""

    __tablename__ = "change_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    change_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("change_requests.id"), nullable=False, unique=True, index=True
    )
    scheduled_start: Mapped[datetime] = mapped_column(nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(nullable=False)
    environment: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    change_request: Mapped["ChangeRequest"] = relationship(
        "ChangeRequest", back_populates="schedule"
    )
