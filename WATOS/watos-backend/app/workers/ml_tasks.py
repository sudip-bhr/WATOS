"""
Celery tasks for ML operations.
These run in a separate worker process so they never block the FastAPI event loop.

Heavy operations offloaded here:
  - Batch model retraining
  - SHAP explanations (computationally expensive)
  - Full ML pipeline for batch predictions
"""
from app.workers.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger("ml_tasks")


@celery_app.task(name="app.workers.ml_tasks.retrain_models_task", bind=True, max_retries=2)
def retrain_models_task(self) -> dict:
    """
    Full batch retraining of duration and delay models.
    Runs in a Celery worker — safe for long execution times.
    """
    try:
        import pandas as pd
        from app.ml.trainer import train_duration_model, train_delay_model
        from app.ml.synthetic_data import generate_synthetic_data

        logger.info("Starting batch model retraining...")

        # In production, this would query the DB for real completed tasks.
        # For now, use synthetic data as fallback.
        df = generate_synthetic_data(500)

        duration_metrics = train_duration_model(df)
        delay_metrics = train_delay_model(df)

        result = {
            "status": "complete",
            "duration_model": duration_metrics,
            "delay_model": delay_metrics,
        }
        logger.info("Batch retraining complete", extra=result)
        return result

    except Exception as exc:
        logger.error(f"Retraining failed: {exc}")
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(name="app.workers.ml_tasks.predict_pipeline_task")
def predict_pipeline_task(task_data: dict, workload: float) -> dict:
    """
    Run the full ML prediction pipeline for a single task.
    Used for async predictions when low latency is not required.
    """
    from datetime import datetime, timezone
    from app.ml.predictor import predict_duration, predict_delay_prob, compute_priority
    from app.ml.pert import pert_estimate
    from app.ml.explainer import explain_delay_prediction

    deadline_str = task_data.get("deadline")
    if deadline_str:
        deadline = datetime.fromisoformat(deadline_str)
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
    else:
        deadline = datetime.now(timezone.utc)

    days_to_deadline = max((deadline - datetime.now(timezone.utc)).days, 0)

    features = {
        "complexity": task_data.get("complexity", 1.0),
        "effort_hours": task_data.get("effort_hours", 8.0),
        "completion_rate": task_data.get("completion_rate", 0.8),
        "days_to_deadline": days_to_deadline,
        "workload_at_assignment": workload,
        "priority_score": 0.5,
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


@celery_app.task(name="app.workers.ml_tasks.explain_task")
def explain_task(features: dict) -> dict:
    """
    SHAP explanation for a single task — offloaded because TreeExplainer is CPU-heavy.
    """
    from app.ml.explainer import explain_delay_prediction
    return explain_delay_prediction(features)
