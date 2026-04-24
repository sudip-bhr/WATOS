"""
Resource Leveling Engine.
Generates task rebalancing proposals using a greedy algorithm:
  1. Compute utilization for all members
  2. Identify overloaded members (>85% utilization)
  3. For each overloaded member's tasks (lowest priority first):
     - Find underloaded member (<50%) with best skill match
     - Simulate the move and verify it doesn't overload the target
     - Record the proposal
  4. Return proposals for operator approval
"""
import numpy as np
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.task import Task
from app.models.user import User
from app.models.rebalance_proposal import RebalanceProposal
from app.services.workload_service import compute_utilization
from app.core.logging import get_logger

logger = get_logger("leveling_engine")

# Thresholds
OVERLOADED_THRESHOLD = 0.85
UNDERLOADED_THRESHOLD = 0.50
TARGET_MAX_AFTER_MOVE = 0.75


async def generate_rebalance_plan(org_id: str, db: AsyncSession) -> list:
    """
    Generate a list of rebalancing proposals for an organization.
    Returns proposals that need operator approval before execution.
    """
    # 1. Load all active users and their tasks
    users_result = await db.execute(
        select(User).where(
            User.organization_id == org_id,
            User.is_active == True,
            User.is_deleted == False,
            User.role.in_(["member", "operator"]),
        )
    )
    users = users_result.scalars().all()

    tasks_result = await db.execute(
        select(Task).where(
            Task.organization_id == org_id,
            Task.status.notin_(["done", "rejected"]),
            Task.is_deleted == False,
        )
    )
    all_tasks = tasks_result.scalars().all()

    # 2. Compute utilization per user
    user_map = {}
    util_map = {}
    user_tasks_map = {}

    for user in users:
        u_tasks = [t for t in all_tasks if t.assignee_id == user.id]
        tasks_dict = [{"effort_hours": t.effort_hours or 0, "status": t.status} for t in u_tasks]
        util = compute_utilization(tasks_dict, user.capacity_hours or 40.0)

        user_map[str(user.id)] = user
        util_map[str(user.id)] = util
        user_tasks_map[str(user.id)] = u_tasks

    # 3. Identify overloaded and underloaded users
    overloaded = [(uid, util) for uid, util in util_map.items() if util > OVERLOADED_THRESHOLD]
    overloaded.sort(key=lambda x: x[1], reverse=True)  # Most overloaded first

    underloaded = [(uid, util) for uid, util in util_map.items() if util < UNDERLOADED_THRESHOLD]

    if not overloaded or not underloaded:
        return []

    # 4. Generate proposals
    proposals = []
    # Track simulated utilization changes
    sim_util = dict(util_map)

    for o_uid, o_util in overloaded:
        o_user = user_map[o_uid]
        o_tasks = user_tasks_map[o_uid]

        # Sort tasks by priority (move lowest priority first)
        movable_tasks = [
            t for t in o_tasks
            if t.status in ("todo", "in_progress") and t.effort_hours
        ]
        movable_tasks.sort(key=lambda t: t.priority_score or 0)

        for task in movable_tasks:
            # Stop if user is no longer overloaded after simulated moves
            if sim_util[o_uid] <= OVERLOADED_THRESHOLD:
                break

            # Find best underloaded target
            best_target = _find_best_target(
                task, underloaded, user_map, sim_util
            )

            if not best_target:
                continue

            t_uid = best_target["user_id"]
            t_user = user_map[t_uid]

            # Simulate the move
            effort = task.effort_hours or 0
            o_capacity = o_user.capacity_hours or 40.0
            t_capacity = t_user.capacity_hours or 40.0

            new_o_util = max(sim_util[o_uid] - (effort / o_capacity), 0)
            new_t_util = sim_util[t_uid] + (effort / t_capacity)

            # Only propose if target stays under threshold
            if new_t_util > TARGET_MAX_AFTER_MOVE:
                continue

            proposal = RebalanceProposal(
                organization_id=org_id,
                task_id=task.id,
                task_title=task.title,
                from_user_id=o_user.id,
                from_user_name=o_user.full_name or o_user.email,
                to_user_id=t_user.id,
                to_user_name=t_user.full_name or t_user.email,
                reason=f"Rebalance: {o_user.full_name or o_user.email} is at {sim_util[o_uid]*100:.0f}% utilization. "
                       f"{t_user.full_name or t_user.email} has capacity ({sim_util[t_uid]*100:.0f}%). "
                       f"Skill match: {best_target['skill_score']*100:.0f}%.",
                from_utilization_before=round(sim_util[o_uid], 4),
                from_utilization_after=round(new_o_util, 4),
                to_utilization_before=round(sim_util[t_uid], 4),
                to_utilization_after=round(new_t_util, 4),
                skill_match_score=best_target["skill_score"],
                status="pending",
            )

            db.add(proposal)
            proposals.append(proposal)

            # Update simulated utilizations
            sim_util[o_uid] = new_o_util
            sim_util[t_uid] = new_t_util

    await db.commit()

    # Refresh all proposals to get IDs
    for p in proposals:
        await db.refresh(p)

    logger.info(f"Generated {len(proposals)} rebalancing proposals for org {org_id}")
    return proposals


def _find_best_target(task, underloaded: list, user_map: dict, sim_util: dict) -> Optional[dict]:
    """Find the best underloaded user to receive a task based on skill match and availability."""
    task_skills = set(task.required_skills or [])
    best = None
    best_score = -1

    for u_uid, _ in underloaded:
        if sim_util[u_uid] >= TARGET_MAX_AFTER_MOVE:
            continue

        user = user_map[u_uid]
        user_skills = set(user.skills or [])

        # Skill match score
        if task_skills and user_skills:
            intersection = len(task_skills & user_skills)
            union = len(task_skills | user_skills)
            skill_score = intersection / union if union > 0 else 0
        elif not task_skills:
            skill_score = 0.5  # Neutral if no skills required
        else:
            skill_score = 0.0

        # Combined score: 60% skill match + 40% available capacity
        availability = max(1 - sim_util[u_uid], 0)
        combined = 0.6 * skill_score + 0.4 * availability

        if combined > best_score:
            best_score = combined
            best = {
                "user_id": u_uid,
                "skill_score": round(skill_score, 3),
                "combined_score": round(combined, 3),
            }

    return best


async def execute_approved_proposals(proposal_ids: list, reviewer_id: str, db: AsyncSession) -> list:
    """Apply approved rebalancing proposals — update task.assignee_id."""
    from datetime import datetime, timezone

    executed = []
    for pid in proposal_ids:
        result = await db.execute(
            select(RebalanceProposal).where(RebalanceProposal.id == pid)
        )
        proposal = result.scalar_one_or_none()

        if not proposal or proposal.status != "approved":
            continue

        # Update the task assignment
        task_result = await db.execute(select(Task).where(Task.id == proposal.task_id))
        task = task_result.scalar_one_or_none()

        if task:
            task.assignee_id = proposal.to_user_id
            proposal.status = "executed"
            proposal.reviewed_at = datetime.now(timezone.utc)
            executed.append(str(proposal.id))

    await db.commit()
    logger.info(f"Executed {len(executed)} rebalancing proposals")
    return executed
