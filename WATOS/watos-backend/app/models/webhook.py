"""
Webhook Model.
Stores outbound webhook subscriptions for external integrations.
Each org can register URLs to receive events (task.created, task.status_changed, etc.)
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.db.session import Base


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)

    # Webhook configuration
    name = Column(String(100), nullable=False)         # e.g., "Jira Sync", "Slack Alerts"
    url = Column(Text, nullable=False)                 # Target endpoint URL
    secret = Column(String(255), nullable=False)       # HMAC signing secret
    events = Column(ARRAY(String), nullable=False)     # Events to subscribe to

    # Status
    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    failure_count = Column(String, default="0")        # Track consecutive failures

    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


# Supported event types
WEBHOOK_EVENTS = [
    "task.created",
    "task.updated",
    "task.status_changed",
    "task.assigned",
    "task.completed",
    "task.deleted",
    "project.created",
    "project.updated",
    "ml.retraining_complete",
    "user.created",
]
