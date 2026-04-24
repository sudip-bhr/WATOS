"""
Auto-Assignment & Anomaly Detection API.
Provides endpoints for skill-based task assignment and operator performance anomaly detection.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class AutoAssignRequest(BaseModel):
    required_skills: List[str] = Field(default_factory=list)
    exclude_user_ids: Optional[List[str]] = None
    capacity_threshold: float = Field(default=0.90, ge=0.0, le=1.0)


class CandidateResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    skills: List[str]
    skill_match: float
    availability: float
    utilization: float
    reliability: float
    combined_score: float
    reason: str


class AutoAssignResponse(BaseModel):
    recommended: Optional[CandidateResponse] = None
    candidates: List[CandidateResponse]
    auto_assigned: bool


class AnomalyFlag(BaseModel):
    metric: str
    type: str
    severity: str
    value: float
    org_mean: float
    z_score: float
    description: str


class AnomalyUser(BaseModel):
    user_id: str
    full_name: str
    flags: List[AnomalyFlag]
    overall_severity: str
    total_tasks: int


class UserMetric(BaseModel):
    user_id: str
    full_name: str
    total_tasks: int
    on_time_rate: float
    throughput_weekly: float
    rejection_rate: float
    effort_deviation: float


# ── Auto-Assignment ───────────────────────────────────────────────────

@router.post("/auto-assign", response_model=AutoAssignResponse)
async def auto_assign_task(
    data: AutoAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """
    Get optimal assignee recommendation based on skill match, availability,
    and historical reliability.
    """
    from app.services.auto_assignment_service import auto_assign

    result = await auto_assign(
        task_skills=data.required_skills,
        org_id=str(current_user.organization_id),
        db=db,
        exclude_user_ids=data.exclude_user_ids,
        capacity_threshold=data.capacity_threshold,
    )

    return AutoAssignResponse(
        recommended=CandidateResponse(**result["recommended"]) if result["recommended"] else None,
        candidates=[CandidateResponse(**c) for c in result["candidates"]],
        auto_assigned=result["auto_assigned"],
    )


@router.post("/auto-assign/{task_id}")
async def auto_assign_existing_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """
    Auto-assign an existing unassigned task to the best candidate.
    Only works on tasks with status 'todo' and no current assignee.
    """
    from sqlalchemy import select
    from app.models.task import Task
    from app.services.auto_assignment_service import auto_assign

    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.is_deleted == False)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.assignee_id:
        raise HTTPException(status_code=400, detail="Task is already assigned. Unassign first.")

    assignment = await auto_assign(
        task_skills=task.required_skills or [],
        org_id=str(current_user.organization_id),
        db=db,
    )

    if not assignment["auto_assigned"] or not assignment["recommended"]:
        raise HTTPException(status_code=422, detail="No suitable candidate found for auto-assignment")

    # Apply the assignment
    task.assignee_id = uuid.UUID(assignment["recommended"]["user_id"])
    await db.commit()
    await db.refresh(task)

    return {
        "status": "assigned",
        "task_id": str(task.id),
        "assignee": assignment["recommended"],
    }


# ── Anomaly Detection ────────────────────────────────────────────────

@router.get("/anomalies")
async def get_anomalies(
    lookback_days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """
    Detect performance anomalies across all operators in the organization.
    Uses Z-score statistical analysis on completion rate, throughput,
    rejection rate, and effort accuracy.
    """
    from app.services.anomaly_detection_service import detect_anomalies

    return await detect_anomalies(
        org_id=str(current_user.organization_id),
        db=db,
        lookback_days=lookback_days,
    )


@router.get("/anomalies/{user_id}")
async def get_user_anomalies(
    user_id: uuid.UUID,
    lookback_days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """
    Get anomaly details for a specific user.
    Operators can only view their own team members.
    """
    from app.services.anomaly_detection_service import detect_anomalies

    result = await detect_anomalies(
        org_id=str(current_user.organization_id),
        db=db,
        lookback_days=lookback_days,
    )

    # Find the specific user's anomalies
    user_anomaly = next(
        (a for a in result.get("anomalies", []) if a["user_id"] == str(user_id)),
        None,
    )

    # Find the user's metrics
    user_metric = next(
        (m for m in result.get("user_metrics", []) if m["user_id"] == str(user_id)),
        None,
    )

    return {
        "user_id": str(user_id),
        "anomalies": user_anomaly["flags"] if user_anomaly else [],
        "metrics": user_metric,
        "baselines": result.get("baselines", {}),
        "has_anomalies": user_anomaly is not None,
    }
