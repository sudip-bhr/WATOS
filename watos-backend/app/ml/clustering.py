import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler

CLUSTER_FEATURES = ["complexity", "effort_hours", "priority_score"]


def find_optimal_k(df: pd.DataFrame, k_max: int = 10) -> int:
    X = df[CLUSTER_FEATURES].fillna(0)
    if len(X) < 4:
        return 2
    inertias = []
    k_range = range(2, min(k_max + 1, len(X)))
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init="auto")
        km.fit(X)
        inertias.append(km.inertia_)

    if len(inertias) < 2:
        return 2
    deltas = np.diff(inertias)
    ratios = deltas[1:] / (deltas[:-1] + 1e-9)
    optimal_k = int(np.argmax(ratios) + 3)
    return min(max(optimal_k, 2), k_max)


def cluster_tasks(df: pd.DataFrame) -> list:
    if len(df) < 4:
        return [0] * len(df)
    
    X = df[CLUSTER_FEATURES].fillna(0)
    X_scaled = StandardScaler().fit_transform(X)

    # Attempt DBSCAN first for density-based clustering (great for finding outliers)
    db = DBSCAN(eps=0.5, min_samples=3)
    labels = db.fit_predict(X_scaled)

    # If DBSCAN put everything in one cluster (or noise), fallback to K-Means
    if len(set(labels)) <= 1:
        k = find_optimal_k(df)
        km = KMeans(n_clusters=k, random_state=42, n_init="auto")
        labels = km.fit_predict(X_scaled)
        
    return labels.tolist()


async def run_clustering_async(db) -> None:
    """
    Fetch all active tasks, cluster them using ML features,
    and persist cluster_id values back to the DB asynchronously.
    """
    # Import related models to ensure SQLAlchemy's foreign keys are resolved
    from app.models.user import User
    from app.models.project import Project
    from app.models.organization import Organization
    from sqlalchemy import select
    from app.models.task import Task
    
    try:
        # Fetch active tasks
        stmt = select(Task).where(Task.is_deleted == False)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        if not tasks or len(tasks) < 4:
            print(f"Skipping task clustering: only {len(tasks)} valid tasks exist (minimum 4 required).")
            return
        
        # Build DataFrame with features
        task_data = []
        for t in tasks:
            task_data.append({
                "id": t.id,
                "complexity": t.complexity if t.complexity is not None else 1.0,
                "effort_hours": t.effort_hours if t.effort_hours is not None else 0.0,
                "priority_score": t.priority_score if t.priority_score is not None else 1.0
            })
            
        df = pd.DataFrame(task_data)
        
        # Compute cluster labels
        labels = cluster_tasks(df)
        
        # Assign cluster labels to database objects
        for t, label in zip(tasks, labels):
            t.cluster_id = label
            
        await db.commit()
        print(f"Successfully clustered and persisted {len(tasks)} tasks async.")
    except Exception as e:
        print(f"Error in run_clustering_async: {e}")
        await db.rollback()

