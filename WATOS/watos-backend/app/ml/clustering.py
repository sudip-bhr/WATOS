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
