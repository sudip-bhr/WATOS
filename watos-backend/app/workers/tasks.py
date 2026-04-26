from app.workers.celery_app import celery_app
from app.ml.trainer import train_duration_model, train_delay_model
from app.ml.synthetic_data import generate_synthetic_data


def fetch_real_training_data():
    """
    Pull real task_history data for retraining.
    Uses synchronous DB access (Celery runs outside async context).
    """
    try:
        from sqlalchemy import create_engine, text
        from app.core.config import settings
        import pandas as pd
        # Convert async URL to sync
        sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        engine = create_engine(sync_url)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT complexity, effort_hours, completion_rate,
                       days_to_deadline, workload_at_assignment,
                       actual_hours, priority_score, was_delayed::int as was_delayed
                FROM task_history
                WHERE actual_hours IS NOT NULL
            """))
            rows = result.fetchall()
            if rows:
                return pd.DataFrame(rows, columns=result.keys())
    except Exception as e:
        print(f"Error fetching training data: {e}")
    return None


def save_model_version_sync(model_type: str, metrics: dict, user_id: str = None):
    """Save model version record to DB synchronously."""
    try:
        from sqlalchemy import create_engine, text
        from app.core.config import settings
        import uuid
        sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        engine = create_engine(sync_url)
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO ml_model_versions (id, model_type, version, accuracy_score, file_path, is_active, trained_by)
                SELECT gen_random_uuid(), :model_type,
                       COALESCE(MAX(version), 0) + 1,
                       :accuracy, :path, FALSE, :user_id
                FROM ml_model_versions WHERE model_type = :model_type
            """), {
                "model_type": model_type,
                "accuracy": metrics.get("r2") or metrics.get("roc_auc") or 0.0,
                "path": metrics.get("path", ""),
                "user_id": user_id,
            })
            conn.commit()
    except Exception as e:
        print(f"Error saving model version: {e}")


@celery_app.task(name="app.workers.tasks.retrain_models")
def retrain_models(triggered_by_user_id: str = None):
    """Full model retraining — queued via /ml/retrain endpoint."""
    df = fetch_real_training_data()
    if df is None or len(df) < 50:
        df = generate_synthetic_data(500)

    duration_metrics = train_duration_model(df)
    delay_metrics = train_delay_model(df)

    save_model_version_sync("duration", duration_metrics, triggered_by_user_id)
    save_model_version_sync("delay", delay_metrics, triggered_by_user_id)

    # Promote to active if it's the latest version
    promote_latest_versions_sync()

    return {
        "status": "done",
        "duration": duration_metrics,
        "delay": delay_metrics,
    }


def promote_latest_versions_sync():
    """Mark the latest versions for each model type as active."""
    try:
        from sqlalchemy import create_engine, text
        from app.core.config import settings
        sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        engine = create_engine(sync_url)
        with engine.connect() as conn:
            # Deactivate current
            conn.execute(text("UPDATE ml_model_versions SET is_active = FALSE"))
            # Promote latest duration
            conn.execute(text("""
                UPDATE ml_model_versions 
                SET is_active = TRUE 
                WHERE id = (
                    SELECT id FROM ml_model_versions 
                    WHERE model_type = 'duration' 
                    ORDER BY version DESC LIMIT 1
                )
            """))
            # Promote latest delay
            conn.execute(text("""
                UPDATE ml_model_versions 
                SET is_active = TRUE 
                WHERE id = (
                    SELECT id FROM ml_model_versions 
                    WHERE model_type = 'delay' 
                    ORDER BY version DESC LIMIT 1
                )
            """))
            conn.commit()
    except Exception as e:
        print(f"Error promoting models: {e}")


@celery_app.task(name="app.workers.tasks.send_notification_email")
def send_notification_email(to_email: str, subject: str, body: str):
    """Send email via fastapi-mail (stub — configure SMTP in .env)."""
    print(f"[EMAIL] To: {to_email} | Subject: {subject}")
