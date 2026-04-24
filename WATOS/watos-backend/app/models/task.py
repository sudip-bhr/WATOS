import uuid
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.session import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="todo", index=True)  # todo | in_progress | review | approved | done | blocked | rejected
    priority_score = Column(Float)
    complexity = Column(Float, default=1.0)
    effort_hours = Column(Float)
    actual_hours = Column(Float)
    deadline = Column(DateTime(timezone=True), index=True)
    completed_at = Column(DateTime(timezone=True))
    delay_prob = Column(Float)
    predicted_hours = Column(Float)
    cluster_id = Column(Integer)
    pert_estimate = Column(Float)
    pert_std_dev = Column(Float)
    optimistic_hrs = Column(Float)
    pessimistic_hrs = Column(Float)
    most_likely_hrs = Column(Float)
    shap_explanation = Column(JSONB)
    required_skills = Column(ARRAY(String), default=[])

    # SLA fields
    sla_hours = Column(Integer, nullable=True)
    escalation_level = Column(Integer, default=0)

    # Soft delete
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    blocked_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
