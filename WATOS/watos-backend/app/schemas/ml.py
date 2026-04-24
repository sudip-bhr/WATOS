from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import uuid
from datetime import datetime


class PredictDurationRequest(BaseModel):
    complexity: float
    effort_hours: float
    completion_rate: float = 0.8
    days_to_deadline: int
    workload_at_assignment: float = 0.5


class PredictDurationResponse(BaseModel):
    predicted_hours: float


class PredictDelayRequest(BaseModel):
    complexity: float
    days_to_deadline: int
    workload_at_assignment: float
    priority_score: float
    effort_hours: float


class PredictDelayResponse(BaseModel):
    delay_prob: float
    risk_level: str  # LOW | MEDIUM | HIGH


class ClusterResponse(BaseModel):
    task_id: uuid.UUID
    cluster_id: int
    complexity: float
    effort_hours: float
    priority_score: Optional[float]


class ShapResponse(BaseModel):
    task_id: uuid.UUID
    base_value: float
    contributions: Dict[str, float]
    human_readable: str


class ModelVersionResponse(BaseModel):
    id: uuid.UUID
    model_type: str
    version: int
    accuracy_score: Optional[float]
    is_active: bool
    trained_at: datetime

    model_config = {"from_attributes": True}


class RetrainResponse(BaseModel):
    status: str
    task_id: str
