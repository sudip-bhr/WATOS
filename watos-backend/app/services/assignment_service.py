import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer


def recommend_assignee(task_skills: list, users: list, utilizations: dict) -> list:
    """
    Ranks team members by skill match × availability.
    Returns sorted list of {user_id, full_name, skill_match, availability, combined_score, reason}.
    """
    if not task_skills:
        return sorted(
            [
                {
                    "user_id": u["id"],
                    "full_name": u["full_name"],
                    "skill_match": 0.0,
                    "availability": round(max(1 - utilizations.get(u["id"], 0), 0), 3),
                    "combined_score": round(max(1 - utilizations.get(u["id"], 0), 0), 3),
                    "reason": "lowest workload",
                }
                for u in users
            ],
            key=lambda x: x["combined_score"],
            reverse=True,
        )

    all_skills = [u.get("skills", []) for u in users] + [task_skills]
    mlb = MultiLabelBinarizer()
    skill_matrix = mlb.fit_transform(all_skills)

    task_vec = skill_matrix[-1].reshape(1, -1)
    user_vecs = skill_matrix[:-1]
    skill_scores = cosine_similarity(task_vec, user_vecs)[0]

    results = []
    for i, user in enumerate(users):
        utilization = utilizations.get(user["id"], 0)
        availability = max(1 - utilization, 0)
        combined = 0.6 * skill_scores[i] + 0.4 * availability
        results.append({
            "user_id": user["id"],
            "full_name": user["full_name"],
            "skill_match": round(float(skill_scores[i]), 3),
            "availability": round(availability, 3),
            "combined_score": round(combined, 3),
            "reason": f"{skill_scores[i]*100:.0f}% skill match, {availability*100:.0f}% availability",
        })

    return sorted(results, key=lambda x: x["combined_score"], reverse=True)
