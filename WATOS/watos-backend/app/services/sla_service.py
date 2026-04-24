"""
SLA Escalation Service for WATOS v2.5.

Checks for tasks that have exceeded their SLA window and
auto-escalates them by incrementing escalation_level and
notifying the responsible parties.
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.task import Task
from app.services.notification_service import create_notification
from app.core.logging import get_logger

logger = get_logger("sla")


async def check_sla_breaches(db: AsyncSession) -> int:
    """
    Scan all active tasks with SLA configured.
    If a task has exceeded its SLA window, increment escalation_level
    and notify the assignee + creator.

    Returns the number of tasks escalated.
    """
    # Find tasks with SLA that are not yet done/approved and not deleted
    result = await db.execute(
        select(Task).where(
            and_(
                Task.sla_hours.isnot(None),
                Task.is_deleted == False,
                Task.status.notin_(["done", "approved", "rejected"]),
            )
        )
    )
    tasks = result.scalars().all()
    escalated = 0

    for task in tasks:
        if not task.created_at or not task.sla_hours:
            continue

        sla_deadline = task.created_at + timedelta(hours=task.sla_hours)
        now = datetime.now(timezone.utc)

        if now <= sla_deadline:
            continue  # Not breached yet

        # Calculate how many SLA windows have passed (for multi-level escalation)
        hours_overdue = (now - sla_deadline).total_seconds() / 3600
        expected_level = min(int(hours_overdue / task.sla_hours) + 1, 5)  # Cap at level 5

        if task.escalation_level >= expected_level:
            continue  # Already escalated to this level

        # Escalate
        old_level = task.escalation_level
        task.escalation_level = expected_level
        escalated += 1

        logger.info(
            f"SLA breach: Task '{task.title}' escalated from L{old_level} to L{expected_level}",
            extra={"task_id": str(task.id)},
        )

        # Notify assignee
        if task.assignee_id:
            await create_notification(
                db=db,
                user_id=str(task.assignee_id),
                notif_type="sla_breach",
                message=f"⚠️ SLA Breach (L{expected_level}): Task '{task.title}' has exceeded its {task.sla_hours}h SLA by {hours_overdue:.0f}h.",
            )

        # Notify task creator (escalation routing)
        if task.created_by and str(task.created_by) != str(task.assignee_id):
            await create_notification(
                db=db,
                user_id=str(task.created_by),
                notif_type="sla_breach",
                message=f"📋 Escalation L{expected_level}: Task '{task.title}' assigned to your team has breached its SLA.",
            )

    if escalated:
        await db.commit()

    return escalated


async def get_sla_status(task: Task) -> dict:
    """Get SLA status for a single task."""
    if not task.sla_hours or not task.created_at:
        return {"has_sla": False}

    sla_deadline = task.created_at + timedelta(hours=task.sla_hours)
    now = datetime.now(timezone.utc)
    remaining = sla_deadline - now
    remaining_hours = remaining.total_seconds() / 3600

    return {
        "has_sla": True,
        "sla_hours": task.sla_hours,
        "sla_deadline": sla_deadline.isoformat(),
        "remaining_hours": round(remaining_hours, 1),
        "is_breached": remaining_hours < 0,
        "escalation_level": task.escalation_level,
    }
