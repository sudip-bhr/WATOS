from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
import uuid
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.notification import Notification

# ── Import the Redis-backed manager singleton ─────────────────────────
from app.services.pubsub_manager import manager
from app.models.push_subscription import PushSubscription
from app.core.config import settings

router = APIRouter()

class PushSubRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

@router.get("/vapid-public-key")
async def get_vapid_key():
    return {"public_key": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe")
async def subscribe_push(
    sub: PushSubRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Check if subscription already exists
    stmt = select(PushSubscription).where(PushSubscription.endpoint == sub.endpoint)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = sub.p256dh
        existing.auth = sub.auth
    else:
        new_sub = PushSubscription(
            user_id=current_user.id,
            endpoint=sub.endpoint,
            p256dh=sub.p256dh,
            auth=sub.auth
        )
        db.add(new_sub)
    
    await db.commit()
    return {"status": "ok"}



# ── Response schema ───────────────────────────────────────────────────

class NotifResponse(BaseModel):
    id: uuid.UUID
    type: str
    message: str
    is_read: bool
    action_url: Optional[str] = None
    action_type: Optional[str] = None
    related_entity_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── REST endpoints ────────────────────────────────────────────────────

@router.get("/", response_model=List[NotifResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.patch("/{notif_id}/read", response_model=NotifResponse)
async def mark_read(
    notif_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif


@router.post("/read-all", status_code=200)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "ok"}


# ── WebSocket endpoint (unchanged contract, Redis-backed transport) ──

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    from app.core.security import decode_access_token
    try:
        payload = decode_access_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        manager.disconnect(user_id)
