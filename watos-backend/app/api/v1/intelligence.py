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


@router.get("/suggest-operator")
async def suggest_operator(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """
    ML suggestion for best operator to manage a specific member based on:
    - Operator team size (fewer members is better)
    - Operator team workload (lower utilization is better)
    - Skill gap alignment (member skills filling operator team gaps)
    """
    from sqlalchemy import select
    from app.models.user import User
    from app.models.task import Task
    from app.services.workload_service import compute_utilization
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.preprocessing import MultiLabelBinarizer
    import numpy as np

    # 1. Get member details
    member = await db.get(User, member_id)
    if not member or member.role != "member":
        raise HTTPException(status_code=404, detail="Member not found")
    member_skills = member.skills or []

    # 2. Get all operators in org
    op_query = select(User).where(
        User.role == "operator",
        User.organization_id == current_user.organization_id,
        User.is_active == True,
        User.is_deleted == False
    )
    operators = (await db.execute(op_query)).scalars().all()
    if not operators:
        raise HTTPException(status_code=400, detail="No operators found in organization")

    # 3. Gather operator stats
    candidates = []
    max_team_size = 0
    all_team_skills = []

    for op in operators:
        # Get operator's team
        team_query = select(User).where(User.operator_id == op.id, User.is_deleted == False)
        team = (await db.execute(team_query)).scalars().all()
        team_size = len(team)
        max_team_size = max(max_team_size, team_size)
        
        # Get team workload
        team_ids = [u.id for u in team]
        team_utilization = 0
        team_skill_set = set()
        
        if team_ids:
            task_query = select(Task).where(
                Task.assignee_id.in_(team_ids), 
                Task.status != "done", 
                Task.is_deleted == False
            )
            active_tasks = (await db.execute(task_query)).scalars().all()
            
            # Simple average utilization across team members
            total_capacity = sum(u.capacity_hours or 40.0 for u in team)
            if total_capacity > 0:
                tasks_dict = [{"effort_hours": t.effort_hours, "status": t.status} for t in active_tasks]
                team_utilization = compute_utilization(tasks_dict, total_capacity)
            
            for u in team:
                if u.skills:
                    team_skill_set.update(u.skills)
        
        all_team_skills.append(list(team_skill_set))

        candidates.append({
            "operator_id": str(op.id),
            "full_name": op.full_name or op.email,
            "email": op.email,
            "skills": op.skills or [],
            "team_size": team_size,
            "team_utilization": round(team_utilization, 3),
        })

    # 4. Compute skill gap scores (how much the member's skills differ from the team's existing skills)
    # We want to assign members to teams where they bring NEW skills
    skill_gap_scores = [0.0] * len(candidates)
    if member_skills:
        mlb = MultiLabelBinarizer()
        # Transform all team skills + member skills
        try:
            skill_matrix = mlb.fit_transform(all_team_skills + [member_skills])
            member_vec = skill_matrix[-1].reshape(1, -1)
            team_vecs = skill_matrix[:-1]
            
            # Higher similarity = lower gap. We want higher gap (1 - similarity)
            similarities = cosine_similarity(member_vec, team_vecs)[0]
            skill_gap_scores = [1.0 - float(s) for s in similarities]
        except Exception:
            pass # Ignore if ML fails

    # 5. Calculate final scores
    for i, c in enumerate(candidates):
        # Normalize team size (0 to 1, where 1 is best/smallest)
        size_score = 1.0 - (c["team_size"] / max(max_team_size, 1))
        
        # Workload score (0 to 1, where 1 is best/lowest utilization)
        workload_score = max(1.0 - c["team_utilization"], 0.0)
        
        # Skill gap score
        skill_score = skill_gap_scores[i]
        
        # Weights: 40% workload, 40% team size, 20% skill gap
        c["combined_score"] = round((workload_score * 0.4) + (size_score * 0.4) + (skill_score * 0.2), 3)
        
        # Generate reason
        reasons = []
        if workload_score > 0.7: reasons.append("low team workload")
        if size_score > 0.7: reasons.append("smaller team size")
        if skill_score > 0.7: reasons.append("member fills skill gaps")
        c["reason"] = " and ".join(reasons).capitalize() if reasons else "Based on overall balance"

    # Sort descending
    candidates.sort(key=lambda x: x["combined_score"], reverse=True)

    return {
        "member_id": str(member_id),
        "recommended": candidates[0] if candidates else None,
        "candidates": candidates
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
