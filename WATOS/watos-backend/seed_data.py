"""
WATOS Seed Data — Dynamic data pools and generators for CS professionals.
"""
import random
import uuid
import secrets
from datetime import datetime, timedelta, timezone

SEED_PASSWORD = "Test@1234"
SEED_ORG_PREFIX = "watos-seed-"

# ── CS Skill Pool ──
SKILLS = [
    "Python", "React", "TypeScript", "Node.js", "PostgreSQL", "Docker",
    "Kubernetes", "AWS", "CI/CD", "GraphQL", "Redis", "System Design",
    "ML/AI", "Security Auditing", "Terraform", "Go", "Rust", "MongoDB",
]

# ── Name Pools (shuffled at runtime) ──
FIRST_NAMES = [
    "Arjun", "Priya", "Liam", "Sofia", "Kenji", "Anika", "Omar", "Mei",
    "Diego", "Fatima", "Yuki", "Rina", "Sajan", "Nisha", "Ravi",
]
LAST_NAMES = [
    "Sharma", "Chen", "Nakamura", "Reyes", "Okafor", "Berg", "Singh",
    "Tamang", "Koirala", "Adhikari", "Patel", "Kim", "Santos", "Ali",
]
ORG_NAMES = [
    "NovaTech Engineering", "Apex Cloud Labs", "CodeForge Systems",
    "Velocity Dev Co", "Quantum Stack Inc",
]

# ── Project Definitions ──
PROJECTS = [
    {"name": "API Microservices Migration", "desc": "Breaking the monolith into domain-driven microservices with gRPC and event sourcing."},
    {"name": "Frontend Platform Redesign", "desc": "React 19 migration with new design system, Storybook components, and accessibility overhaul."},
    {"name": "ML Pipeline Infrastructure", "desc": "Real-time inference endpoints, model registry, and SHAP explainability dashboard."},
]

# ── Task Templates ──
TASK_TEMPLATES = [
    # Project 0 - API Migration
    {"title": "Implement JWT refresh token rotation", "skills": ["Python", "Security Auditing"], "complexity": 6.0, "effort": 12.0, "status": "done"},
    {"title": "Migrate user service to gRPC", "skills": ["Python", "System Design"], "complexity": 8.0, "effort": 20.0, "status": "in_progress"},
    {"title": "Design rate-limiting middleware", "skills": ["Python", "Redis"], "complexity": 5.0, "effort": 8.0, "status": "review"},
    {"title": "Set up API gateway with Kong", "skills": ["Docker", "Kubernetes"], "complexity": 7.0, "effort": 16.0, "status": "todo"},
    {"title": "Write integration tests for auth flow", "skills": ["Python", "CI/CD"], "complexity": 4.0, "effort": 6.0, "status": "blocked"},
    # Project 1 - Frontend
    {"title": "Build component library with Storybook", "skills": ["React", "TypeScript"], "complexity": 6.5, "effort": 18.0, "status": "in_progress"},
    {"title": "Implement dark mode theme system", "skills": ["React", "TypeScript"], "complexity": 4.0, "effort": 8.0, "status": "done"},
    {"title": "Migrate state management to Zustand", "skills": ["React", "TypeScript"], "complexity": 7.0, "effort": 14.0, "status": "in_progress"},
    {"title": "Accessibility audit and WCAG fixes", "skills": ["React", "Security Auditing"], "complexity": 5.5, "effort": 10.0, "status": "rejected"},
    {"title": "Set up E2E tests with Playwright", "skills": ["TypeScript", "CI/CD"], "complexity": 5.0, "effort": 8.0, "status": "todo"},
    # Project 2 - ML
    {"title": "Set up Kubernetes HPA for inference pods", "skills": ["Kubernetes", "Docker", "AWS"], "complexity": 8.5, "effort": 22.0, "status": "in_progress"},
    {"title": "Integrate SHAP explainability dashboard", "skills": ["Python", "ML/AI", "React"], "complexity": 7.5, "effort": 16.0, "status": "review"},  
    {"title": "Build model versioning registry", "skills": ["Python", "PostgreSQL", "Docker"], "complexity": 6.0, "effort": 12.0, "status": "done"},
    {"title": "Implement A/B testing for model rollout", "skills": ["Python", "ML/AI"], "complexity": 8.0, "effort": 18.0, "status": "blocked"},
    {"title": "Design feature store schema", "skills": ["PostgreSQL", "System Design"], "complexity": 7.0, "effort": 14.0, "status": "todo"},
]

# ── Subtask Templates ──
SUBTASK_TEMPLATES = [
    "Write unit tests", "Update API documentation", "Code review",
    "Set up CI pipeline step", "Write migration script", "Update README",
    "Add error handling", "Performance benchmarking", "Security review",
    "Add logging and monitoring", "Create PR and request review",
    "Update Swagger/OpenAPI spec", "Add input validation", "Refactor legacy code",
]

# ── Comment Templates ──
COMMENT_TEMPLATES = [
    "Looked into this — the main blocker is the legacy schema. Proposing a migration-first approach.",
    "PR is up for review. Added comprehensive test coverage for edge cases.",
    "This is taking longer than estimated due to unexpected dependency conflicts.",
    "Shipped the initial implementation. Need feedback on the error handling strategy.",
    "Blocked on the upstream API changes. Pinged the team in Slack.",
    "Refactored the module to use the strategy pattern — much cleaner now.",
    "Performance benchmarks show 3x improvement after the Redis caching layer.",
    "Found a security vulnerability during review. Adding input sanitization.",
    "The design doc is updated with the new architecture diagram.",
    "Ran load tests — handles 10k req/s with p99 < 200ms. Ready for prod.",
    "Need to coordinate with the DevOps team on the K8s config changes.",
    "Added observability: structured logging + Prometheus metrics + Grafana dashboard.",
    "Discussed trade-offs in standup — going with eventual consistency for this service.",
    "The SHAP values look reasonable. Model interpretability is much better now.",
    "Merged! Deploying to staging for smoke tests.",
    "Rolling back — found a regression in the auth middleware. Investigating.",
    "Fixed the race condition in the token refresh logic. Added mutex lock.",
    "Great work on this! The code quality is excellent. Approving.",
]

# ── Notification Templates ──
NOTIF_TEMPLATES = [
    {"type": "task_assigned", "msg": "You've been assigned to: {task}"},
    {"type": "delay_risk", "msg": "High delay probability ({prob:.0%}) detected for: {task}"},
    {"type": "sla_breach", "msg": "SLA breach on: {task} — escalation level raised"},
    {"type": "comment", "msg": "New comment on: {task}"},
    {"type": "deadline", "msg": "Deadline approaching in 24h: {task}"},
    {"type": "mention", "msg": "You were mentioned in a comment on: {task}"},
]


def generate_unique_slug():
    return f"{SEED_ORG_PREFIX}{secrets.token_hex(4)}"


def pick_name():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


def random_skills(count=3):
    return random.sample(SKILLS, min(count, len(SKILLS)))


def random_past_date(days_ago_max=45, days_ago_min=1):
    days = random.randint(days_ago_min, days_ago_max)
    return datetime.now(timezone.utc) - timedelta(days=days, hours=random.randint(0, 12))


def random_future_date(days_ahead_min=1, days_ahead_max=21):
    days = random.randint(days_ahead_min, days_ahead_max)
    return datetime.now(timezone.utc) + timedelta(days=days, hours=random.randint(0, 8))


def compute_ml_fields(complexity, effort_hours, deadline, capacity=40.0, assigned_effort=20.0):
    """Compute realistic ML prediction fields using the documented formulas."""
    now = datetime.now(timezone.utc)
    days_to_deadline = max((deadline - now).total_seconds() / 86400, 0.1) if deadline else 7.0

    # PERT estimates
    optimistic = effort_hours * random.uniform(0.6, 0.8)
    pessimistic = effort_hours * random.uniform(1.3, 1.8)
    most_likely = effort_hours * random.uniform(0.9, 1.1)
    pert_estimate = (optimistic + 4 * most_likely + pessimistic) / 6
    pert_std_dev = (pessimistic - optimistic) / 6

    # Predicted hours
    predicted = complexity * 2.5 + effort_hours * 0.3 + random.gauss(0, 1.5)
    predicted = max(predicted, 1.0)

    # Delay probability
    workload_ratio = assigned_effort / capacity
    urgency = 1.0 / (1.0 + days_to_deadline)
    delay_prob = min(max(0.5 * (1.0 / (1.0 + pow(2.718, -(workload_ratio - 0.8) * 5))) + 0.3 * urgency + random.gauss(0, 0.05), 0.01), 0.99)

    # Priority score: α=0.5, β=0.3, γ=0.2
    priority_score = round(0.5 * urgency + 0.3 * delay_prob + 0.2 * (complexity / 5.0), 4)

    # SHAP explanation
    shap = {
        "base_value": round(random.uniform(3.0, 6.0), 2),
        "contributions": {
            "workload_utilization": round(workload_ratio * random.uniform(0.5, 1.5), 3),
            "complexity": round(complexity * random.uniform(0.1, 0.3), 3),
            "urgency": round(urgency * random.uniform(1.0, 3.0), 3),
            "historical_reliability": round(random.uniform(-0.5, 0.5), 3),
        },
        "human_readable": f"Workload at {workload_ratio:.0%} capacity is the primary driver. "
                          f"{'Tight deadline adds pressure.' if days_to_deadline < 5 else 'Deadline is comfortable.'}"
    }

    return {
        "predicted_hours": round(predicted, 2),
        "delay_prob": round(delay_prob, 4),
        "priority_score": round(priority_score, 4),
        "pert_estimate": round(pert_estimate, 2),
        "pert_std_dev": round(pert_std_dev, 2),
        "optimistic_hrs": round(optimistic, 2),
        "pessimistic_hrs": round(pessimistic, 2),
        "most_likely_hrs": round(most_likely, 2),
        "shap_explanation": shap,
    }
