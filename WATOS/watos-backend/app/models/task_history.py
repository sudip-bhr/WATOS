import uuid
from sqlalchemy import Column, Float, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    was_delayed = Column(Boolean)
    predicted_hours = Column(Float)
    actual_hours = Column(Float)
    complexity = Column(Float)
    effort_hours = Column(Float)
    priority_score = Column(Float)
    days_to_deadline = Column(Integer)
    assignee_workload = Column(Float)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
