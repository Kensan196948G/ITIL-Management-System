import logging
import uuid
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import check_database_connection
from app.core.errors import (
    NotFoundError,
    ConflictError,
    ForbiddenError,
    not_found_handler,
    conflict_handler,
    forbidden_handler,
    validation_handler,
    internal_error_handler,
)

from app.api.v1 import api_router
from app.core.rate_limit import rate_limit_middleware
from app.core.security_middleware import InputSanitizeMiddleware

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("itil")


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start = time.time()

        response = await call_next(request)

        elapsed_ms = (time.time() - start) * 1000
        logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "elapsed_ms": round(elapsed_ms, 2),
            },
        )
        response.headers["X-Request-ID"] = request_id
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_ok = await check_database_connection()
    logger.info("startup", extra={"database_connected": db_ok})
    yield


app = FastAPI(
    title="ITIL Management System API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(RequestIDMiddleware)
app.middleware("http")(rate_limit_middleware)
app.add_middleware(InputSanitizeMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(NotFoundError, not_found_handler)
app.add_exception_handler(ConflictError, conflict_handler)
app.add_exception_handler(ForbiddenError, forbidden_handler)
app.add_exception_handler(RequestValidationError, validation_handler)
app.add_exception_handler(Exception, internal_error_handler)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    db_ok = await check_database_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }
