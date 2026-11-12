"""
Lightweight in-memory IP Rate Limiter for FastAPI.
Zero external dependencies, cross-platform, sliding-window algorithm.
"""
import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException

class IPRateLimiter:
    def __init__(self, requests_per_minute: int = 30, description: str = "solicitudes"):
        self.rpm = requests_per_minute
        self.description = description
        self.window = 60.0 # seconds
        self._hits: Dict[str, List[float]] = defaultdict(list)

    def __call__(self, request: Request):
        # Extract client IP (handling reverse proxy X-Forwarded-For if present)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"

        now = time.time()
        # Clean hits outside current window
        self._hits[client_ip] = [t for t in self._hits[client_ip] if now - t < self.window]

        if len(self._hits[client_ip]) >= self.rpm:
            retry_after = int(self.window - (now - self._hits[client_ip][0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Límite de {self.description} excedido ({self.rpm}/min). Por favor espera {retry_after} segundos antes de reintentar.",
                headers={"Retry-After": str(max(1, retry_after))}
            )

        self._hits[client_ip].append(now)

    def clear(self):
        self._hits.clear()

ai_rate_limiter = IPRateLimiter(requests_per_minute=40, description="llamadas a IA")
search_rate_limiter = IPRateLimiter(requests_per_minute=15, description="búsquedas de empleo")
