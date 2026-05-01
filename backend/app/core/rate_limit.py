import time
import threading
from collections import defaultdict
from fastapi import Request, HTTPException


class RateLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._storage: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def _cleanup(self, client_id: str, now: float):
        cutoff = now - self.window_seconds
        self._storage[client_id] = [t for t in self._storage[client_id] if t > cutoff]

    def is_rate_limited(self, client_id: str) -> bool:
        now = time.time()
        with self._lock:
            self._cleanup(client_id, now)
            if len(self._storage[client_id]) >= self.max_requests:
                return True
            self._storage[client_id].append(now)
            return False

    def remaining(self, client_id: str) -> int:
        now = time.time()
        with self._lock:
            self._cleanup(client_id, now)
            return max(0, self.max_requests - len(self._storage[client_id]))


auth_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)

_rate_limit_enabled = True


def set_rate_limit_enabled(enabled: bool):
    global _rate_limit_enabled
    _rate_limit_enabled = enabled


async def rate_limit_middleware(request: Request, call_next):
    if not _rate_limit_enabled:
        return await call_next(request)

    path = request.url.path
    protected_paths = ["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh"]

    if path in protected_paths:
        client_id = request.client.host if request.client else "unknown"
        if auth_rate_limiter.is_rate_limited(client_id):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
            )

    response = await call_next(request)
    return response
