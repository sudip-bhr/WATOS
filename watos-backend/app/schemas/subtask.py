from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class SubtaskCreate(BaseModel):
    title: str


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None


class SubtaskResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    title: str
    is_completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}
