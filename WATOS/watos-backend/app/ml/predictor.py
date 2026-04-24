"""
ML Predictor — loads models via ModelStore abstraction.
Supports local filesystem and S3/MinIO backends transparently.
"""
import pandas as pd
import numpy as np
from app.ml.model_store import get_model_store

DURATION_FEATURES = [
    "complexity", "effort_hours", "completion_rate",
    "days_to_deadline", "workload_at_assignment",
]
DELAY_FEATURES = [
    "complexity", "days_to_deadline", "workload_at_assignment",
    "priority_score", "effort_hours",
]

_duration_model = None
_delay_model = None


def _load_models():
    global _duration_model, _delay_model
    store = get_model_store()

    if store.exists("duration_model_active.joblib"):
        _duration_model = store.load("duration_model_active.joblib")
    if store.exists("delay_model_active.joblib"):
        _delay_model = store.load("delay_model_active.joblib")


def _ensure_models():
    global _duration_model, _delay_model
    if _duration_model is None or _delay_model is None:
        _load_models()
    if _duration_model is None or _delay_model is None:
        # Bootstrap from synthetic data
        from app.ml.synthetic_data import generate_synthetic_data
        from app.ml.trainer import train_duration_model, train_delay_model
        df = generate_synthetic_data(500)
        train_duration_model(df)
        train_delay_model(df)
        _load_models()


def reload_models():
    """Force-reload models from storage (called after retraining)."""
    global _duration_model, _delay_model
    _duration_model = None
    _delay_model = None
    _load_models()


def predict_duration(features: dict) -> float:
    _ensure_models()
    X = pd.DataFrame([{k: features.get(k, 0) for k in DURATION_FEATURES}])
    return float(round(_duration_model.predict(X)[0], 2))


def predict_delay_prob(features: dict) -> float:
    _ensure_models()
    X = pd.DataFrame([{k: features.get(k, 0) for k in DELAY_FEATURES}])
    prob = _delay_model.predict_proba(X)[0][1]
    return float(round(prob, 4))


def compute_priority(deadline, delay_prob: float, complexity: float,
                     alpha: float = 0.5, beta: float = 0.3, gamma: float = 0.2) -> float:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if deadline.tzinfo is None:
        from datetime import timezone as tz
        deadline = deadline.replace(tzinfo=tz.utc)
    days_left = max((deadline - now).days, 0)
    urgency = 1 / (1 + days_left)
    score = alpha * urgency + beta * delay_prob + gamma * (complexity / 5)
    return round(min(score, 1.0), 4)
