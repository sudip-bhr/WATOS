import uuid
from sqlalchemy import Column, Boolean, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base

class MLConfig(Base):
    __tablename__ = "ml_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    delay_prediction_enabled = Column(Boolean, default=True)
    shap_explanations_enabled = Column(Boolean, default=True)
    confidence_threshold = Column(Float, default=0.75)
    auto_rebalance_enabled = Column(Boolean, default=False)
    auto_assignment_enabled = Column(Boolean, default=True)
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
