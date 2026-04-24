"""
Redis-backed WebSocket Pub/Sub Manager.
Replaces the in-memory ConnectionManager to enable horizontal scaling
across multiple Uvicorn workers / server nodes.

Architecture:
  - Each worker maintains a local dict of WebSocket connections.
  - Messages are published to Redis channels (ws:user:{user_id}).
  - Each worker subscribes and forwards messages to its local sockets.
"""
import asyncio
import json
from typing import Dict, List, Optional

from fastapi import WebSocket
from app.core.redis import get_redis
from app.core.logging import get_logger

logger = get_logger("pubsub_manager")

# Channel prefix for user-targeted messages
_CHANNEL_PREFIX = "ws:user:"
# Channel for org-wide broadcasts
_ORG_CHANNEL_PREFIX = "ws:org:"


class RedisPubSubManager:
    """
    Manages WebSocket connections with Redis Pub/Sub as the message bus.
    Each Uvicorn worker runs its own instance with local socket refs.
    """

    def __init__(self):
        self.local_connections: Dict[str, WebSocket] = {}
        self._listener_task: Optional[asyncio.Task] = None
        self._running = False

    # ── Connection lifecycle ──────────────────────────────────────────

    async def connect(self, user_id: str, ws: WebSocket):
        """Accept a WebSocket and register it locally."""
        await ws.accept()
        self.local_connections[user_id] = ws
        logger.info("WebSocket connected", extra={"user_id": user_id})

    def disconnect(self, user_id: str):
        """Remove a WebSocket from local tracking."""
        self.local_connections.pop(user_id, None)
        logger.info("WebSocket disconnected", extra={"user_id": user_id})

    # ── Publishing (any worker can call this) ─────────────────────────

    async def send_to_user(self, user_id: str, data: dict):
        """Publish a message to a specific user via Redis."""
        try:
            r = await get_redis()
            channel = f"{_CHANNEL_PREFIX}{user_id}"
            await r.publish(channel, json.dumps(data))
        except Exception as e:
            logger.error("Failed to publish to Redis", extra={"user_id": user_id, "error": str(e)})
            # Fallback: try direct local delivery
            await self._deliver_local(user_id, data)

    async def broadcast_to_org(self, org_id: str, data: dict):
        """Publish a message to all users in an organization."""
        try:
            r = await get_redis()
            channel = f"{_ORG_CHANNEL_PREFIX}{org_id}"
            await r.publish(channel, json.dumps(data))
        except Exception as e:
            logger.error("Failed to broadcast to org", extra={"org_id": org_id, "error": str(e)})

    async def broadcast_to_admins(self, data: dict, admin_ids: List[str]):
        """Publish a message to multiple admin users."""
        for uid in admin_ids:
            await self.send_to_user(uid, data)

    # ── Local delivery ────────────────────────────────────────────────

    async def _deliver_local(self, user_id: str, data: dict):
        """Deliver a message to a locally connected user."""
        ws = self.local_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data) if isinstance(data, dict) else data)
            except Exception:
                self.disconnect(user_id)

    # ── Subscriber (runs as background task per worker) ───────────────

    async def start_listener(self):
        """Start the Redis Pub/Sub listener as a background coroutine."""
        if self._running:
            return
        self._running = True
        self._listener_task = asyncio.create_task(self._listen())
        logger.info("Redis Pub/Sub listener started")

    async def stop_listener(self):
        """Gracefully stop the listener."""
        self._running = False
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        logger.info("Redis Pub/Sub listener stopped")

    async def _listen(self):
        """
        Subscribe to Redis channels and forward messages to local WebSockets.
        Uses pattern subscriptions to catch all user and org channels.
        """
        try:
            r = await get_redis()
            pubsub = r.pubsub()
            await pubsub.psubscribe(
                f"{_CHANNEL_PREFIX}*",
                f"{_ORG_CHANNEL_PREFIX}*",
            )
            logger.info("Subscribed to Redis channels", extra={
                "patterns": [f"{_CHANNEL_PREFIX}*", f"{_ORG_CHANNEL_PREFIX}*"]
            })

            async for message in pubsub.listen():
                if not self._running:
                    break
                if message["type"] != "pmessage":
                    continue

                channel = message["channel"]
                payload = message["data"]

                if channel.startswith(_CHANNEL_PREFIX):
                    # User-targeted message
                    user_id = channel[len(_CHANNEL_PREFIX):]
                    await self._deliver_local(user_id, payload)

                elif channel.startswith(_ORG_CHANNEL_PREFIX):
                    # Org broadcast — deliver to all locally connected users
                    # (filtering by org happens at the app layer)
                    for uid, ws in list(self.local_connections.items()):
                        try:
                            await ws.send_text(payload if isinstance(payload, str) else json.dumps(payload))
                        except Exception:
                            self.disconnect(uid)

        except asyncio.CancelledError:
            logger.info("Pub/Sub listener cancelled")
        except Exception as e:
            logger.error("Pub/Sub listener error", extra={"error": str(e)})
            # Auto-restart after brief delay
            if self._running:
                await asyncio.sleep(2)
                self._listener_task = asyncio.create_task(self._listen())


# ── Singleton instance ────────────────────────────────────────────────
manager = RedisPubSubManager()
