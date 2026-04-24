"""
Automated Feature Selection.
Addresses the "Manual Feature Selection" limitation by using mutual information
to rank and select features dynamically based on actual training data.
"""
import pandas as pd
import numpy as np
from sklearn.feature_selection import mutual_info_regression, mutual_info_classif
from app.core.logging import get_logger

logger = get_logger("auto_feature")

# All candidate features that could be used for prediction
ALL_CANDIDATE_FEATURES = [
    "complexity", "effort_hours", "completion_rate",
    "days_to_deadline", "workload_at_assignment",
    "priority_score", "num_subtasks", "num_dependencies",
    "assignee_task_count", "project_task_count",
]

# Minimum features to always include (domain knowledge)
MANDATORY_FEATURES = ["complexity", "effort_hours"]


def select_features(
    df: pd.DataFrame,
    target_col: str,
    task: str = "regression",
    threshold: float = 0.02,
    max_features: int = 8,
) -> dict:
    """
    Auto-select features using mutual information scoring.

    Args:
        df: Training dataframe
        target_col: Target variable column name
        task: "regression" or "classification"
        threshold: Minimum MI score to include a feature
        max_features: Maximum number of features to select

    Returns:
        {
            "selected_features": [...],
            "feature_scores": [(name, score), ...],
            "dropped_features": [...],
        }
    """
    # Only use columns that exist in the dataframe and are numeric
    candidate_cols = [
        c for c in ALL_CANDIDATE_FEATURES
        if c in df.columns and c != target_col and df[c].dtype in ("float64", "int64", "float32", "int32")
    ]

    if not candidate_cols:
        logger.warning("No candidate features found in dataframe")
        return {
            "selected_features": MANDATORY_FEATURES,
            "feature_scores": [],
            "dropped_features": [],
        }

    X = df[candidate_cols].fillna(0)
    y = df[target_col]

    # Choose MI function based on task type
    mi_func = mutual_info_regression if task == "regression" else mutual_info_classif
    scores = mi_func(X, y, random_state=42)

    feature_scores = sorted(
        zip(candidate_cols, scores),
        key=lambda x: x[1],
        reverse=True,
    )

    # Select features above threshold, up to max_features
    selected = [f for f, s in feature_scores if s > threshold][:max_features]

    # Ensure mandatory features are always included
    for mf in MANDATORY_FEATURES:
        if mf in candidate_cols and mf not in selected:
            selected.append(mf)

    dropped = [f for f, s in feature_scores if f not in selected]

    logger.info(
        f"Feature selection complete: {len(selected)} selected, {len(dropped)} dropped",
        extra={
            "selected": selected,
            "scores": {f: round(s, 4) for f, s in feature_scores},
        },
    )

    return {
        "selected_features": selected,
        "feature_scores": [(f, round(s, 4)) for f, s in feature_scores],
        "dropped_features": dropped,
    }
