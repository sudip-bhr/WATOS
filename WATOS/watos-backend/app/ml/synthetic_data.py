import pandas as pd
import numpy as np


def generate_synthetic_data(n: int = 500) -> pd.DataFrame:
    np.random.seed(42)
    complexity = np.random.uniform(1, 5, n)
    effort_hours = complexity * np.random.uniform(2, 8, n)
    completion_rate = np.random.beta(7, 3, n)
    days_to_deadline = np.random.randint(1, 30, n)
    workload_at_assignment = np.random.uniform(0.2, 1.4, n)

    actual_hours = effort_hours * (1 + 0.2 * (complexity - 3)) + np.random.normal(0, 2, n)
    actual_hours = np.clip(actual_hours, 1, 200)

    delay_logit = (
        -0.5
        + 0.1 * complexity
        + 0.5 * workload_at_assignment
        + -0.05 * days_to_deadline
        + np.random.normal(0, 0.5, n)
    )
    was_delayed = (1 / (1 + np.exp(-delay_logit)) > 0.5).astype(int)

    # Inject 5% extreme outliers for DBSCAN testing
    num_outliers = int(n * 0.05)
    outlier_indices = np.random.choice(n, num_outliers, replace=False)
    complexity[outlier_indices] = np.random.uniform(4.5, 5.0, num_outliers)
    effort_hours[outlier_indices] = np.random.uniform(100, 200, num_outliers)
    was_delayed[outlier_indices] = 1

    return pd.DataFrame({
        "complexity": complexity,
        "effort_hours": effort_hours,
        "completion_rate": completion_rate,
        "days_to_deadline": days_to_deadline,
        "workload_at_assignment": workload_at_assignment,
        "actual_hours": actual_hours,
        "priority_score": np.random.uniform(0, 1, n),
        "was_delayed": was_delayed,
    })
