"""
WATOS Advanced Database Seeder
Usage:
    python seed.py              # Full seed
    python seed.py --reset      # Wipe seed data + re-seed
    python seed.py --verify     # Verify existing seed counts
    python seed.py --dry-run    # Preview without DB writes
"""
import asyncio
import argparse
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete, func as sqla_func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# ── Bootstrap path ──
sys.path.insert(0, ".")
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base
from app.models.organization import Organization
from app.models.user import User
from app.models.project import Project
from app.models.task import Task, TaskDependency
from app.models.subtask import Subtask
from app.models.comment import Comment
from app.models.task_watcher import TaskWatcher
from app.models.task_history import TaskHistory
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.models.ml_config import MLConfig

from seed_data import (
    SEED_PASSWORD, SEED_ORG_PREFIX, SKILLS, PROJECTS, TASK_TEMPLATES,
    SUBTASK_TEMPLATES, COMMENT_TEMPLATES, NOTIF_TEMPLATES,
    generate_unique_slug, pick_name, random_skills, random_past_date,
    random_future_date, compute_ml_fields,
)

# ── Colors ──
G = "\033[92m"; Y = "\033[93m"; R = "\033[91m"; C = "\033[96m"; B = "\033[1m"; E = "\033[0m"


async def get_engine_and_session():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    return engine, session_factory


async def reset_seed_data(session: AsyncSession):
    """Delete all seed-org data (identified by slug prefix)."""
    print(f"{Y}⚠  Resetting seed data...{E}")
    result = await session.execute(select(Organization).where(Organization.slug.like(f"{SEED_ORG_PREFIX}%")))
    orgs = result.scalars().all()
    for org in orgs:
        # Cascade deletes handle most, but clean up explicitly
        await session.execute(delete(Notification).where(Notification.organization_id == org.id))
        await session.execute(delete(AuditLog).where(AuditLog.organization_id == org.id))
        await session.execute(delete(TaskDependency))
        await session.execute(delete(TaskWatcher))
        await session.execute(delete(Comment))
        await session.execute(delete(Subtask))
        await session.execute(delete(TaskHistory))
        await session.execute(delete(Task).where(Task.organization_id == org.id))
        await session.execute(delete(Project).where(Project.organization_id == org.id))
        await session.execute(delete(User).where(User.organization_id == org.id))
        await session.execute(delete(Organization).where(Organization.id == org.id))
    await session.execute(delete(MLConfig))
    await session.commit()
    print(f"{G}✓  Seed data wiped.{E}\n")


async def verify_seed(session: AsyncSession):
    """Print verification table of seed data counts."""
    checks = [
        ("Organizations", select(sqla_func.count()).select_from(Organization).where(Organization.slug.like(f"{SEED_ORG_PREFIX}%"))),
        ("Users (admin)", select(sqla_func.count()).select_from(User).where(User.role == "admin")),
        ("Users (operator)", select(sqla_func.count()).select_from(User).where(User.role == "operator")),
        ("Users (member)", select(sqla_func.count()).select_from(User).where(User.role == "member")),
        ("Projects", select(sqla_func.count()).select_from(Project)),
        ("Tasks", select(sqla_func.count()).select_from(Task)),
        ("Subtasks", select(sqla_func.count()).select_from(Subtask)),
        ("Comments", select(sqla_func.count()).select_from(Comment)),
        ("Notifications", select(sqla_func.count()).select_from(Notification)),
        ("Audit Logs", select(sqla_func.count()).select_from(AuditLog)),
        ("Task History", select(sqla_func.count()).select_from(TaskHistory)),
        ("Task Dependencies", select(sqla_func.count()).select_from(TaskDependency)),
        ("ML Config", select(sqla_func.count()).select_from(MLConfig)),
    ]
    expected = [1, 2, 1, 5, 3, 15, None, None, None, None, None, 3, 1]

    print(f"\n{B}{'─'*62}{E}")
    print(f"{B}{'WATOS Seed Verification Report':^62}{E}")
    print(f"{B}{'─'*62}{E}")
    print(f"  {'Entity':<22} {'Expected':>10} {'Found':>10} {'Status':>14}")
    print(f"  {'─'*58}")

    all_pass = True
    for i, (name, query) in enumerate(checks):
        result = await session.execute(query)
        count = result.scalar()
        exp = expected[i]
        if exp is None:
            status = f"{C}INFO{E}"
        elif count >= exp:
            status = f"{G}PASS{E}"
        else:
            status = f"{R}FAIL{E}"
            all_pass = False
        exp_str = str(exp) if exp else "—"
        print(f"  {name:<22} {exp_str:>10} {count:>10} {status:>24}")

    print(f"  {'─'*58}")
    overall = f"{G}ALL CHECKS PASSED{E}" if all_pass else f"{Y}SOME CHECKS NEED ATTENTION{E}"
    print(f"  {overall}\n")


def print_credentials(users_info):
    """Print formatted credentials table."""
    print(f"\n{B}{'═'*66}{E}")
    print(f"{B}{'🚀 WATOS Test Credentials':^66}{E}")
    print(f"{B}{'═'*66}{E}")
    print(f"  {'Role':<16} {'Email':<32} {'Password':<14}")
    print(f"  {'─'*62}")
    icons = {"admin": "👑", "operator": "🔧", "member": "💻"}
    for u in users_info:
        icon = icons.get(u["role"], "👤")
        label = f"{icon} {u['role'].title()}"
        print(f"  {label:<16} {u['email']:<32} {SEED_PASSWORD:<14}")
    print(f"  {'─'*62}")
    print(f"  {Y}All passwords: {B}{SEED_PASSWORD}{E}\n")


async def seed(dry_run=False):
    engine, SessionFactory = await get_engine_and_session()

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionFactory() as session:
        # ── Check idempotency ──
        existing = await session.execute(
            select(Organization).where(Organization.slug.like(f"{SEED_ORG_PREFIX}%"))
        )
        if existing.scalar_one_or_none():
            print(f"{Y}⚠  Seed data already exists. Use --reset to re-seed.{E}")
            await verify_seed(session)
            return

        if dry_run:
            print(f"{C}🔍 DRY RUN — showing what would be created:{E}\n")

        random.seed()  # Ensure true randomness each run
        users_info = []
        hashed_pw = hash_password(SEED_PASSWORD)

        # ═══════════════════════════════════════════
        # PHASE 1: Organization + ML Config
        # ═══════════════════════════════════════════
        print(f"{B}Phase 1:{E} Foundation...")
        org_name = random.choice(["NovaTech Engineering", "Apex Cloud Labs", "CodeForge Systems", "Velocity Dev Co"])
        org = Organization(name=org_name, slug=generate_unique_slug(), plan="pro", max_users=50)
        ml_config = MLConfig(
            delay_prediction_enabled=True, shap_explanations_enabled=True,
            confidence_threshold=0.75, auto_rebalance_enabled=False, auto_assignment_enabled=True,
        )
        if not dry_run:
            session.add(org); session.add(ml_config)
            await session.flush()
        print(f"  {G}✓{E} Organization: {org_name}")
        print(f"  {G}✓{E} ML Config created")

        # ═══════════════════════════════════════════
        # PHASE 2: Users (2 Admin, 1 Operator, 5 Members)
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 2:{E} Users...")
        used_names = set()

        def make_user(role, email_prefix, skill_count=5, capacity=40.0):
            while True:
                fn, ln = pick_name()
                key = f"{fn}{ln}"
                if key not in used_names:
                    used_names.add(key)
                    break
            email = f"{email_prefix}.{fn.lower()}.{ln.lower()}@watos.dev"
            u = User(
                email=email, full_name=f"{fn} {ln}", hashed_password=hashed_pw,
                role=role, organization_id=org.id if not dry_run else None,
                capacity_hours=capacity, skills=random_skills(skill_count), is_active=True,
            )
            users_info.append({"role": role, "email": email, "name": f"{fn} {ln}"})
            return u

        admins = [make_user("admin", "admin", 8, 40.0) for _ in range(2)]
        operators = [make_user("operator", "ops", 6, 40.0)]
        members = [
            make_user("member", "dev", 4, 40.0),   # Backend — will be overloaded
            make_user("member", "dev", 4, 40.0),   # Frontend — near capacity
            make_user("member", "dev", 3, 38.0),   # ML — healthy
            make_user("member", "dev", 3, 42.0),   # DevOps — underutilized
            make_user("member", "dev", 5, 45.0),   # Full-stack — healthy
        ]
        all_users = admins + operators + members

        if not dry_run:
            for u in all_users:
                session.add(u)
            await session.flush()

        for u_info in users_info:
            print(f"  {G}✓{E} {u_info['role'].title()}: {u_info['name']} ({u_info['email']})")

        # ═══════════════════════════════════════════
        # PHASE 3: Projects
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 3:{E} Projects...")
        projects = []
        for i, pdef in enumerate(PROJECTS):
            p = Project(
                name=pdef["name"], description=pdef["desc"],
                organization_id=org.id if not dry_run else None,
                admin_id=admins[i % 2].id if not dry_run else None,
            )
            projects.append(p)
            if not dry_run:
                session.add(p)
        if not dry_run:
            await session.flush()
        for p in projects:
            print(f"  {G}✓{E} Project: {p.name}")

        # ═══════════════════════════════════════════
        # PHASE 4: Tasks (15)
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 4:{E} Tasks...")
        # Workload tracking for imbalance
        member_efforts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
        # Target efforts: M0=48, M1=38, M2=30, M3=15, M4=35
        member_assignment_order = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 4, 4, 4, 3, 3]
        random.shuffle(member_assignment_order)

        tasks = []
        for i, tpl in enumerate(TASK_TEMPLATES):
            proj_idx = i // 5  # 5 tasks per project
            member_idx = member_assignment_order[i] if i < len(member_assignment_order) else random.randint(0, 4)
            assignee = members[member_idx]
            member_efforts[member_idx] = member_efforts.get(member_idx, 0) + tpl["effort"]

            # Time-series: stagger creation dates
            created = random_past_date(45, 5)
            if tpl["status"] == "done":
                deadline = created + timedelta(days=random.randint(5, 15))
                completed = deadline - timedelta(days=random.randint(0, 3))
                actual = tpl["effort"] * random.uniform(0.8, 1.3)
            elif tpl["status"] == "blocked":
                deadline = random_future_date(3, 14)
                completed = None
                actual = None
            else:
                deadline = random_future_date(2, 21)
                completed = None
                actual = tpl["effort"] * random.uniform(0.1, 0.6) if tpl["status"] == "in_progress" else None

            ml = compute_ml_fields(
                tpl["complexity"], tpl["effort"], deadline,
                capacity=assignee.capacity_hours,
                assigned_effort=member_efforts[member_idx],
            )

            sla_hours = random.choice([None, None, None, 24, 48, 72])
            escalation = random.randint(1, 3) if sla_hours and tpl["status"] in ("blocked", "in_progress") else 0

            t = Task(
                organization_id=org.id if not dry_run else None,
                project_id=projects[proj_idx].id if not dry_run else None,
                title=tpl["title"], description=f"Sprint task: {tpl['title']}",
                assignee_id=assignee.id if not dry_run else None,
                created_by=admins[proj_idx % 2].id if not dry_run else None,
                status=tpl["status"], complexity=tpl["complexity"],
                effort_hours=tpl["effort"], actual_hours=round(actual, 2) if actual else None,
                deadline=deadline, completed_at=completed,
                required_skills=tpl["skills"], sla_hours=sla_hours, escalation_level=escalation,
                **ml,
            )
            tasks.append(t)
            if not dry_run:
                session.add(t)

        if not dry_run:
            await session.flush()

        status_counts = {}
        for t in tasks:
            status_counts[t.status] = status_counts.get(t.status, 0) + 1
        for s, c in status_counts.items():
            print(f"  {G}✓{E} {s}: {c} tasks")

        # ═══════════════════════════════════════════
        # PHASE 5: Dependencies (3)
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 5:{E} Task Dependencies...")
        dep_pairs = [(0, 4), (5, 9), (10, 13)]  # blocker → blocked
        deps_created = 0
        if not dry_run:
            for blocker_i, blocked_i in dep_pairs:
                if blocker_i < len(tasks) and blocked_i < len(tasks):
                    dep = TaskDependency(
                        blocker_task_id=tasks[blocker_i].id,
                        blocked_task_id=tasks[blocked_i].id,
                    )
                    session.add(dep)
                    deps_created += 1
            await session.flush()
        else:
            deps_created = len(dep_pairs)
        print(f"  {G}✓{E} {deps_created} dependency chains created")

        # ═══════════════════════════════════════════
        # PHASE 6: Subtasks (~3 per task)
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 6:{E} Subtasks...")
        subtask_count = 0
        if not dry_run:
            for t in tasks:
                num = random.randint(2, 4)
                templates = random.sample(SUBTASK_TEMPLATES, min(num, len(SUBTASK_TEMPLATES)))
                for st_title in templates:
                    is_done = t.status == "done" or random.random() < 0.4
                    st = Subtask(task_id=t.id, title=st_title, is_completed=is_done)
                    session.add(st)
                    subtask_count += 1
            await session.flush()
        else:
            subtask_count = 15 * 3
        print(f"  {G}✓{E} {subtask_count} subtasks created")

        # ═══════════════════════════════════════════
        # PHASE 7: Comments
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 7:{E} Comments...")
        comment_count = 0
        if not dry_run:
            for t in tasks:
                num = random.randint(1, 3)
                for _ in range(num):
                    commenter = random.choice(all_users)
                    c = Comment(
                        task_id=t.id, user_id=commenter.id,
                        content=random.choice(COMMENT_TEMPLATES),
                    )
                    session.add(c)
                    comment_count += 1
            await session.flush()
        else:
            comment_count = 18
        print(f"  {G}✓{E} {comment_count} comments created")

        # ═══════════════════════════════════════════
        # PHASE 8: Task Watchers
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 8:{E} Task Watchers...")
        watcher_count = 0
        if not dry_run:
            seen_pairs = set()
            for t in tasks:
                # Operator always watches
                pair = (t.id, operators[0].id)
                if pair not in seen_pairs:
                    session.add(TaskWatcher(task_id=t.id, user_id=operators[0].id))
                    seen_pairs.add(pair)
                    watcher_count += 1
                # Random additional watcher
                if random.random() < 0.5:
                    watcher = random.choice(all_users)
                    pair = (t.id, watcher.id)
                    if pair not in seen_pairs:
                        session.add(TaskWatcher(task_id=t.id, user_id=watcher.id))
                        seen_pairs.add(pair)
                        watcher_count += 1
            await session.flush()
        else:
            watcher_count = 12
        print(f"  {G}✓{E} {watcher_count} watchers created")

        # ═══════════════════════════════════════════
        # PHASE 9: Task History
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 9:{E} Task History...")
        history_count = 0
        if not dry_run:
            for t in tasks:
                if t.status in ("done", "in_progress", "review"):
                    days_to_dl = max((t.deadline - datetime.now(timezone.utc)).days, 1) if t.deadline else 7
                    th = TaskHistory(
                        task_id=t.id, user_id=t.assignee_id,
                        was_delayed=t.status == "done" and random.random() < 0.3,
                        predicted_hours=t.predicted_hours, actual_hours=t.actual_hours or t.effort_hours * 0.5,
                        complexity=t.complexity, effort_hours=t.effort_hours,
                        priority_score=t.priority_score, days_to_deadline=days_to_dl,
                        assignee_workload=random.uniform(0.5, 1.2),
                    )
                    session.add(th)
                    history_count += 1
            await session.flush()
        else:
            history_count = 10
        print(f"  {G}✓{E} {history_count} history records created")

        # ═══════════════════════════════════════════
        # PHASE 10: Audit Logs
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 10:{E} Audit Logs...")
        audit_count = 0
        if not dry_run:
            audit_actions = [
                ("POST", "users", "User account created"),
                ("POST", "projects", "Project created"),
                ("POST", "tasks", "Task created"),
                ("PATCH", "tasks", "Task status updated"),
                ("PATCH", "users", "User skills updated"),
                ("POST", "tasks", "Task assigned"),
            ]
            for t in tasks:
                action, resource, detail = random.choice(audit_actions)
                al = AuditLog(
                    organization_id=org.id, user_id=random.choice(admins + operators).id,
                    action=action, resource=resource, resource_id=t.id,
                    details={"summary": detail, "task": t.title},
                )
                session.add(al)
                audit_count += 1
            # Extra user-creation audits
            for u in all_users[:3]:
                al = AuditLog(
                    organization_id=org.id, user_id=admins[0].id,
                    action="POST", resource="users", resource_id=u.id,
                    details={"summary": "User onboarded", "email": users_info[0]["email"]},
                )
                session.add(al)
                audit_count += 1
            await session.flush()
        else:
            audit_count = 18
        print(f"  {G}✓{E} {audit_count} audit logs created")

        # ═══════════════════════════════════════════
        # PHASE 11: Notifications
        # ═══════════════════════════════════════════
        print(f"\n{B}Phase 11:{E} Notifications...")
        notif_count = 0
        if not dry_run:
            for t in tasks:
                template = random.choice(NOTIF_TEMPLATES)
                msg = template["msg"].format(task=t.title, prob=t.delay_prob or 0.5)
                target_user = random.choice(members) if template["type"] != "sla_breach" else operators[0]
                n = Notification(
                    organization_id=org.id, user_id=target_user.id,
                    type=template["type"], message=msg,
                    is_read=random.random() < 0.3,
                    related_entity_id=t.id,
                )
                session.add(n)
                notif_count += 1
            await session.flush()
        else:
            notif_count = 15
        print(f"  {G}✓{E} {notif_count} notifications created")

        # ═══════════════════════════════════════════
        # COMMIT
        # ═══════════════════════════════════════════
        if not dry_run:
            await session.commit()
            print(f"\n{G}{B}✅ All data committed to database!{E}")
            await verify_seed(session)
        else:
            print(f"\n{Y}{B}🔍 Dry run complete — no data written.{E}")

        print_credentials(users_info)

    await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description="WATOS Database Seeder")
    parser.add_argument("--reset", action="store_true", help="Wipe seed data and re-seed")
    parser.add_argument("--verify", action="store_true", help="Only verify existing seed data")
    parser.add_argument("--dry-run", action="store_true", help="Preview without DB writes")
    args = parser.parse_args()

    print(f"\n{B}{'═'*50}{E}")
    print(f"{B}{'🏗️  WATOS Advanced Database Seeder':^50}{E}")
    print(f"{B}{'═'*50}{E}\n")

    engine, SessionFactory = await get_engine_and_session()

    if args.verify:
        async with SessionFactory() as session:
            await verify_seed(session)
        await engine.dispose()
        return

    if args.reset:
        async with SessionFactory() as session:
            await reset_seed_data(session)
        await engine.dispose()
        engine, SessionFactory = await get_engine_and_session()

    await seed(dry_run=args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())
