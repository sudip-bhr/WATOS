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
    Suggest to: < 40% utilization with skills match.
    """
    overloaded_users = [u_id for u_id, util in utilizations.items() if util > 0.8]
    underloaded_users = [u for u in users if utilizations.get(str(u["id"]), 0) < 0.4]
    
    suggestions = []
    for t in tasks:
        # Only consider tasks from overloaded users with high delay risk
        if str(t.assignee_id) in overloaded_users and (t.delay_prob or 0) > 0.6:
            # Find best match in underloaded group
            best_match = None
            max_score = -1
            
            t_skills = set(t.required_skills or [])
            for u in underloaded_users:
                u_skills = set(u.get("skills", []))
                match_score = len(t_skills.intersection(u_skills))
                if match_score > max_score:
                    max_score = match_score
                    best_match = u
            
            if best_match:
                suggestions.append({
                    "task_id": str(t.id),
                    "task_title": t.title,
                    "current_assignee_id": str(t.assignee_id),
                    "suggested_assignee_id": str(best_match["id"]),
                    "suggested_assignee_name": best_match["full_name"],
                    "reason": f"Current assignee is overloaded ({utilizations[str(t.assignee_id)]*100:.0f}%). {best_match['full_name']} has capacity.",
                    "risk_reduction": 0.3 # Estimated reduction in delay risk
                })
    
    return suggestions
