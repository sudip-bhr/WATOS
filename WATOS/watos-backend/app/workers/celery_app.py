"""
Celery application for WATOS background workers.
Offloads heavy ML inference, SHAP explanations, and batch retraining
from the FastAPI event loop to dedicated worker processes.

Run with: celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "watos",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,                # Re-deliver if worker crashes mid-task
    worker_prefetch_multiplier=1,       # Fair scheduling for long-running tasks
    result_expires=3600,                # Results expire after 1 hour
    broker_connection_retry_on_startup=True,
)

celery_app.conf.task_routes = {
    "app.workers.ml_tasks.retrain_models_task": {"queue": "ml"},
    "app.workers.ml_tasks.predict_pipeline_task": {"queue": "ml"},
    "app.workers.ml_tasks.explain_task": {"queue": "ml"},
    "app.workers.tasks.retrain_models": {"queue": "ml"},
    "app.workers.tasks.send_notification_email": {"queue": "email"},
}

# Auto-discover tasks in app/workers/
celery_app.autodiscover_tasks(["app.workers"])
