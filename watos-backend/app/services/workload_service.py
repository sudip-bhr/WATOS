import numpy as np


def compute_utilization(tasks: list, capacity_hours: float) -> float:
    total = sum(
        (t["effort_hours"] or 0)
        for t in tasks
        if t.get("status") != "done" and t.get("effort_hours")
    )
    cap = capacity_hours if capacity_hours is not None else 40.0
    return round(total / max(cap, 1), 4)


def compute_imbalance(utilizations: list) -> float:
    """Calculate workload variance across team."""
    if not utilizations: return 0.0
    import numpy as np
    return float(np.std(utilizations))


def get_rebalancing_suggestions(tasks: list, users: list, utilizations: dict) -> list:
    """
    Identifies tasks assigned to overloaded users and suggests re-assignment.
    Overloaded: > 80% utilization.
    Receiver: any user with meaningfully lower utilization than the overloaded source
    (at least 15% relatively lower), NOT a fixed < 40% gate that fails when the whole
    team is overloaded.
    Priority: highest delay_prob tasks are suggested first.
    One suggestion per overloaded user, capped at 10 total.
    """
    overloaded_ids = {u_id for u_id, util in utilizations.items() if util > 0.8}
    if not overloaded_ids:
        return []

    # Sort all users by utilization ascending — least loaded comes first
    sorted_users = sorted(users, key=lambda u: utilizations.get(str(u["id"]), 0))

    # Gather tasks that belong to overloaded users, sorted by delay risk (desc) then effort (desc)
    candidate_tasks = sorted(
        [t for t in tasks if t.assignee_id and str(t.assignee_id) in overloaded_ids],
        key=lambda t: (-(t.delay_prob or 0), -(t.effort_hours or 0)),
    )

    suggestions = []
    seen_overloaded: set = set()  # at most one suggestion per overloaded user

    for t in candidate_tasks:
        assignee_id = str(t.assignee_id)
        if assignee_id in seen_overloaded:
            continue

        current_util = utilizations.get(assignee_id, 0)
        t_skills = set(t.required_skills or [])

        # Find the best recipient: relatively less loaded AND best skill overlap
        best_match = None
        best_score = -1

        for u in sorted_users:
            u_id = str(u["id"])
            if u_id == assignee_id:
                continue
            u_util = utilizations.get(u_id, 0)

            # Must be at least 15% relatively less loaded than the source
            if current_util <= 0 or u_util >= current_util * 0.85:
                continue

            u_skills = set(u.get("skills", []))
            # Skill overlap (use 1 when task has no required_skills so we still recommend)
            skill_match = len(t_skills & u_skills) if t_skills else 1
            # Higher skill match and bigger load gap both improve score
            load_gap = current_util - u_util
            score = skill_match * 10 + load_gap * 5

            if score > best_score:
                best_score = score
                best_match = u

        if best_match:
            best_util = utilizations.get(str(best_match["id"]), 0)
            risk_reduction = round(min(0.5, (current_util - best_util) * 0.25), 2)
            suggestions.append({
                "task_id": str(t.id),
                "task_title": t.title,
                "current_assignee_id": assignee_id,
                "suggested_assignee_id": str(best_match["id"]),
                "suggested_assignee_name": best_match["full_name"],
                "reason": (
                    f"Current assignee is overloaded ({current_util * 100:.0f}%). "
                    f"{best_match['full_name']} has lower load ({best_util * 100:.0f}%) "
                    f"and can absorb this task."
                ),
                "risk_reduction": risk_reduction,
            })
            seen_overloaded.add(assignee_id)

        if len(suggestions) >= 10:
            break

    return suggestions
