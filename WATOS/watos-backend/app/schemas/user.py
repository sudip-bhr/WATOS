from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "member"
    capacity_hours: float = 40.0
    skills: List[str] = []


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    capacity_hours: Optional[float] = None
    skills: Optional[List[str]] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    organization_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}
