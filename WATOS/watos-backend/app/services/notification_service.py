from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
import uuid


async def create_notification(
    db: AsyncSession,
    user_id: str,
    notif_type: str,
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
