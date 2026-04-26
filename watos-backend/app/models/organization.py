import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    plan = Column(String(50), default="free")  # free | pro | enterprise
    
    # Settings
    require_mfa = Column(Boolean, default=False)
    allow_public_registration = Column(Boolean, default=True)
    allowed_domains = Column(String(255), default="")
    max_users = Column(Integer, default=100)
    session_timeout_minutes = Column(Integer, default=60)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
