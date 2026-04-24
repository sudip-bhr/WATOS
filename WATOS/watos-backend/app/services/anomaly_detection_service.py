"""
Anomaly Detection Service.
Identifies operators who are consistently over/under-performing relative
to organizational baselines using statistical process control (Z-scores)
and trend analysis.

Detection dimensions:
  1. Completion Rate: Tasks completed on time vs delayed
  2. Throughput: Tasks completed per week vs org average
  3. Quality: Tasks rejected/returned vs org average
  4. Effort Accuracy: Actual hours vs predicted hours deviation
"""
import numpy as np
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_

from app.models.task import Task
from app.models.task_history import TaskHistory
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger("anomaly_detection")

# Z-score thresholds
Z_WARNING = 1.5   # Notable deviation
Z_CRITICAL = 2.0  # Significant anomaly


async def detect_anomalies(
    org_id: str,
    db: AsyncSession,
    lookback_days: int = 30,
) -> dict:
    """
    Run anomaly detection across all operators in an organization.

    Returns:
        {
            "summary": {...},
            "anomalies": [...],  # Flagged operators with details
            "baselines": {...},  # Org-wide averages
        }
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    # Load all active users in the org
    users_result = await db.execute(
        select(User).where(
            User.organization_id == org_id,
            User.is_active == True,
            User.is_deleted == False,
            User.role.in_(["member", "operator"]),
        )
    )
    users = users_result.scalars().all()

    if len(users) < 3:
        return {
            "summary": {"total_users": len(users), "anomalies_found": 0},
            "anomalies": [],
            "baselines": {},
            "message": "Need at least 3 active users for anomaly detection.",
        }

    # Compute per-user metrics
    user_metrics = []
    for user in users:
        metrics = await _compute_user_metrics(user, cutoff, db)
        if metrics["total_tasks"] > 0:  # Only include users with activity
            user_metrics.append(metrics)

    if len(user_metrics) < 3:
        return {
            "summary": {"total_users": len(users), "anomalies_found": 0},
            "anomalies": [],
            "baselines": {},
            "message": "Not enough completed task data for meaningful analysis.",
        }

    # Compute org baselines
    baselines = _compute_baselines(user_metrics)

    # Detect anomalies via Z-scores
    anomalies = []
    for metrics in user_metrics:
        user_anomalies = _detect_user_anomalies(metrics, baselines)
        if user_anomalies:
            anomalies.append({
                "user_id": metrics["user_id"],
                "full_name": metrics["full_name"],
                "flags": user_anomalies,
                "overall_severity": max(a["severity"] for a in user_anomalies),
                "total_tasks": metrics["total_tasks"],
            })

    # Sort by severity
    anomalies.sort(key=lambda x: x["overall_severity"], reverse=True)

    logger.info(
        f"Anomaly detection complete for org {org_id}",
        extra={
            "users_analyzed": len(user_metrics),
            "anomalies_found": len(anomalies),
        },
    )

    return {
        "summary": {
            "total_users": len(users),
            "users_analyzed": len(user_metrics),
            "anomalies_found": len(anomalies),
            "lookback_days": lookback_days,
            "cutoff_date": cutoff.isoformat(),
        },
        "anomalies": anomalies,
        "baselines": baselines,
        "user_metrics": [
            {
                "user_id": m["user_id"],
                "full_name": m["full_name"],
                "total_tasks": m["total_tasks"],
                "on_time_rate": m["on_time_rate"],
                "throughput_weekly": m["throughput_weekly"],
                "rejection_rate": m["rejection_rate"],
                "effort_deviation": m["effort_deviation"],
            }
            for m in user_metrics
        ],
    }


async def _compute_user_metrics(user: User, cutoff: datetime, db: AsyncSession) -> dict:
    """Compute performance metrics for a single user within the lookback period."""
    uid = user.id

    # Completed tasks in lookback period
    completed_result = await db.execute(
        select(Task).where(
            Task.assignee_id == uid,
            Task.status == "done",
            Task.is_deleted == False,
            Task.completed_at >= cutoff,
        )
    )
    completed_tasks = completed_result.scalars().all()

    # Rejected tasks
    rejected_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.assignee_id == uid,
            Task.status == "rejected",
            Task.is_deleted == False,
            Task.updated_at >= cutoff,
        )
    )
    rejected_count = rejected_result.scalar() or 0

    total_completed = len(completed_tasks)
    total_tasks = total_completed + rejected_count

    # On-time rate
    on_time = sum(
        1 for t in completed_tasks
        if t.deadline and t.completed_at and t.completed_at <= t.deadline
    )
    tasks_with_deadline = sum(1 for t in completed_tasks if t.deadline)
    on_time_rate = (on_time / tasks_with_deadline) if tasks_with_deadline > 0 else 1.0

    # Throughput (tasks per week)
    weeks = max((datetime.now(timezone.utc) - cutoff).days / 7, 1)
    throughput_weekly = total_completed / weeks

    # Rejection rate
    rejection_rate = (rejected_count / total_tasks) if total_tasks > 0 else 0.0

    # Effort accuracy (actual vs predicted deviation)
    effort_deviations = []
    for t in completed_tasks:
        if t.predicted_hours and t.actual_hours and t.predicted_hours > 0:
            deviation = abs(t.actual_hours - t.predicted_hours) / t.predicted_hours
            effort_deviations.append(deviation)

    avg_effort_deviation = float(np.mean(effort_deviations)) if effort_deviations else 0.0

    return {
        "user_id": str(uid),
        "full_name": user.full_name or user.email,
        "total_tasks": total_tasks,
        "total_completed": total_completed,
        "on_time_rate": round(on_time_rate, 3),
        "throughput_weekly": round(throughput_weekly, 2),
        "rejection_rate": round(rejection_rate, 3),
        "effort_deviation": round(avg_effort_deviation, 3),
    }


def _compute_baselines(user_metrics: list) -> dict:
    """Compute org-wide baselines from all user metrics."""
    on_time_rates = [m["on_time_rate"] for m in user_metrics]
    throughputs = [m["throughput_weekly"] for m in user_metrics]
    rejection_rates = [m["rejection_rate"] for m in user_metrics]
    effort_devs = [m["effort_deviation"] for m in user_metrics]

    return {
        "on_time_rate": {
            "mean": round(float(np.mean(on_time_rates)), 3),
            "std": round(float(np.std(on_time_rates)), 3),
        },
        "throughput_weekly": {
            "mean": round(float(np.mean(throughputs)), 2),
            "std": round(float(np.std(throughputs)), 2),
        },
        "rejection_rate": {
            "mean": round(float(np.mean(rejection_rates)), 3),
            "std": round(float(np.std(rejection_rates)), 3),
        },
        "effort_deviation": {
            "mean": round(float(np.mean(effort_devs)), 3),
            "std": round(float(np.std(effort_devs)), 3),
        },
    }


def _detect_user_anomalies(metrics: dict, baselines: dict) -> list:
    """Detect anomalies for a single user using Z-scores."""
    anomalies = []

    # 1. On-time rate (low is bad)
    _check_low_anomaly(
        anomalies, metrics, baselines,
        metric_key="on_time_rate",
        label="Completion Rate",
        description_low="significantly lower on-time completion rate than team average",
    )

    # 2. Throughput (both extremes are interesting)
    _check_both_anomaly(
        anomalies, metrics, baselines,
        metric_key="throughput_weekly",
        label="Throughput",
        desc_low="completing significantly fewer tasks than team average",
        desc_high="completing significantly more tasks than team average (verify quality)",
    )

    # 3. Rejection rate (high is bad)
    _check_high_anomaly(
        anomalies, metrics, baselines,
        metric_key="rejection_rate",
        label="Rejection Rate",
        description_high="significantly higher task rejection rate than team average",
    )

    # 4. Effort deviation (high is bad — consistently inaccurate estimates)
    _check_high_anomaly(
        anomalies, metrics, baselines,
        metric_key="effort_deviation",
        label="Effort Accuracy",
        description_high="actual effort consistently deviates from predictions (estimation issues)",
    )

    return anomalies


def _z_score(value: float, mean: float, std: float) -> float:
    """Compute Z-score, handling zero std."""
    if std < 0.001:
        return 0.0
    return (value - mean) / std


def _check_low_anomaly(anomalies, metrics, baselines, metric_key, label, description_low):
    """Flag if metric is significantly BELOW average."""
    z = _z_score(
        metrics[metric_key],
        baselines[metric_key]["mean"],
        baselines[metric_key]["std"],
    )
    if z < -Z_WARNING:
        severity = "critical" if z < -Z_CRITICAL else "warning"
        anomalies.append({
            "metric": label,
            "type": "under_performing",
            "severity": severity,
            "value": metrics[metric_key],
            "org_mean": baselines[metric_key]["mean"],
            "z_score": round(z, 2),
            "description": f"{metrics['full_name']}: {description_low} "
                          f"({metrics[metric_key]:.1%} vs {baselines[metric_key]['mean']:.1%} avg)",
        })


def _check_high_anomaly(anomalies, metrics, baselines, metric_key, label, description_high):
    """Flag if metric is significantly ABOVE average."""
    z = _z_score(
        metrics[metric_key],
        baselines[metric_key]["mean"],
        baselines[metric_key]["std"],
    )
    if z > Z_WARNING:
        severity = "critical" if z > Z_CRITICAL else "warning"
        anomalies.append({
            "metric": label,
            "type": "over_performing" if "quality" in label.lower() else "anomaly",
            "severity": severity,
            "value": metrics[metric_key],
            "org_mean": baselines[metric_key]["mean"],
            "z_score": round(z, 2),
            "description": f"{metrics['full_name']}: {description_high}",
        })


def _check_both_anomaly(anomalies, metrics, baselines, metric_key, label, desc_low, desc_high):
    """Flag if metric deviates in either direction."""
    z = _z_score(
        metrics[metric_key],
        baselines[metric_key]["mean"],
        baselines[metric_key]["std"],
    )
    if z < -Z_WARNING:
        severity = "critical" if z < -Z_CRITICAL else "warning"
        anomalies.append({
            "metric": label,
            "type": "under_performing",
            "severity": severity,
            "value": metrics[metric_key],
            "org_mean": baselines[metric_key]["mean"],
            "z_score": round(z, 2),
            "description": f"{metrics['full_name']}: {desc_low} "
                          f"({metrics[metric_key]:.1f}/wk vs {baselines[metric_key]['mean']:.1f}/wk avg)",
        })
    elif z > Z_WARNING:
        severity = "info"  # Over-performing is informational
        anomalies.append({
            "metric": label,
            "type": "over_performing",
            "severity": severity,
            "value": metrics[metric_key],
            "org_mean": baselines[metric_key]["mean"],
            "z_score": round(z, 2),
            "description": f"{metrics['full_name']}: {desc_high} "
                          f"({metrics[metric_key]:.1f}/wk vs {baselines[metric_key]['mean']:.1f}/wk avg)",
        })
