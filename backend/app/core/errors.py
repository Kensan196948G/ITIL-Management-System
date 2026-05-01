import traceback
import uuid
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from typing import Any, Optional

logger = logging.getLogger("itil.errors")


class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: Any = None
    request_id: Optional[str] = None


class NotFoundError(Exception):
    def __init__(self, resource: str, id: str):
        self.resource = resource
        self.id = id
        self.error_code = "NOT_FOUND"
        self.message = f"{resource} with id={id} not found"


class ConflictError(Exception):
    def __init__(self, message: str):
        self.message = message
        self.error_code = "CONFLICT"


class ForbiddenError(Exception):
    def __init__(self, message: str = "Permission denied"):
        self.message = message
        self.error_code = "FORBIDDEN"


async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=404,
        content=ErrorResponse(
            error_code=exc.error_code,
            message=exc.message,
            request_id=request_id,
        ).model_dump(),
    )


async def conflict_handler(request: Request, exc: ConflictError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=409,
        content=ErrorResponse(
            error_code=exc.error_code,
            message=exc.message,
            request_id=request_id,
        ).model_dump(),
    )


async def forbidden_handler(request: Request, exc: ForbiddenError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=403,
        content=ErrorResponse(
            error_code=exc.error_code,
            message=exc.message,
            request_id=request_id,
        ).model_dump(),
    )


async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    details = [{"field": ".".join(str(loc) for loc in e["loc"]), "message": e["msg"]} for e in exc.errors()]
    logger.warning("validation_error", extra={"request_id": request_id, "path": request.url.path, "errors": details})
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error_code="VALIDATION_ERROR",
            message="Request validation failed",
            details=details,
            request_id=request_id,
        ).model_dump(),
    )


async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(
        "internal_server_error",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc(),
        },
    )
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error_code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred",
            request_id=request_id,
        ).model_dump(),
    )
