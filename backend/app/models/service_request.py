import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ServiceRequestStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ServiceRequestCategory(str, enum.Enum):
    IT_EQUIPMENT = "it_equipment"
    SOFTWARE_ACCESS = "software_access"
    NETWORK_ACCESS = "network_access"
    USER_ACCOUNT = "user_account"
    OTHER = "other"


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ServiceRequestStatus] = mapped_column(
        SAEnum(ServiceRequestStatus, name="service_request_status"),
        nullable=False,
        default=ServiceRequestStatus.SUBMITTED,
    )
    category: Mapped[ServiceRequestCategory] = mapped_column(
        SAEnum(ServiceRequestCategory, name="service_request_category"),
        nullable=False,
        default=ServiceRequestCategory.OTHER,
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    approver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    due_date: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approver_id])
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    status_logs: Mapped[list["ServiceRequestStatusLog"]] = relationship(
        "ServiceRequestStatusLog",
        back_populates="service_request",
        order_by="ServiceRequestStatusLog.created_at",
    )


class ServiceRequestStatusLog(Base):
    __tablename__ = "service_request_status_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    service_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_requests.id"), nullable=False, index=True
    )
    from_status: Mapped[Optional[ServiceRequestStatus]] = mapped_column(
        SAEnum(ServiceRequestStatus, name="service_request_status"), nullable=True
    )
    to_status: Mapped[ServiceRequestStatus] = mapped_column(
        SAEnum(ServiceRequestStatus, name="service_request_status"), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )

    service_request: Mapped["ServiceRequest"] = relationship(
        "ServiceRequest", back_populates="status_logs"
    )
    changed_by: Mapped["User"] = relationship("User")
