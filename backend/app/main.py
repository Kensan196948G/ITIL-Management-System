from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import check_database_connection
from app.core.errors import (
    NotFoundError,
    ConflictError,
    ForbiddenError,
    not_found_handler,
    conflict_handler,
    forbidden_handler,
)

from app.api.v1 import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_ok = await check_database_connection()
    if db_ok:
        print("Database connection OK")
    else:
        print("WARNING: Database connection failed")
    yield


app = FastAPI(
    title="ITIL Management System API",
    version="0.1.0",
    lifespan=lifespan,
)

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

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    db_ok = await check_database_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }
