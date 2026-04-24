"""
Webhook Dispatch Service.
Sends signed webhook payloads to registered external endpoints.
Handles HMAC signing, retries, and failure tracking.
"""
import json
import hmac
import hashlib
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import httpx

from app.models.webhook import Webhook
from app.core.logging import get_logger

logger = get_logger("webhook_service")


async def dispatch_event(
    event_type: str,
    org_id: str,
    payload: dict,
    db: AsyncSession,
):
    """
    Send webhook to all subscribers for this event type in this org.
    Non-blocking — failures are logged but don't affect the main request.
    """
    result = await db.execute(
        select(Webhook).where(
            Webhook.organization_id == org_id,
            Webhook.is_active == True,
            Webhook.events.contains([event_type]),
        )
    )
    webhooks = result.scalars().all()

    if not webhooks:
        return

    envelope = {
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "org_id": str(org_id),
        "data": payload,
    }
    body = json.dumps(envelope, default=str)

    async with httpx.AsyncClient(timeout=10.0) as client:
        for wh in webhooks:
            try:
                # HMAC-SHA256 signature
                signature = hmac.new(
                    wh.secret.encode("utf-8"),
                    body.encode("utf-8"),
                    hashlib.sha256,
                ).hexdigest()

                response = await client.post(
                    wh.url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-WATOS-Signature": f"sha256={signature}",
                        "X-WATOS-Event": event_type,
                    },
                )

                if response.status_code < 300:
                    # Success — reset failure count
                    wh.last_triggered_at = datetime.now(timezone.utc)
                    wh.failure_count = "0"
                    logger.info(f"Webhook delivered: {wh.name}", extra={
                        "event": event_type, "url": wh.url, "status": response.status_code
                    })
                else:
                    _increment_failure(wh)
                    logger.warning(f"Webhook returned {response.status_code}: {wh.name}")

            except httpx.TimeoutException:
                _increment_failure(wh)
                logger.warning(f"Webhook timeout: {wh.name} ({wh.url})")
            except Exception as e:
                _increment_failure(wh)
                logger.error(f"Webhook delivery failed: {wh.name}", extra={"error": str(e)})

    await db.commit()


def _increment_failure(wh: Webhook):
    """Track consecutive failures. Disable webhook after 10 failures."""
    count = int(wh.failure_count or "0") + 1
    wh.failure_count = str(count)
    if count >= 10:
        wh.is_active = False
        logger.warning(f"Webhook disabled after {count} failures: {wh.name}")


def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify an incoming webhook signature (for inbound webhooks)."""
    expected = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
