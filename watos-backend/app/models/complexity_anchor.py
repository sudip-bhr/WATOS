"""
Complexity Anchor Model.
Stores organization-level reference tasks for calibrating complexity scores.
Operators see these benchmarks when assigning complexity, reducing subjective bias.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class ComplexityAnchor(Base):
    __tablename__ = "complexity_anchors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)

    # The reference complexity level this anchor represents (1-10)
    complexity_level = Column(Float, nullable=False)

    # Description of what this complexity level means in the org's context
    label = Column(String(100), nullable=False)          # e.g., "Simple Pick & Pack"
    description = Column(Text, nullable=True)            # Detailed explanation
    example_task = Column(String(255), nullable=True)    # e.g., "Single-item order fulfillment"

    # Typical metrics for this complexity level
    typical_effort_hours = Column(Float, nullable=True)
    typical_duration_hours = Column(Float, nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
