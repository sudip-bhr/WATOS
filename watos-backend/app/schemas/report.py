from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
import uuid


class MonthlyReportBase(BaseModel):
    achievements: Optional[str] = None
    challenges: Optional[str] = None
    support_needed: Optional[str] = None


class MonthlyReportCreate(MonthlyReportBase):
    pass


class MonthlyReportUpdate(MonthlyReportBase):
    status: Optional[str] = None


class MonthlyReportResponse(MonthlyReportBase):
    id: uuid.UUID
    operator_id: uuid.UUID
    organization_id: uuid.UUID
    month_year: str
    status: str
    
    team_size: int
    tasks_completed: int
    tasks_overdue: int
    avg_utilization: float
    skill_gaps: List[str]

    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
