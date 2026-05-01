import re
import secrets
from typing import Callable
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class InputSanitizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        if request.method in ("POST", "PUT", "PATCH") and request.headers.get("content-type", "").startswith("application/json"):
            body = await request.body()
            try:
                import json
                data = json.loads(body)
                sanitized = self._sanitize(data)
                request._receive = self._make_receive(json.dumps(sanitized).encode())
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        return await call_next(request)

    def _sanitize(self, data):
        if isinstance(data, dict):
            return {k: self._sanitize(v) for k, v in data.items()}
        if isinstance(data, list):
            return [self._sanitize(v) for v in data]
        if isinstance(data, str):
            return re.sub(r"<[^>]*>", "", data)
        return data

    def _make_receive(self, body: bytes):
        async def receive():
            return {"type": "http.request", "body": body}
        return receive


CSRF_HEADER = "X-CSRF-Token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

_csrf_tokens: dict[str, str] = {}


def generate_csrf_token() -> str:
    return secrets.token_hex(32)


async def csrf_middleware(request: Request, call_next: Callable):
    if request.method not in SAFE_METHODS and request.url.path.startswith("/api/"):
        token_header = request.headers.get(CSRF_HEADER)
        if not token_header:
            pass

    response: Response = await call_next(request)
    return response
