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
    {"name": "Cloud Cost Optimization", "desc": "Refactoring heavy queries, setting up spot instances, and analyzing AWS billing."},
    {"name": "SOC2 Compliance Audit", "desc": "Security hardening, audit logging, and role-based access control (RBAC) implementation."},
]

PROJECT_TASK_TEMPLATES = {
    0: [
        {"title": "Define Microservices Boundaries & Architecture", "skills": ["System Design", "Go"], "complexity": 6.0, "effort": 12.0, "status": "done", "assignee_idx": 1},
        {"title": "Configure gRPC Protobuf Schemas", "skills": ["Go", "Node.js"], "complexity": 5.0, "effort": 10.0, "status": "done", "assignee_idx": 2},
        {"title": "Setup Kafka Event Broker Sandbox", "skills": ["Docker", "Kubernetes"], "complexity": 7.0, "effort": 15.0, "status": "done", "assignee_idx": 0},
        {"title": "Implement Identity & Auth Service", "skills": ["Security Auditing", "Redis"], "complexity": 8.0, "effort": 20.0, "status": "in_progress", "assignee_idx": 0},
        {"title": "Migrate Core User API Service", "skills": ["Go", "PostgreSQL"], "complexity": 7.0, "effort": 16.0, "status": "in_progress", "assignee_idx": 3},
        {"title": "Write Kafka Producer/Consumer Tests", "skills": ["Python", "CI/CD"], "complexity": 5.0, "effort": 8.0, "status": "in_progress", "assignee_idx": 4},
        {"title": "Verify Event Consistency Mechanics", "skills": ["System Design", "Redis"], "complexity": 8.0, "effort": 18.0, "status": "blocked", "assignee_idx": 5, "force_high_delay": True},
        {"title": "Draft API Service Documentation", "skills": ["Python"], "complexity": 3.0, "effort": 6.0, "status": "review", "assignee_idx": 6},
        {"title": "Implement Distributed Tracing (Jaeger)", "skills": ["Docker", "AWS"], "complexity": 6.0, "effort": 12.0, "status": "todo", "assignee_idx": 7},
        {"title": "Load Test High-Throughput Routes", "skills": ["Go", "CI/CD"], "complexity": 7.0, "effort": 14.0, "status": "todo", "assignee_idx": 8},
        {"title": "Deploy Staging Microservices Mesh", "skills": ["Kubernetes", "Terraform"], "complexity": 9.0, "effort": 22.0, "status": "todo", "assignee_idx": 1, "force_sla_breach": True},
        {"title": "API Production Go-Live & Monitoring", "skills": ["AWS", "CI/CD"], "complexity": 6.0, "effort": 8.0, "status": "todo", "assignee_idx": 2},
    ],
    1: [
        {"title": "Establish Design System Tokens & Tailwind Config", "skills": ["React", "TypeScript"], "complexity": 4.0, "effort": 8.0, "status": "done", "assignee_idx": 2},
        {"title": "Setup Storybook Component Sandbox", "skills": ["TypeScript"], "complexity": 5.0, "effort": 10.0, "status": "done", "assignee_idx": 6},
        {"title": "Configure React 19 Compiler & Build Pipeline", "skills": ["TypeScript", "Docker"], "complexity": 7.0, "effort": 14.0, "status": "done", "assignee_idx": 0},
        {"title": "Rebuild Global Navigation & Layout Components", "skills": ["React", "TypeScript"], "complexity": 6.0, "effort": 16.0, "status": "in_progress", "assignee_idx": 0},
        {"title": "Migrate Dashboard Analytics Visualization Widgets", "skills": ["React", "TypeScript"], "complexity": 8.0, "effort": 24.0, "status": "in_progress", "assignee_idx": 5},
        {"title": "Implement Theme System & Dark Mode Support", "skills": ["React", "TypeScript"], "complexity": 4.0, "effort": 8.0, "status": "in_progress", "assignee_idx": 7},
        {"title": "Perform Cross-Browser Rendering Verification", "skills": ["TypeScript"], "complexity": 5.0, "effort": 10.0, "status": "blocked", "assignee_idx": 8},
        {"title": "Audit Accessibility (WCAG 2.2 AA Compliance)", "skills": ["Security Auditing"], "complexity": 6.0, "effort": 12.0, "status": "review", "assignee_idx": 1},
        {"title": "Refactor Legacy Form Validation Engine", "skills": ["React"], "complexity": 5.0, "effort": 10.0, "status": "todo", "assignee_idx": 2},
        {"title": "Optimize Image Delivery & Font Loading", "skills": ["TypeScript"], "complexity": 4.0, "effort": 6.0, "status": "todo", "assignee_idx": 9},
        {"title": "Conduct End-to-End Cypress Interface Tests", "skills": ["TypeScript", "CI/CD"], "complexity": 7.0, "effort": 18.0, "status": "todo", "assignee_idx": 3, "force_high_delay": True},
        {"title": "Deploy Redesigned Frontend to CDN", "skills": ["AWS", "CI/CD"], "complexity": 5.0, "effort": 8.0, "status": "todo", "assignee_idx": 4},
    ],
    2: [
        {"title": "Design MLflow Model Registry & Storage Schema", "skills": ["System Design", "ML/AI"], "complexity": 6.0, "effort": 12.0, "status": "done", "assignee_idx": 3},
        {"title": "Clean and Preprocess Historical Datasets", "skills": ["Python", "ML/AI"], "complexity": 4.0, "effort": 10.0, "status": "done", "assignee_idx": 7},
        {"title": "Setup Distributed Training with PyTorch", "skills": ["ML/AI", "Docker"], "complexity": 8.0, "effort": 24.0, "status": "done", "assignee_idx": 0},
        {"title": "Train Core Workload Predictor Model", "skills": ["Python", "ML/AI"], "complexity": 7.0, "effort": 20.0, "status": "in_progress", "assignee_idx": 0},
        {"title": "Implement SHAP Explainability Engine", "skills": ["Python", "ML/AI"], "complexity": 9.0, "effort": 28.0, "status": "in_progress", "assignee_idx": 0},
        {"title": "Build FastAPI Inference Endpoint Wrapper", "skills": ["Python", "Docker"], "complexity": 5.0, "effort": 10.0, "status": "in_progress", "assignee_idx": 8},
        {"title": "Setup Prometheus Metrics for Inference Latency", "skills": ["Docker", "CI/CD"], "complexity": 6.0, "effort": 12.0, "status": "blocked", "assignee_idx": 1},
        {"title": "Implement Outlier Detection & Input Validation", "skills": ["Python", "Security Auditing"], "complexity": 5.0, "effort": 10.0, "status": "review", "assignee_idx": 2},
        {"title": "Create Model Performance Summary Reports", "skills": ["Python"], "complexity": 3.0, "effort": 6.0, "status": "todo", "assignee_idx": 3},
        {"title": "Conduct Shadow Model Staging Deployment", "skills": ["Kubernetes", "AWS"], "complexity": 7.0, "effort": 14.0, "status": "todo", "assignee_idx": 4},
        {"title": "Configure Auto-Retraining Trigger Mechanism", "skills": ["Python", "CI/CD"], "complexity": 8.0, "effort": 22.0, "status": "todo", "assignee_idx": 5, "force_high_delay": True},
        {"title": "Perform ML Inference Pipeline Release", "skills": ["Kubernetes", "CI/CD"], "complexity": 6.0, "effort": 8.0, "status": "todo", "assignee_idx": 6},
    ],
    3: [
        {"title": "Perform Global Infrastructure Cost Audit", "skills": ["System Design", "AWS"], "complexity": 5.0, "effort": 10.0, "status": "done", "assignee_idx": 4},
        {"title": "Identify Unused EBS Volumes & Orphaned EIPs", "skills": ["AWS"], "complexity": 3.0, "effort": 6.0, "status": "done", "assignee_idx": 8},
        {"title": "Configure Auto-Scaling Groups & Launch Templates", "skills": ["AWS", "Docker"], "complexity": 6.0, "effort": 12.0, "status": "done", "assignee_idx": 1},
        {"title": "Refactor High-CPU Database Queries", "skills": ["PostgreSQL"], "complexity": 8.0, "effort": 20.0, "status": "in_progress", "assignee_idx": 2},
        {"title": "Migrate Dev Environments to AWS Spot Instances", "skills": ["AWS", "Docker"], "complexity": 7.0, "effort": 18.0, "status": "in_progress", "assignee_idx": 3},
        {"title": "Implement ECS Task Cluster Scaling Policies", "skills": ["AWS", "Kubernetes"], "complexity": 7.0, "effort": 16.0, "status": "in_progress", "assignee_idx": 5, "force_high_delay": True},
        {"title": "Setup Cost Allocation Tags for FinOps Tracking", "skills": ["AWS"], "complexity": 4.0, "effort": 8.0, "status": "blocked", "assignee_idx": 6},
        {"title": "Establish S3 Lifecycle Storage Policies", "skills": ["AWS"], "complexity": 4.0, "effort": 8.0, "status": "review", "assignee_idx": 7},
        {"title": "Configure CloudWatch Billing Alerts & Budgets", "skills": ["AWS", "CI/CD"], "complexity": 4.0, "effort": 8.0, "status": "todo", "assignee_idx": 8},
        {"title": "Compress Historical Log Collections (S3 Glacier)", "skills": ["AWS"], "complexity": 5.0, "effort": 10.0, "status": "todo", "assignee_idx": 1},
        {"title": "Perform Database Read Replica Optimization", "skills": ["PostgreSQL", "System Design"], "complexity": 8.0, "effort": 22.0, "status": "todo", "assignee_idx": 2, "force_sla_breach": True},
        {"title": "Generate Final Cloud Cost Savings Report", "skills": ["Python"], "complexity": 4.0, "effort": 6.0, "status": "todo", "assignee_idx": 3},
    ],
    4: [
        {"title": "Map SOC2 Control Framework to Architecture", "skills": ["System Design", "Security Auditing"], "complexity": 5.0, "effort": 10.0, "status": "done", "assignee_idx": 5},
        {"title": "Implement Core System Audit Logging (AuditLog)", "skills": ["PostgreSQL", "Security Auditing"], "complexity": 7.0, "effort": 18.0, "status": "done", "assignee_idx": 1},
        {"title": "Setup AWS KMS Key Encryption at Rest", "skills": ["AWS", "Security Auditing"], "complexity": 6.0, "effort": 12.0, "status": "done", "assignee_idx": 2},
        {"title": "Enforce Multi-Factor Authentication (MFA) Middleware", "skills": ["Security Auditing", "Redis"], "complexity": 6.0, "effort": 14.0, "status": "in_progress", "assignee_idx": 3},
        {"title": "Restrict Backend API Access (RBAC Controls)", "skills": ["Security Auditing", "System Design"], "complexity": 8.0, "effort": 24.0, "status": "in_progress", "assignee_idx": 4, "force_high_delay": True},
        {"title": "Conduct Vulnerability Static Code Scans (SAST)", "skills": ["Security Auditing", "CI/CD"], "complexity": 5.0, "effort": 10.0, "status": "in_progress", "assignee_idx": 6},
        {"title": "Perform External Network Penetration Tests", "skills": ["Security Auditing"], "complexity": 8.0, "effort": 20.0, "status": "blocked", "assignee_idx": 7},
        {"title": "Draft Disaster Recovery Plan Documentation", "skills": ["System Design"], "complexity": 4.0, "effort": 8.0, "status": "review", "assignee_idx": 8},
        {"title": "Implement Intrusion Detection (AWS GuardDuty)", "skills": ["AWS", "Security Auditing"], "complexity": 6.0, "effort": 12.0, "status": "todo", "assignee_idx": 1},
        {"title": "Setup Secure SSL/TLS Cipher Suites (ALB)", "skills": ["AWS", "Security Auditing"], "complexity": 5.0, "effort": 10.0, "status": "todo", "assignee_idx": 2},
        {"title": "Perform Team Access & Permissions Review", "skills": ["Security Auditing"], "complexity": 7.0, "effort": 16.0, "status": "todo", "assignee_idx": 3, "force_sla_breach": True},
        {"title": "Gather Artifact Compliance Audit Evidence", "skills": ["Security Auditing"], "complexity": 5.0, "effort": 10.0, "status": "todo", "assignee_idx": 5},
    ],
}


# ── Dynamic Task Generators ──
def generate_task_archetype(archetype: str, proj_idx: int) -> dict:
    """Generates task parameters based on predefined archetypes for edge cases."""
    if archetype == "overloaded":
        return {
            "title": f"Critical Bugfix #{random.randint(100,999)} - Urgent",
            "skills": random_skills(2),
            "complexity": random.uniform(6.0, 9.0),
            "effort": random.uniform(15.0, 25.0),
            "status": "in_progress",
            "is_overloaded": True
        }
    elif archetype == "underutilized":
        return {
            "title": "Minor typo in documentation",
            "skills": ["Python"], # Simple task
            "complexity": 1.0,
            "effort": 1.0,
            "status": "todo",
            "is_underutilized": True
        }
    elif archetype == "high_delay_risk":
        return {
            "title": "Complex Database Migration (High Risk)",
            "skills": ["PostgreSQL", "System Design"],
            "complexity": 9.5,
            "effort": 30.0,
            "status": "in_progress",
            "force_high_delay": True
        }
    elif archetype == "sla_breached":
        return {
            "title": "Resolve Prod Outage - Identity Service",
            "skills": ["Security Auditing", "AWS"],
            "complexity": 8.0,
            "effort": 12.0,
            "status": "in_progress",
            "force_sla_breach": True
        }
    else:
        # Standard routine task
        statuses = ["todo", "in_progress", "review", "done", "blocked"]
        weights = [30, 30, 15, 20, 5]
        status = random.choices(statuses, weights=weights, k=1)[0]
        return {
            "title": f"Routine Feature #{random.randint(1000,9999)}",
            "skills": random_skills(random.randint(1, 3)),
            "complexity": random.uniform(2.0, 7.0),
            "effort": random.uniform(4.0, 16.0),
            "status": status
        }

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


def compute_ml_fields(complexity, effort_hours, deadline, capacity=40.0, assigned_effort=20.0, force_high_delay=False):
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
    
    if force_high_delay:
        delay_prob = random.uniform(0.92, 0.99)
        workload_ratio = max(workload_ratio, 1.5)  # Force SHAP to blame workload
        complexity = max(complexity, 9.0)

    # Priority score: α=0.5, β=0.3, γ=0.2
    priority_score = round(0.5 * urgency + 0.3 * delay_prob + 0.2 * (complexity / 5.0), 4)

    # SHAP explanation
    
    if force_high_delay:
        human_readable = f"EXTREME RISK: Team member is overloaded at {workload_ratio:.0%} capacity and task is highly complex."
    elif workload_ratio > 1.1:
        human_readable = f"Workload exceeds capacity ({workload_ratio:.0%}) causing significant delay risk."
    elif complexity > 8.0:
        human_readable = "Task complexity is the primary driver of delay risk."
    else:
        human_readable = f"Routine risk. {'Tight deadline adds pressure.' if days_to_deadline < 5 else 'Deadline is comfortable.'}"
        
    shap = {
        "base_value": round(random.uniform(3.0, 6.0), 2),
        "contributions": {
            "workload_utilization": round((workload_ratio if workload_ratio > 1.0 else 0.5) * random.uniform(0.8, 1.5), 3),
            "complexity": round(complexity * random.uniform(0.1, 0.3), 3),
            "urgency": round(urgency * random.uniform(1.0, 3.0), 3),
            "historical_reliability": round(random.uniform(-0.5, 0.5), 3),
        },
        "human_readable": human_readable
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
