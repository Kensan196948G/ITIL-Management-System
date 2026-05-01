from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: Optional[str] = None
    is_active: bool
    created_at: datetime

    @classmethod
    def from_user(cls, user) -> "UserResponse":
        return cls(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role.name if user.role else None,
            is_active=user.is_active,
            created_at=user.created_at,
        )


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
