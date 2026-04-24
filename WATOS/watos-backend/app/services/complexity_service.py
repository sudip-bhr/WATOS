"""
Complexity Calibration Service.
Addresses the "Subjective Complexity Bias" limitation by providing:
  1. Auto-suggestion: ML-based complexity estimator from historical similar tasks
  2. Drift detection: Statistical monitoring of per-operator scoring distributions
"""
import numpy as np
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.task import Task
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger("complexity_service")


async def suggest_complexity(
    project_id: str,
    effort_hours: float,
    required_skills: Optional[list],
    db: AsyncSession,
) -> dict:
    """
    Estimate task complexity from historically completed similar tasks.
    Returns a suggestion with confidence based on sample size.
    """
    # Find completed tasks in the same project with similar effort hours
    query = (
        select(Task.complexity, Task.effort_hours)
        .where(
            Task.project_id == project_id,
            Task.status == "done",
            Task.is_deleted == False,
            Task.complexity.isnot(None),
        )
    )

    # Filter by similar effort range (±30%)
    if effort_hours and effort_hours > 0:
        query = query.where(
            Task.effort_hours.between(effort_hours * 0.7, effort_hours * 1.3)
        )

    result = await db.execute(query.limit(50))
    similar_tasks = result.all()

    if not similar_tasks:
        return {
            "suggested_complexity": 5.0,
            "confidence": "low",
            "sample_size": 0,
            "message": "No similar completed tasks found. Using neutral default.",
        }

    complexities = [t.complexity for t in similar_tasks if t.complexity]

    if not complexities:
        return {
            "suggested_complexity": 5.0,
            "confidence": "low",
            "sample_size": 0,
            "message": "No complexity data available from similar tasks.",
        }

    suggested = round(float(np.median(complexities)), 1)
    sample_size = len(complexities)

    # Confidence based on sample size
    if sample_size >= 10:
        confidence = "high"
    elif sample_size >= 5:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "suggested_complexity": suggested,
        "confidence": confidence,
        "sample_size": sample_size,
        "range": {
            "min": round(float(np.min(complexities)), 1),
            "max": round(float(np.max(complexities)), 1),
            "std": round(float(np.std(complexities)), 2),
        },
        "message": f"Based on {sample_size} similar completed tasks (median: {suggested}).",
    }


async def detect_scoring_drift(org_id: str, db: AsyncSession) -> dict:
    """
    Compare each operator's average complexity scoring vs the org baseline.
    Flags operators whose mean deviates > 1.5 standard deviations from org mean.
    """
    # Get all completed tasks with assigned complexity in this org
    result = await db.execute(
        select(
            Task.assignee_id,
            func.avg(Task.complexity).label("avg_complexity"),
            func.stddev(Task.complexity).label("std_complexity"),
            func.count(Task.id).label("task_count"),
        )
        .where(
            Task.organization_id == org_id,
            Task.status == "done",
            Task.is_deleted == False,
            Task.complexity.isnot(None),
        )
        .group_by(Task.assignee_id)
        .having(func.count(Task.id) >= 5)  # Need min 5 tasks for meaningful stats
    )
    operator_stats = result.all()

    if not operator_stats:
        return {
            "drift_detected": False,
            "org_mean": None,
            "flagged_users": [],
            "message": "Not enough data to detect drift. Need at least 5 completed tasks per operator.",
        }

    # Calculate org-wide baseline
    all_avgs = [float(s.avg_complexity) for s in operator_stats]
    org_mean = float(np.mean(all_avgs))
    org_std = float(np.std(all_avgs)) if len(all_avgs) > 1 else 1.0

    # Flag outliers
    flagged = []
    for stat in operator_stats:
        user_avg = float(stat.avg_complexity)
        deviation = abs(user_avg - org_mean) / max(org_std, 0.1)

        if deviation > 1.5:
            # Get user name
            user_result = await db.execute(
                select(User.full_name, User.email).where(User.id == stat.assignee_id)
            )
            user = user_result.first()
            user_name = user.full_name or user.email if user else "Unknown"

            flagged.append({
                "user_id": str(stat.assignee_id),
                "user_name": user_name,
                "avg_complexity": round(user_avg, 2),
                "task_count": stat.task_count,
                "deviation_sigma": round(deviation, 2),
                "direction": "high" if user_avg > org_mean else "low",
                "message": f"{user_name} scores {'higher' if user_avg > org_mean else 'lower'} than average ({user_avg:.1f} vs {org_mean:.1f})",
            })

    return {
        "drift_detected": len(flagged) > 0,
        "org_mean": round(org_mean, 2),
        "org_std": round(org_std, 2),
        "operator_count": len(operator_stats),
        "flagged_users": flagged,
        "message": f"{len(flagged)} operator(s) show scoring drift." if flagged else "No significant drift detected.",
    }
