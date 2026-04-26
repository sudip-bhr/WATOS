from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.task import Task, TaskDependency
import uuid


async def calculate_critical_path(project_id: uuid.UUID, db: AsyncSession):
    """
    Computes the critical path for a project using PERT methodology.
    """
    # 1. Fetch all tasks and dependencies
    tasks_res = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = {str(t.id): t for t in tasks_res.scalars().all()}
    
    if not tasks:
        return {"nodes": [], "edges": [], "critical_path": []}

    deps_res = await db.execute(
        select(TaskDependency).where(
            TaskDependency.blocker_task_id.in_(tasks.keys()),
            TaskDependency.blocked_task_id.in_(tasks.keys())
        )
    )
    dependencies = deps_res.scalars().all()

    # 2. Build adjacency list and in-degree
    adj = {t_id: [] for t_id in tasks.keys()}
    in_degree = {t_id: 0 for t_id in tasks.keys()}
    for dep in dependencies:
        blocker = str(dep.blocker_task_id)
        blocked = str(dep.blocked_task_id)
        adj[blocker].append(blocked)
        in_degree[blocked] += 1

    # 3. Forward Pass (Earliest Start/Finish)
    es = {t_id: 0.0 for t_id in tasks.keys()}
    ef = {t_id: (tasks[t_id].pert_estimate or tasks[t_id].effort_hours or 0.0) for t_id in tasks.keys()}
    
    queue = [t_id for t_id, deg in in_degree.items() if deg == 0]
    processed_count = 0
    topo_order = []

    while queue:
        u = queue.pop(0)
        topo_order.append(u)
        processed_count += 1
        for v in adj[u]:
            es[v] = max(es[v], ef[u])
            ef[v] = es[v] + (tasks[v].pert_estimate or tasks[v].effort_hours or 0.0)
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    # 4. Backward Pass (Latest Start/Finish)
    final_time = max(ef.values()) if ef else 0.0
    lf = {t_id: final_time for t_id in tasks.keys()}
    ls = {t_id: final_time - (tasks[t_id].pert_estimate or tasks[t_id].effort_hours or 0.0) for t_id in tasks.keys()}
    
    for u in reversed(topo_order):
        for v in adj[u]:
            lf[u] = min(lf[u], ls[v])
            ls[u] = lf[u] - (tasks[u].pert_estimate or tasks[u].effort_hours or 0.0)

    # 5. Identify Critical Path (Slack == 0)
    critical_path = [
        t_id for t_id in tasks.keys() 
        if abs(ls[t_id] - es[t_id]) < 0.01
    ]

    return {
        "nodes": [
            {
                "id": t_id,
                "title": tasks[t_id].title,
                "duration": tasks[t_id].pert_estimate or tasks[t_id].effort_hours,
                "es": es[t_id],
                "ef": ef[t_id],
                "ls": ls[t_id],
                "lf": lf[t_id],
                "is_critical": t_id in critical_path
            } for t_id in tasks.keys()
        ],
        "edges": [
            {"from": str(d.blocker_task_id), "to": str(d.blocked_task_id)}
            for d in dependencies
        ],
        "critical_path": critical_path,
        "total_duration": final_time
    }


async def get_skill_distribution(db: AsyncSession):
    """
    Analyzes required skills vs team capacity.
    """
    from app.models.user import User
    from sqlalchemy import func
    
    # 1. Total skill demand from active tasks
    tasks_res = await db.execute(select(Task.required_skills).where(Task.status != "done"))
    all_req_skills = []
    for row in tasks_res.fetchall():
        if row[0]: all_req_skills.extend(row[0])
    
    demand = {}
    for s in all_req_skills:
        demand[s] = demand.get(s, 0) + 1
        
    # 2. Team supply (User skills)
    users_res = await db.execute(select(User.skills).where(User.is_active == True))
    all_team_skills = []
    for row in users_res.fetchall():
        if row[0]: all_team_skills.extend(row[0])
        
    supply = {}
    for s in all_team_skills:
        supply[s] = supply.get(s, 0) + 1
        
    # Normalize for visualization
    all_skills = sorted(list(set(demand.keys()) | set(supply.keys())))
    return [
        {
            "subject": s,
            "demand": demand.get(s, 0),
            "supply": supply.get(s, 0),
            "fullMark": max(max(demand.values() or [0]), max(supply.values() or [0])) + 1
        } for s in all_skills
    ]
