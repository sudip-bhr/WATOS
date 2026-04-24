import uuid
from sqlalchemy import Column, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50))  # delay_risk | overload | deadline | comment | mention | sla_breach | task_assigned
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    action_url = Column(String(500), nullable=True)
    action_type = Column(String(50), nullable=True) # e.g. "approve", "view", "reply"
    related_entity_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
