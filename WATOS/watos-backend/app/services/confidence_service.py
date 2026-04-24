"""
Confidence Service — Cold Start Mitigation.
Addresses the "Cold Start Accuracy" limitation by:
  1. Attaching confidence bands to every ML prediction based on training data volume
  2. Providing progressive confidence levels so the UI can display appropriate caveats
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.task import Task
from app.core.logging import get_logger

logger = get_logger("confidence_service")

# Thresholds for confidence levels
_LOW_THRESHOLD = 20
_MEDIUM_THRESHOLD = 50
_HIGH_THRESHOLD = 100


def compute_confidence(org_task_count: int) -> dict:
    """
    Returns confidence level based on completed task volume for the org.
    This is attached to every ML prediction so the UI can show appropriate caveats.
    """
    if org_task_count < _LOW_THRESHOLD:
        score = round(0.3 + (org_task_count / _LOW_THRESHOLD) * 0.2, 2)
        return {
            "level": "low",
            "label": "Beta",
            "score": score,
            "task_count": org_task_count,
            "tasks_needed": _MEDIUM_THRESHOLD - org_task_count,
            "message": f"Predictions are preliminary ({org_task_count}/{_MEDIUM_THRESHOLD} tasks). Complete more tasks for accuracy.",
        }
    elif org_task_count < _HIGH_THRESHOLD:
        score = round(0.5 + ((org_task_count - _LOW_THRESHOLD) / (_HIGH_THRESHOLD - _LOW_THRESHOLD)) * 0.4, 2)
        return {
            "level": "medium",
            "label": "Improving",
            "score": score,
            "task_count": org_task_count,
            "tasks_needed": _HIGH_THRESHOLD - org_task_count,
            "message": f"Model is learning your patterns ({org_task_count}/{_HIGH_THRESHOLD} tasks for high confidence).",
        }
    else:
        return {
            "level": "high",
            "label": "Confident",
            "score": 0.95,
            "task_count": org_task_count,
            "tasks_needed": 0,
            "message": "Predictions are calibrated to your organization's data.",
        }


async def get_org_confidence(org_id: str, db: AsyncSession) -> dict:
    """Get the confidence level for an organization based on completed task count."""
    result = await db.execute(
        select(func.count(Task.id)).where(
            Task.organization_id == org_id,
            Task.status == "done",
            Task.is_deleted == False,
        )
    )
    task_count = result.scalar() or 0
    return compute_confidence(task_count)
