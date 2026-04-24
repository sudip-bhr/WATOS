"""
ML Model Trainer.
Uses ModelStore abstraction for saving — works with both local filesystem and S3.
"""
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, HistGradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, roc_auc_score
from app.ml.model_store import get_model_store

DURATION_FEATURES = [
    "complexity", "effort_hours", "completion_rate",
    "days_to_deadline", "workload_at_assignment",
]

DELAY_FEATURES = [
    "complexity", "days_to_deadline", "workload_at_assignment",
    "priority_score", "effort_hours",
]


def train_duration_model(df: pd.DataFrame, version: int = 1) -> dict:
    X = df[DURATION_FEATURES]
    y = df["actual_hours"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", HistGradientBoostingRegressor(
            max_iter=200, max_depth=4, learning_rate=0.05, random_state=42
        )),
    ])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    store = get_model_store()
    versioned_path = store.save(pipeline, f"duration_model_v{version}.joblib")
    active_path = store.save(pipeline, "duration_model_active.joblib")

    return {"mae": round(mae, 4), "r2": round(r2, 4), "path": versioned_path}


def train_delay_model(df: pd.DataFrame, version: int = 1) -> dict:
    X = df[DELAY_FEATURES]
    y = df["was_delayed"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", HistGradientBoostingClassifier(
            max_iter=200, max_depth=3, learning_rate=0.05, random_state=42
        )),
    ])
    pipeline.fit(X_train, y_train)
    
    # Check if both classes are present in y_test
    import numpy as np
    if len(np.unique(y_test)) > 1:
        auc = roc_auc_score(y_test, pipeline.predict_proba(X_test)[:, 1])
    else:
        auc = 0.5  # Neutral fallback

    store = get_model_store()
    versioned_path = store.save(pipeline, f"delay_model_v{version}.joblib")
    active_path = store.save(pipeline, "delay_model_active.joblib")

    return {"roc_auc": round(auc, 4), "path": versioned_path}
