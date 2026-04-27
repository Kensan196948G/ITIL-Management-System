from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    table_name: str
    record_id: str
    action: str
    user_id: Optional[str]
    changes: Optional[Dict[str, Any]]
    created_at: datetime

    @classmethod
    def from_log(cls, log: AuditLog) -> "AuditLogResponse":
        return cls(
            id=str(log.id),
            table_name=log.table_name,
            record_id=str(log.record_id),
            action=log.action,
            user_id=str(log.user_id) if log.user_id else None,
            changes=log.changes,
            created_at=log.created_at,
        )


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    table_name: Optional[str] = Query(default=None),
    record_id: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
) -> List[AuditLogResponse]:
    query = select(AuditLog)

    if table_name:
        query = query.where(AuditLog.table_name == table_name)
    if record_id:
        query = query.where(AuditLog.record_id == record_id)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)

    result = await session.execute(query)
    logs = result.scalars().all()
    return [AuditLogResponse.from_log(log) for log in logs]


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin),
) -> AuditLogResponse:
    from fastapi import HTTPException, status

    result = await session.execute(
        select(AuditLog).where(AuditLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log entry not found",
        )
    return AuditLogResponse.from_log(log)
