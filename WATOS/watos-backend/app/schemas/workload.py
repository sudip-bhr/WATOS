from pydantic import BaseModel
from typing import List
import uuid


class WorkloadSummary(BaseModel):
    user_id: uuid.UUID
    full_name: str
    utilization: float
    assigned_tasks: int
    skills: List[str]


class ImbalanceResponse(BaseModel):
    imbalance_score: float
    team_utilizations: List[WorkloadSummary]


class AssignmentRecommendation(BaseModel):
    user_id: uuid.UUID
    full_name: str
    skill_match: float
    availability: float
    combined_score: float
    reason: str
