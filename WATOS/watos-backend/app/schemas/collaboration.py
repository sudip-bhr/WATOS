from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    content: str
    created_at: datetime
    # Populated by the API (not from ORM directly)
    author_name: Optional[str] = None
    author_email: Optional[str] = None

    model_config = {"from_attributes": True}


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    file_url: str
    file_name: Optional[str] = None
    file_size: Optional[str] = None
    uploaded_by: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WatcherResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
