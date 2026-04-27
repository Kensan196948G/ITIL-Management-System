from typing import TypeVar, Generic, Optional
from pydantic import BaseModel

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    message: str = "success"
