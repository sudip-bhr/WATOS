import os
import joblib
import numpy as np
from sklearn.linear_model import SGDRegressor
from sklearn.preprocessing import StandardScaler

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DURATION_FEATURES = [
    "complexity", "effort_hours", "completion_rate",
    "days_to_deadline", "workload_at_assignment",
]


def partial_fit_duration(new_sample: dict):
    """Incrementally update the online duration model on one completed task."""
    online_path = os.path.join(MODELS_DIR, "duration_online.joblib")
    scaler_path = os.path.join(MODELS_DIR, "duration_scaler.joblib")

    try:
        online_model = joblib.load(online_path)
        scaler = joblib.load(scaler_path)
    except FileNotFoundError:
        online_model = SGDRegressor(learning_rate="adaptive", eta0=0.01, random_state=42)
        scaler = StandardScaler()

    X = np.array([[new_sample.get(f, 0) for f in DURATION_FEATURES]])
    y = np.array([new_sample.get("actual_hours", 8.0)])
    
    X_scaled = scaler.partial_fit(X).transform(X)
    online_model.partial_fit(X_scaled, y)

    joblib.dump(online_model, online_path)
    joblib.dump(scaler, scaler_path)
