"""
Async Redis connection pool singleton for WATOS.
Used by: WebSocket Pub/Sub, Celery broker, caching.
"""
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("redis")

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return a shared async Redis connection (lazy-initialized)."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
        logger.info("Redis connection pool initialized", extra={"url": settings.REDIS_URL})
    return _redis_pool


async def close_redis():
    """Gracefully close the Redis pool on shutdown."""
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.close()
        _redis_pool = None
        logger.info("Redis connection pool closed")
