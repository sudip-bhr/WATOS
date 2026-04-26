from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from app.db.session import get_db
from app.core.dependencies import require_role
from app.models.task import Task
from app.models.user import User
from app.models.ml_config import MLConfig
from app.models.ml_model_version import MLModelVersion
from app.schemas.ml import (
    PredictDurationRequest, PredictDurationResponse,
    PredictDelayRequest, PredictDelayResponse,
    ClusterResponse, ShapResponse,
    ModelVersionResponse, RetrainResponse,
)

router = APIRouter()

@router.get("/config")
async def get_ml_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    stmt = select(MLConfig).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        config = MLConfig()
        db.add(config)
        await db.commit()
        await db.refresh(config)
        
    return {
        "delay_prediction_enabled": config.delay_prediction_enabled,
        "shap_explanations_enabled": config.shap_explanations_enabled,
        "confidence_threshold": config.confidence_threshold,
        "auto_rebalance_enabled": config.auto_rebalance_enabled,
        "auto_assignment_enabled": config.auto_assignment_enabled,
        "retrain_interval_days": config.retrain_interval_days,
        "historical_data_weight": config.historical_data_weight
    }

@router.put("/config")
async def update_ml_config(
    settings: dict, 
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    stmt = select(MLConfig).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()
    
    if not config:
        config = MLConfig()
        db.add(config)
        
    if "delay_prediction_enabled" in settings:
        config.delay_prediction_enabled = settings["delay_prediction_enabled"]
    if "shap_explanations_enabled" in settings:
        config.shap_explanations_enabled = settings["shap_explanations_enabled"]
    if "confidence_threshold" in settings:
        config.confidence_threshold = settings["confidence_threshold"]
    if "auto_rebalance_enabled" in settings:
        config.auto_rebalance_enabled = settings["auto_rebalance_enabled"]
    if "auto_assignment_enabled" in settings:
        config.auto_assignment_enabled = settings["auto_assignment_enabled"]
    if "retrain_interval_days" in settings:
        config.retrain_interval_days = settings["retrain_interval_days"]
    if "historical_data_weight" in settings:
        config.historical_data_weight = settings["historical_data_weight"]
        
    await db.commit()
    await db.refresh(config)
    
    return {
        "delay_prediction_enabled": config.delay_prediction_enabled,
        "shap_explanations_enabled": config.shap_explanations_enabled,
        "confidence_threshold": config.confidence_threshold,
        "auto_rebalance_enabled": config.auto_rebalance_enabled,
        "auto_assignment_enabled": config.auto_assignment_enabled,
        "retrain_interval_days": config.retrain_interval_days,
        "historical_data_weight": config.historical_data_weight
    }

@router.post("/predict-duration", response_model=PredictDurationResponse)
async def predict_duration(
    payload: PredictDurationRequest,
    current_user=Depends(require_role("admin")),
):
    from app.ml.predictor import predict_duration as _predict
    hours = _predict(payload.model_dump())
    return PredictDurationResponse(predicted_hours=hours)


@router.post("/predict-delay", response_model=PredictDelayResponse)
async def predict_delay(
    payload: PredictDelayRequest,
    current_user=Depends(require_role("admin")),
):
    from app.ml.predictor import predict_delay_prob
    prob = predict_delay_prob(payload.model_dump())
    risk = "LOW" if prob < 0.4 else ("MEDIUM" if prob < 0.7 else "HIGH")
    return PredictDelayResponse(delay_prob=prob, risk_level=risk)


@router.get("/clusters", response_model=List[ClusterResponse])
async def get_clusters(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    result = await db.execute(select(Task).where(Task.cluster_id != None))
    tasks = result.scalars().all()
    return [
        ClusterResponse(
            task_id=t.id,
            cluster_id=t.cluster_id,
            complexity=t.complexity or 1.0,
            effort_hours=t.effort_hours or 0.0,
            priority_score=t.priority_score,
        )
        for t in tasks
    ]


@router.get("/shap/{task_id}", response_model=ShapResponse)
async def get_shap(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not task.shap_explanation:
        raise HTTPException(status_code=404, detail="SHAP explanation not yet computed")
    shap = task.shap_explanation
    return ShapResponse(
        task_id=task.id,
        base_value=shap.get("base_value", 0.0),
        contributions=shap.get("contributions", {}),
        human_readable=shap.get("human_readable", ""),
    )


@router.post("/retrain", response_model=RetrainResponse)
async def retrain_models(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        from app.workers.tasks import retrain_models as celery_retrain
        task = celery_retrain.delay(str(current_user.id))
        return RetrainResponse(status="queued", task_id=task.id)
    except Exception as e:
        # Fallback: run synchronously if Celery unavailable
        from app.ml.trainer import train_duration_model, train_delay_model
        from app.ml.synthetic_data import generate_synthetic_data
        df = generate_synthetic_data(500)
        train_duration_model(df)
        train_delay_model(df)
        return RetrainResponse(status="completed_sync", task_id="sync")


@router.get("/model-versions", response_model=List[ModelVersionResponse])
async def list_model_versions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    result = await db.execute(select(MLModelVersion).order_by(MLModelVersion.trained_at.desc()))
    return result.scalars().all()


@router.patch("/model-versions/{version_id}/activate", response_model=ModelVersionResponse)
async def activate_model_version(
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    result = await db.execute(select(MLModelVersion).where(MLModelVersion.id == version_id))
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Model version not found")

    # Deactivate all versions of same type
    all_versions = await db.execute(
        select(MLModelVersion).where(MLModelVersion.model_type == version.model_type)
    )
    for v in all_versions.scalars().all():
        v.is_active = False

    version.is_active = True
    await db.commit()
    await db.refresh(version)
    return version
