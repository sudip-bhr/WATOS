from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class ShapExplanation(BaseModel):
    base_value: float
    contributions: Dict[str, float]
    human_readable: str


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[uuid.UUID] = None
    assignee_id: Optional[uuid.UUID] = None
    status: str = "todo"
    complexity: float = 1.0
    effort_hours: float
    deadline: datetime
    optimistic_hrs: Optional[float] = None
    most_likely_hrs: Optional[float] = None
    pessimistic_hrs: Optional[float] = None
    required_skills: List[str] = []
    sla_hours: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    complexity: Optional[float] = None
    effort_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    deadline: Optional[datetime] = None
    required_skills: Optional[List[str]] = None
    sla_hours: Optional[int] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    project_id: Optional[uuid.UUID] = None
    assignee_id: Optional[uuid.UUID] = None
    created_by: Optional[uuid.UUID] = None
    status: str
    priority_score: Optional[float] = None
    complexity: float
    effort_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    deadline: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    delay_prob: Optional[float] = None
    predicted_hours: Optional[float] = None
    cluster_id: Optional[int] = None
    pert_estimate: Optional[float] = None
    pert_std_dev: Optional[float] = None
    optimistic_hrs: Optional[float] = None
    pessimistic_hrs: Optional[float] = None
    most_likely_hrs: Optional[float] = None
    shap_explanation: Optional[Dict[str, Any]] = None
    required_skills: List[str] = []
    sla_hours: Optional[int] = None
    escalation_level: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class DependencyCreate(BaseModel):
    blocker_task_id: uuid.UUID
    blocked_task_id: uuid.UUID


class DependencyResponse(BaseModel):
    id: uuid.UUID
    blocker_task_id: uuid.UUID
    blocked_task_id: uuid.UUID

    model_config = {"from_attributes": True}
