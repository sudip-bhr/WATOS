from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
import uuid


async def create_notification(
    db: AsyncSession,
    user_id: str,
    notif_type: str, # delay_risk | overload | deadline | comment | mention | sla_breach | task_assigned | new_member | member_assigned | report_submitted | report_reminder | report_reviewed | task_review | task_approved | task_rejected
    message: str,
    action_url: str = None,
    action_type: str = None,
    related_entity_id: uuid.UUID = None,
):
    """Persist a notification and push via WebSocket if user is connected."""
    if not user_id:
        return
    notif = Notification(
        user_id=uuid.UUID(user_id),
        type=notif_type,
        message=message,
        action_url=action_url,
        action_type=action_type,
        related_entity_id=related_entity_id
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    # Push to WebSocket via Redis Pub/Sub (reaches all workers)
    try:
        from app.services.pubsub_manager import manager
        await manager.send_to_user(user_id, {
            "id": str(notif.id),
            "type": notif_type,
            "message": message,
            "is_read": False,
            "action_url": action_url,
            "action_type": action_type,
            "related_entity_id": str(related_entity_id) if related_entity_id else None,
            "created_at": notif.created_at.isoformat(),
        })
    except Exception:
        pass

    # Push to Web Push (Browser Notifications)
    try:
        from app.models.push_subscription import PushSubscription
        from app.core.config import settings
        from pywebpush import webpush_async
        from sqlalchemy import select
        import json

        if settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY:
            result = await db.execute(
                select(PushSubscription).where(PushSubscription.user_id == uuid.UUID(user_id))
            )
            subs = result.scalars().all()
            
            for sub in subs:
                try:
                    await webpush_async(
                        subscription_info={
                            "endpoint": sub.endpoint,
                            "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                        },
                        data=json.dumps({
                            "title": "WATOS Alert",
                            "body": message,
                            "icon": "/logo192.png",
                            "data": {"url": action_url or "/"}
                        }),
                        vapid_private_key=settings.VAPID_PRIVATE_KEY,
                        vapid_claims={"sub": "mailto:admin@watos.dev"}
                    )
                except Exception:
                    # If push fails (e.g. expired subscription), we could remove it
                    pass
    except Exception:
        pass

    return notif


async def check_and_notify_overload(db: AsyncSession, user_id: str, utilization: float):
    """Send overload notification if utilization > 100%."""
    if utilization > 1.0:
        from sqlalchemy import select
        from app.models.user import User
        from app.models.notification import Notification
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == uuid.UUID(user_id),
                Notification.type == "overload",
                Notification.is_read == False,
            )
        )
        existing = result.scalar_one_or_none()
        if not existing:
            await create_notification(
                db, user_id, "overload",
                f"Your workload is at {utilization*100:.0f}% — you are overloaded!"
            )
