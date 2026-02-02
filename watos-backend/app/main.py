# WATOS Main Application Entrypoint
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.api.v1 import (
    auth, tasks, users, workload, ml, notifications, reports, analytics,
    projects, subtasks, collaboration, org, complexity, webhooks, leveling,
    intelligence
)
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.middleware import AuditLogMiddleware

# Initialize structured logging
setup_logging()
logger = get_logger("main")



app = FastAPI(
    title="WATOS API",
    version="3.0.0",
    description="Workload Analysis & Task Optimization System — Multi-Tenant SaaS",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware (order matters: outermost first)
app.add_middleware(AuditLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router,          prefix="/api/v1/auth",          tags=["Auth"])
app.include_router(tasks.router,         prefix="/api/v1/tasks",         tags=["Tasks"])
app.include_router(users.router,         prefix="/api/v1/users",         tags=["Users"])
app.include_router(workload.router,      prefix="/api/v1/workload",      tags=["Workload"])
app.include_router(ml.router,            prefix="/api/v1/ml",            tags=["ML"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(reports.router,       prefix="/api/v1/reports",       tags=["Reports"])
app.include_router(analytics.router,     prefix="/api/v1/analytics",     tags=["Analytics"])
app.include_router(projects.router,      prefix="/api/v1/projects",      tags=["Projects"])
app.include_router(subtasks.router,      prefix="/api/v1/tasks",         tags=["Subtasks"])
app.include_router(collaboration.router, prefix="/api/v1/tasks",         tags=["Collaboration"])
app.include_router(org.router,           prefix="/api/v1/org",           tags=["Org"])
app.include_router(complexity.router,    prefix="/api/v1/complexity",    tags=["Complexity"])
app.include_router(webhooks.router,      prefix="/api/v1/webhooks",      tags=["Webhooks"])
app.include_router(leveling.router,      prefix="/api/v1/leveling",      tags=["Resource Leveling"])
app.include_router(intelligence.router,  prefix="/api/v1/intelligence",  tags=["Intelligence"])


@app.on_event("startup")
async def startup_event():
    """Initialize DB tables, bootstrap ML models, and start Redis Pub/Sub."""
    from app.db.session import engine, Base
    # Import all models so they register with Base
    from app.models import (  # noqa
        user, project, task, task_history,
        ml_model_version, audit_log, notification, organization, subtask,
        comment, attachment, task_watcher, ml_config,
        complexity_anchor, webhook, rebalance_proposal
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Bootstrap ML models if not present
    import os
    models_dir = os.path.join(os.path.dirname(__file__), "ml", "models")
    if not os.path.exists(os.path.join(models_dir, "duration_model_active.joblib")):
        logger.info("Bootstrapping ML models from synthetic data...")
        from app.ml.synthetic_data import generate_synthetic_data
        from app.ml.trainer import train_duration_model, train_delay_model
        df = generate_synthetic_data(500)
        train_duration_model(df)
        train_delay_model(df)
        logger.info("ML models trained and saved.")

    # Start Redis Pub/Sub listener for WebSocket scaling
    try:
        from app.services.pubsub_manager import manager
        await manager.start_listener()
        logger.info("Redis Pub/Sub listener started for WebSocket scaling.")
    except Exception as e:
        logger.warning(f"Redis Pub/Sub unavailable (WebSockets will use local-only mode): {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully stop Redis Pub/Sub and close connection pool."""
    try:
        from app.services.pubsub_manager import manager
        await manager.stop_listener()
    except Exception:
        pass
    try:
        from app.core.redis import close_redis
        await close_redis()
    except Exception:
        pass
    logger.info("WATOS shutdown complete.")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.0.0"}
