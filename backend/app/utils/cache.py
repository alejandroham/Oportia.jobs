"""
In-memory TTL cache for stateless job searches.
Allows instant results for recurring identical searches without saving user queries to disk.
"""
import time
from typing import Dict, Any, Tuple, Optional

class InMemoryTTLCache:
    def __init__(self, default_ttl_seconds: int = 900): # 15 minutes default
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        if key in self._cache:
            created_at, value = self._cache[key]
            if now - created_at < self.default_ttl:
                return value
            del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        expire_time = ttl or self.default_ttl
        self._cache[key] = (time.time(), value)

    def clear(self):
        self._cache.clear()

job_search_cache = InMemoryTTLCache(default_ttl_seconds=900)
