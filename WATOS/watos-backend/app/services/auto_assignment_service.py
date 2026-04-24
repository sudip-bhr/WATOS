"""
Skill-Based Auto-Assignment Service.
Automatically selects the optimal assignee for a task by matching
task.required_skills against user.skills, weighted by availability.

Scoring formula:
  combined = W_skill * skill_match + W_avail * availability + W_hist * historical_reliability
  Default weights: W_skill=0.50, W_avail=0.30, W_hist=0.20
"""
import numpy as np
from typing import List, Optional
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.task import Task
from app.models.user import User
from app.models.task_history import TaskHistory
from app.services.workload_service import compute_utilization
from app.core.logging import get_logger

logger = get_logger("auto_assignment")

# Scoring weights
W_SKILL = 0.50
W_AVAIL = 0.30
W_HIST = 0.20


async def auto_assign(
    task_skills: List[str],
    org_id: str,
    db: AsyncSession,
    exclude_user_ids: Optional[List[str]] = None,
    capacity_threshold: float = 0.90,
) -> dict:
    """
    Find the optimal assignee for a task based on skill match, availability,
    and historical reliability.

    Args:
        task_skills: Skills required by the task
        org_id: Organization ID to scope users
        exclude_user_ids: Users to exclude (e.g., creator if they shouldn't self-assign)
        capacity_threshold: Max utilization to consider a user (default 90%)

    Returns:
        {
            "recommended": {...},  # Top pick with full scoring breakdown
            "candidates": [...],   # Ranked list of all eligible candidates
            "auto_assigned": bool, # Whether auto-assignment was possible
        }
    """
    # 1. Load eligible users
    query = select(User).where(
        User.organization_id == org_id,
        User.is_active == True,
        User.is_deleted == False,
        User.role.in_(["member", "operator"]),
    )
    result = await db.execute(query)
    users = result.scalars().all()

    if exclude_user_ids:
        users = [u for u in users if str(u.id) not in exclude_user_ids]

    if not users:
        return {"recommended": None, "candidates": [], "auto_assigned": False}

    # 2. Compute utilization for each user
    utilizations = {}
    for user in users:
        tasks_result = await db.execute(
            select(Task).where(
                Task.assignee_id == user.id,
                Task.status.notin_(["done", "rejected"]),
                Task.is_deleted == False,
            )
        )
        user_tasks = tasks_result.scalars().all()
        tasks_dict = [{"effort_hours": t.effort_hours or 0, "status": t.status} for t in user_tasks]
        utilizations[str(user.id)] = compute_utilization(tasks_dict, user.capacity_hours or 40.0)

    # 3. Filter out over-capacity users
    eligible_users = [u for u in users if utilizations.get(str(u.id), 0) < capacity_threshold]
    if not eligible_users:
        # Fall back to all users if everyone is busy
        eligible_users = users

    # 4. Compute skill match scores
    skill_scores = _compute_skill_scores(task_skills, eligible_users)

    # 5. Compute historical reliability scores
    reliability_scores = await _compute_reliability_scores(eligible_users, db)

    # 6. Build ranked candidates
    candidates = []
    for i, user in enumerate(eligible_users):
        uid = str(user.id)
        availability = max(1.0 - utilizations.get(uid, 0), 0)
        skill_match = skill_scores[i]
        reliability = reliability_scores.get(uid, 0.5)  # Neutral default

        combined = W_SKILL * skill_match + W_AVAIL * availability + W_HIST * reliability

        candidates.append({
            "user_id": uid,
            "full_name": user.full_name or user.email,
            "email": user.email,
            "skills": user.skills or [],
            "skill_match": round(skill_match, 3),
            "availability": round(availability, 3),
            "utilization": round(utilizations.get(uid, 0), 3),
            "reliability": round(reliability, 3),
            "combined_score": round(combined, 3),
            "reason": _build_reason(skill_match, availability, reliability),
        })

    # Sort by combined score descending
    candidates.sort(key=lambda x: x["combined_score"], reverse=True)

    recommended = candidates[0] if candidates else None
    auto_assigned = recommended is not None and recommended["combined_score"] > 0.3

    logger.info(
        f"Auto-assignment computed for org {org_id}",
        extra={
            "task_skills": task_skills,
            "candidate_count": len(candidates),
            "top_pick": recommended["full_name"] if recommended else None,
            "top_score": recommended["combined_score"] if recommended else 0,
        },
    )

    return {
        "recommended": recommended,
        "candidates": candidates[:10],  # Top 10
        "auto_assigned": auto_assigned,
    }


def _compute_skill_scores(task_skills: List[str], users: list) -> list:
    """Compute cosine similarity between task skills and each user's skills."""
    if not task_skills:
        return [0.0] * len(users)

    all_skills = [u.skills or [] for u in users] + [task_skills]
    mlb = MultiLabelBinarizer()
    skill_matrix = mlb.fit_transform(all_skills)

    task_vec = skill_matrix[-1].reshape(1, -1)
    user_vecs = skill_matrix[:-1]

    if user_vecs.shape[0] == 0:
        return []

    similarities = cosine_similarity(task_vec, user_vecs)[0]
    return [float(s) for s in similarities]


async def _compute_reliability_scores(users: list, db: AsyncSession) -> dict:
    """
    Compute historical reliability for each user.
    reliability = 1 - (delayed_tasks / total_completed_tasks)
    """
    scores = {}
    for user in users:
        uid = str(user.id)

        result = await db.execute(
            select(
                func.count(TaskHistory.id).label("total"),
                func.sum(
                    func.cast(TaskHistory.was_delayed, type_=func.literal(1).type)
                ).label("delayed"),
            ).where(TaskHistory.user_id == user.id)
        )
        row = result.first()

        if row and row.total and row.total > 0:
            total = row.total
            delayed = row.delayed or 0
            scores[uid] = round(1.0 - (delayed / total), 3)
        else:
            scores[uid] = 0.5  # Neutral for new users

    return scores


def _build_reason(skill: float, availability: float, reliability: float) -> str:
    """Generate a human-readable assignment reason."""
    parts = []
    if skill >= 0.8:
        parts.append("excellent skill match")
    elif skill >= 0.5:
        parts.append("good skill match")
    elif skill > 0:
        parts.append("partial skill match")

    if availability >= 0.7:
        parts.append("high availability")
    elif availability >= 0.4:
        parts.append("moderate availability")
    else:
        parts.append("limited availability")

    if reliability >= 0.8:
        parts.append("strong track record")
    elif reliability < 0.5:
        parts.append("improvement trend needed")

    return "; ".join(parts).capitalize() if parts else "Based on overall scoring"
