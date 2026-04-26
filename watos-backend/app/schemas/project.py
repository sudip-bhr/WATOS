from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    admin_id: Optional[uuid.UUID] = None
    organization_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}
