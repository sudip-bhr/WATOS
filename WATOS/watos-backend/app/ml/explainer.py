"""
SHAP Explainer — model interpretability for delay predictions.
Uses ModelStore abstraction for loading models.
"""
import pandas as pd
import numpy as np
import shap
from app.ml.model_store import get_model_store

DELAY_FEATURES = [
    "complexity", "days_to_deadline", "workload_at_assignment",
    "priority_score", "effort_hours",
]


def explain_delay_prediction(features: dict) -> dict:
    """
    Returns SHAP feature contributions for a single task.
    """
    store = get_model_store()
    if not store.exists("delay_model_active.joblib"):
        return {
            "base_value": 0.3,
            "contributions": {f: 0.0 for f in DELAY_FEATURES},
            "human_readable": "SHAP explanation unavailable (model not trained yet)",
        }

    try:
        pipeline = store.load("delay_model_active.joblib")
        model = pipeline.named_steps["model"]
        scaler = pipeline.named_steps["scaler"]

        X_raw = pd.DataFrame([{k: features.get(k, 0) for k in DELAY_FEATURES}])
        X_scaled = scaler.transform(X_raw)

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_scaled)

        contributions = {
            feat: float(shap_values[0][i])
            for i, feat in enumerate(DELAY_FEATURES)
        }

        sorted_contribs = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)
        top_reasons = [
            f"{feat.replace('_', ' ')} ({'increases' if val > 0 else 'reduces'} risk by {abs(val)*100:.0f}%)"
            for feat, val in sorted_contribs[:3]
        ]
        human_readable = "Delay risk driven by: " + ", ".join(top_reasons)

        return {
            "base_value": float(explainer.expected_value),
            "contributions": contributions,
            "human_readable": human_readable,
        }
    except Exception as e:
        return {
            "base_value": 0.3,
            "contributions": {f: 0.0 for f in DELAY_FEATURES},
            "human_readable": f"SHAP explanation error: {str(e)}",
        }
