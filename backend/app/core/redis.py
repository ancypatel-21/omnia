import json
from functools import lru_cache
from typing import Any

import redis.asyncio as redis

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_redis_pool() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


class Cache:
    """Thin JSON cache wrapper around Redis, used to keep hot reads
    (semantic search results, assembled agent context) under the
    latency budget without hitting Postgres or OpenAI every time."""

    def __init__(self) -> None:
        self.client = get_redis_pool()

    async def get_json(self, key: str) -> Any | None:
        raw = await self.client.get(key)
        return json.loads(raw) if raw is not None else None

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        await self.client.set(key, json.dumps(value), ex=ttl_seconds)

    async def invalidate_prefix(self, prefix: str) -> None:
        async for key in self.client.scan_iter(match=f"{prefix}*"):
            await self.client.delete(key)


def get_cache() -> Cache:
    return Cache()
