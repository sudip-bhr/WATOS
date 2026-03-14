"""
Hyperparameter Tuner.
Addresses the "Manual Feature Selection" limitation by providing
automated hyperparameter optimization using HalvingGridSearchCV.
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor, HistGradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, roc_auc_score
from app.core.logging import get_logger

logger = get_logger("tuner")

# Parameter grids for tuning
DURATION_PARAM_GRID = {
    "model__max_iter": [100, 200, 400],
    "model__max_depth": [3, 4, 6],
    "model__learning_rate": [0.01, 0.05, 0.1],
    "model__min_samples_leaf": [10, 20, 40],
}

DELAY_PARAM_GRID = {
    "model__max_iter": [100, 200, 400],
    "model__max_depth": [2, 3, 5],
    "model__learning_rate": [0.01, 0.05, 0.1],
    "model__min_samples_leaf": [10, 20, 40],
}


def tune_duration_model(
    df: pd.DataFrame,
    features: list,
    cv: int = 3,
) -> dict:
    """
    Tune the duration regression model using HalvingGridSearchCV.
    Returns best model, params, and metrics.
    """
    from sklearn.experimental import enable_halving_search_cv  # noqa
    from sklearn.model_selection import HalvingGridSearchCV

    X = df[features]
    y = df["actual_hours"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", HistGradientBoostingRegressor(random_state=42)),
    ])

    logger.info("Starting duration model hyperparameter tuning...")
    search = HalvingGridSearchCV(
        pipeline,
        DURATION_PARAM_GRID,
        cv=cv,
        scoring="neg_mean_absolute_error",
        random_state=42,
        n_jobs=-1,
        verbose=0,
    )
    search.fit(X_train, y_train)

    best_model = search.best_estimator_
    y_pred = best_model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"Tuning complete: MAE={mae:.4f}, R²={r2:.4f}", extra={"best_params": search.best_params_})

    return {
        "model": best_model,
        "best_params": search.best_params_,
        "metrics": {"mae": round(mae, 4), "r2": round(r2, 4)},
        "features_used": features,
    }


def tune_delay_model(
    df: pd.DataFrame,
    features: list,
    cv: int = 3,
) -> dict:
    """
    Tune the delay classification model using HalvingGridSearchCV.
    Returns best model, params, and metrics.
    """
    from sklearn.experimental import enable_halving_search_cv  # noqa
    from sklearn.model_selection import HalvingGridSearchCV

    X = df[features]
    y = df["was_delayed"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", HistGradientBoostingClassifier(random_state=42)),
    ])

    logger.info("Starting delay model hyperparameter tuning...")
    search = HalvingGridSearchCV(
        pipeline,
        DELAY_PARAM_GRID,
        cv=cv,
        scoring="roc_auc",
        random_state=42,
        n_jobs=-1,
        verbose=0,
    )
    search.fit(X_train, y_train)

    best_model = search.best_estimator_

    if len(np.unique(y_test)) > 1:
        auc = roc_auc_score(y_test, best_model.predict_proba(X_test)[:, 1])
    else:
        auc = 0.5

    logger.info(f"Tuning complete: AUC={auc:.4f}", extra={"best_params": search.best_params_})

    return {
        "model": best_model,
        "best_params": search.best_params_,
        "metrics": {"roc_auc": round(auc, 4)},
        "features_used": features,
    }
