"""
Resource Leveling Engine.
Addresses the "Resource Leveling" feature gap by providing automated
task rebalancing proposals with operator approval workflow.

The engine generates proposals — it NEVER auto-executes without approval.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class RebalanceProposal(Base):
    __tablename__ = "rebalance_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)

    # The task being proposed for reassignment
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    task_title = Column(String(255), nullable=True)

    # Current and proposed assignee
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    from_user_name = Column(String(100), nullable=True)
    to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    to_user_name = Column(String(100), nullable=True)

    # Impact analysis
    reason = Column(Text, nullable=True)
    from_utilization_before = Column(Float, nullable=True)
    from_utilization_after = Column(Float, nullable=True)
    to_utilization_before = Column(Float, nullable=True)
    to_utilization_after = Column(Float, nullable=True)
    skill_match_score = Column(Float, nullable=True)

    # Approval workflow: pending → approved → executed | rejected
    status = Column(String(20), default="pending", index=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
