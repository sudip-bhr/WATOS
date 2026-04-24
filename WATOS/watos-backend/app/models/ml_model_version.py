import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base


class MLModelVersion(Base):
    __tablename__ = "ml_model_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_type = Column(String(50), nullable=False)  # duration | delay | clustering
    version = Column(Integer, nullable=False)
    accuracy_score = Column(Float)
    file_path = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
    trained_at = Column(DateTime(timezone=True), server_default=func.now())
    trained_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
