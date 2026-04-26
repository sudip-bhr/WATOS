from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_, cast, Float
from typing import List, Dict
import uuid
from datetime import datetime, timedelta, timezone
from app.db.session import get_db
from app.core.dependencies import require_role
from app.services.analytics_service import calculate_critical_path, get_skill_distribution
from app.models.task import Task
from app.models.user import User

router = APIRouter()


@router.get("/pert")
@router.get("/pert/{project_id}")
async def get_pert_chart(
    project_id: uuid.UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    if not project_id:
        # For mock/demo purposes, fetch first project if no ID provided
        from app.models.project import Project
        result = await db.execute(select(Project).limit(1))
        project = result.scalar_one_or_none()
        if not project:
            return {"nodes": [], "edges": []}
        project_id = project.id

    return await calculate_critical_path(project_id, db)


@router.get("/skills-gap")
async def get_skills_analytics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """Returns skill supply vs demand analytics."""
    return await get_skill_distribution(db)


@router.get("/member-performance")
async def get_member_performance(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """Returns per-member performance KPIs for analytics dashboards."""

    # Get all active members
    members_q = await db.execute(
        select(User).where(User.role == "member", User.is_active == True)
    )
    members = members_q.scalars().all()

    # Get all non-deleted tasks that have an assignee
    tasks_q = await db.execute(
        select(Task).where(
            Task.is_deleted == False,
            Task.assignee_id.isnot(None),
        )
    )
    all_tasks = tasks_q.scalars().all()

    # Group tasks by assignee
    tasks_by_user: Dict[str, list] = {}
    for t in all_tasks:
        uid = str(t.assignee_id)
        tasks_by_user.setdefault(uid, []).append(t)

    now = datetime.now(timezone.utc)
    four_weeks_ago = now - timedelta(weeks=4)

    results = []
    for member in members:
        uid = str(member.id)
        user_tasks = tasks_by_user.get(uid, [])

        total = len(user_tasks)
        done_tasks = [t for t in user_tasks if t.status == "done"]
        done_count = len(done_tasks)
        in_review = len([t for t in user_tasks if t.status == "review"])
        rejected = len([t for t in user_tasks if t.status == "rejected"])
        completion_rate = round((done_count / total * 100) if total > 0 else 0, 1)

        # On-time: completed before deadline
        on_time = 0
        for t in done_tasks:
            if t.completed_at and t.deadline and t.completed_at <= t.deadline:
                on_time += 1
        on_time_rate = round((on_time / done_count * 100) if done_count > 0 else 0, 1)

        # Avg actual vs estimated ratio
        ratios = []
        for t in done_tasks:
            if t.actual_hours and t.effort_hours and t.effort_hours > 0:
                ratios.append(t.actual_hours / t.effort_hours)
        avg_time_ratio = round(sum(ratios) / len(ratios), 2) if ratios else None

        # Weekly trend (last 4 weeks)
        weekly_trend = []
        for week_offset in range(3, -1, -1):
            week_start = now - timedelta(weeks=week_offset + 1)
            week_end = now - timedelta(weeks=week_offset)
            count = len([
                t for t in done_tasks
                if t.completed_at and week_start <= t.completed_at <= week_end
            ])
            weekly_trend.append({
                "week": f"W{4 - week_offset}",
                "completed": count,
            })

        results.append({
            "user_id": uid,
            "full_name": member.full_name,
            "email": member.email,
            "skills": member.skills or [],
            "total_tasks": total,
            "done_count": done_count,
            "completion_rate": completion_rate,
            "on_time_rate": on_time_rate,
            "avg_time_ratio": avg_time_ratio,
            "in_review": in_review,
            "rejected": rejected,
            "weekly_trend": weekly_trend,
        })

    # Sort by completion rate descending
    results.sort(key=lambda x: x["completion_rate"], reverse=True)

    return results

