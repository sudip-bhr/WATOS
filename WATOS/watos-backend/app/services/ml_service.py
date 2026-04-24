"""
ML Service Layer.
Provides both synchronous (in-process) and asynchronous (Celery) paths for ML operations.

- Synchronous: For single-task predictions where latency matters (task creation).
- Asynchronous: For batch retraining and heavy SHAP explanations via Celery workers.
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.logging import get_logger

logger = get_logger("ml_service")


async def get_user_completion_rate(user_id: str, db: AsyncSession) -> float:
    """Calculate historical task completion rate for a user."""
    try:
        from app.models.task_history import TaskHistory
        result = await db.execute(
            select(func.count(), func.sum(TaskHistory.was_delayed.cast(type_=None)))
            .where(TaskHistory.user_id == user_id)
        )
        row = result.first()
        total = row[0] if row else 0
        delayed = row[1] if row and row[1] else 0
        if total == 0:
            return 0.8  # Default completion rate
        return round(1 - (delayed / total), 4)
    except Exception:
        return 0.8


async def run_full_pipeline(task_data: dict, assignee_workload: float, db: AsyncSession) -> dict:
    """
    Runs the complete ML pipeline for a task (SYNCHRONOUS — in FastAPI process).
    Best for: single-task predictions during task creation/update.
    Returns: predicted_hours, delay_prob, pert_estimate, priority_score, shap_explanation
    """
    from app.ml.predictor import predict_duration, predict_delay_prob, compute_priority
    from app.ml.pert import pert_estimate
    from app.ml.explainer import explain_delay_prediction

    assignee_id = task_data.get("assignee_id")
    completion_rate = await get_user_completion_rate(assignee_id, db) if assignee_id else 0.8

    deadline = task_data.get("deadline", datetime.now(timezone.utc))
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    days_to_deadline = max((deadline - datetime.now(timezone.utc)).days, 0)

    features = {
        "complexity": task_data.get("complexity", 1.0),
        "effort_hours": task_data.get("effort_hours", 8.0),
        "completion_rate": completion_rate,
        "days_to_deadline": days_to_deadline,
        "workload_at_assignment": assignee_workload,
        "priority_score": 0.5,  # placeholder before full calc
    }

    predicted_hours = predict_duration(features)
    delay_prob = predict_delay_prob(features)

    opt = task_data.get("optimistic_hrs") or features["effort_hours"] * 0.7
    likely = task_data.get("most_likely_hrs") or features["effort_hours"]
    pess = task_data.get("pessimistic_hrs") or features["effort_hours"] * 1.5
    pert = pert_estimate(opt, likely, pess)

    priority = compute_priority(deadline, delay_prob, task_data.get("complexity", 1.0))
    shap_exp = explain_delay_prediction(features)

    return {
        "predicted_hours": predicted_hours,
        "delay_prob": delay_prob,
        "pert_estimate": pert["expected_hours"],
        "pert_std_dev": pert["std_dev"],
        "priority_score": priority,
        "shap_explanation": shap_exp,
    }


# ── Async (Celery) operations ────────────────────────────────────────

def dispatch_retrain_async() -> str:
    """
    Trigger batch retraining via Celery worker.
    Returns the Celery task ID for status polling.
    """
    from app.workers.ml_tasks import retrain_models_task
    result = retrain_models_task.delay()
    logger.info("Dispatched async retraining", extra={"celery_task_id": result.id})
    return result.id


def dispatch_explain_async(features: dict) -> str:
    """
    Dispatch SHAP explanation to Celery worker (CPU-intensive).
    Returns the Celery task ID for status polling.
    """
    from app.workers.ml_tasks import explain_task
    result = explain_task.delay(features)
    return result.id


def get_celery_task_status(task_id: str) -> dict:
    """Poll the status of a Celery task."""
    from app.workers.celery_app import celery_app
    result = celery_app.AsyncResult(task_id)
    response = {
        "task_id": task_id,
        "status": result.status,
    }
    if result.ready():
        response["result"] = result.result
    return response
