from fastapi import APIRouter
from app.api.v1 import auth, users, incidents, service_requests, change_requests, dashboard, audit_logs, notifications, sla_policies

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(incidents.router)
api_router.include_router(service_requests.router)
api_router.include_router(change_requests.router)
api_router.include_router(dashboard.router)
api_router.include_router(audit_logs.router)
api_router.include_router(notifications.router)
api_router.include_router(sla_policies.router)
