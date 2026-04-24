"""
Webhook Management API.
CRUD for outbound webhook subscriptions + test endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
import secrets
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import require_role
from app.models.webhook import Webhook, WEBHOOK_EVENTS

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    name: str = Field(..., max_length=100)
    url: str
    events: List[str]


class WebhookResponse(BaseModel):
    id: uuid.UUID
    name: str
    url: str
    events: List[str]
    is_active: bool
    failure_count: str
    last_triggered_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ── CRUD ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[WebhookResponse])
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """List all webhooks for the current organization."""
    result = await db.execute(
        select(Webhook)
        .where(Webhook.organization_id == current_user.organization_id)
        .order_by(Webhook.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=WebhookResponse, status_code=201)
async def create_webhook(
    data: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Create a new outbound webhook subscription."""
    # Validate event types
    invalid = [e for e in data.events if e not in WEBHOOK_EVENTS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event types: {invalid}. Valid: {WEBHOOK_EVENTS}",
        )

    wh = Webhook(
        organization_id=current_user.organization_id,
        name=data.name,
        url=data.url,
        secret=secrets.token_urlsafe(32),
        events=data.events,
        created_by=current_user.id,
    )
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    return wh


@router.patch("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: uuid.UUID,
    data: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Update a webhook subscription."""
    result = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id,
        )
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if data.name is not None:
        wh.name = data.name
    if data.url is not None:
        wh.url = data.url
    if data.events is not None:
        invalid = [e for e in data.events if e not in WEBHOOK_EVENTS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid events: {invalid}")
        wh.events = data.events
    if data.is_active is not None:
        wh.is_active = data.is_active
        if data.is_active:
            wh.failure_count = "0"  # Reset on re-enable

    await db.commit()
    await db.refresh(wh)
    return wh


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Delete a webhook subscription."""
    result = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id,
        )
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(wh)
    await db.commit()


@router.get("/events")
async def list_supported_events(
    current_user=Depends(require_role("admin")),
):
    """List all supported webhook event types."""
    return {"events": WEBHOOK_EVENTS}


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Send a test payload to a webhook endpoint."""
    result = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.organization_id == current_user.organization_id,
        )
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    from app.services.webhook_service import dispatch_event
    await dispatch_event(
        event_type="test.ping",
        org_id=str(current_user.organization_id),
        payload={"message": "Test webhook from WATOS", "webhook_id": str(webhook_id)},
        db=db,
    )
    return {"status": "test payload sent"}
