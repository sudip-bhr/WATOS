from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db.session import get_db
from app.core.dependencies import require_role
from app.models.task import Task
from app.models.user import User
from app.schemas.workload import WorkloadSummary, ImbalanceResponse, AssignmentRecommendation
from app.services.workload_service import compute_utilization, compute_imbalance
from app.services.assignment_service import recommend_assignee
import uuid

router = APIRouter()


@router.get("/utilization", response_model=List[WorkloadSummary])
async def get_utilization(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    users_result = await db.execute(select(User).where(User.role == "member", User.is_active == True, User.is_deleted == False))
    users = users_result.scalars().all()

    summaries = []
    for user in users:
        tasks_result = await db.execute(
            select(Task).where(Task.assignee_id == user.id, Task.status != "done", Task.is_deleted == False)
        )
        tasks = tasks_result.scalars().all()
        tasks_dict = [{"effort_hours": t.effort_hours, "status": t.status} for t in tasks]
        util = compute_utilization(tasks_dict, user.capacity_hours)
        summaries.append(WorkloadSummary(
            user_id=user.id,
            full_name=user.full_name or user.email,
            utilization=util,
            assigned_tasks=len(tasks),
            skills=user.skills or [],
        ))
    return summaries


@router.get("/imbalance", response_model=ImbalanceResponse)
async def get_imbalance(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    users_result = await db.execute(select(User).where(User.is_active == True, User.is_deleted == False))
    users = users_result.scalars().all()

    summaries = []
    utilizations = []
    for user in users:
        tasks_result = await db.execute(
            select(Task).where(Task.assignee_id == user.id, Task.status != "done", Task.is_deleted == False)
        )
        tasks = tasks_result.scalars().all()
        tasks_dict = [{"effort_hours": t.effort_hours, "status": t.status} for t in tasks]
        util = compute_utilization(tasks_dict, user.capacity_hours)
        utilizations.append(util)
        summaries.append(WorkloadSummary(
            user_id=user.id,
            full_name=user.full_name or user.email,
            utilization=util,
            assigned_tasks=len(tasks),
            skills=user.skills or [],
        ))

    return ImbalanceResponse(
        imbalance_score=compute_imbalance(utilizations),
        team_utilizations=summaries,
    )


@router.get("/recommendations", response_model=List[AssignmentRecommendation])
async def get_recommendations(
    task_skills: str = "",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    users_result = await db.execute(select(User).where(User.role == "member", User.is_active == True, User.is_deleted == False))
    users = users_result.scalars().all()

    utilizations = {}
    for user in users:
        tasks_result = await db.execute(
            select(Task).where(Task.assignee_id == user.id, Task.status != "done", Task.is_deleted == False)
        )
        tasks = tasks_result.scalars().all()
        tasks_dict = [{"effort_hours": t.effort_hours, "status": t.status} for t in tasks]
        utilizations[str(user.id)] = compute_utilization(tasks_dict, user.capacity_hours)

    skills_list = [s.strip() for s in task_skills.split(",") if s.strip()]
    users_dict = [{"id": str(u.id), "full_name": u.full_name or u.email, "skills": u.skills or []} for u in users]
    recs = recommend_assignee(skills_list, users_dict, utilizations)

    return [
        AssignmentRecommendation(
            user_id=r["user_id"],
            full_name=r["full_name"],
            skill_match=r["skill_match"],
            availability=r["availability"],
            combined_score=r["combined_score"],
            reason=r["reason"],
        )
        for r in recs[:5]
    ]


@router.get("/rebalancing", response_model=List[dict])
async def get_rebalancing(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    users_result = await db.execute(select(User).where(User.role == "member", User.is_active == True, User.is_deleted == False))
    users = users_result.scalars().all()
    
    tasks_result = await db.execute(select(Task).where(Task.status != "done", Task.is_deleted == False))
    tasks = tasks_result.scalars().all()

    utilizations = {}
    users_list = []
    for user in users:
        u_tasks = [t for t in tasks if t.assignee_id == user.id]
        tasks_dict = [{"effort_hours": t.effort_hours, "status": t.status} for t in u_tasks]
        util = compute_utilization(tasks_dict, user.capacity_hours)
        utilizations[str(user.id)] = util
        users_list.append({"id": user.id, "full_name": user.full_name or user.email, "skills": user.skills or []})

    from app.services.workload_service import get_rebalancing_suggestions
    return get_rebalancing_suggestions(tasks, users_list, utilizations)
