import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.task import Task
from app.services.workload_service import compute_utilization

async def main():
    async with AsyncSessionLocal() as db:
        admin_query = select(User).where(User.role == "admin").limit(1)
        admin = (await db.execute(admin_query)).scalar_one_or_none()
        
        if not admin:
            print("No admin found")
            return
            
        op_query = select(User).where(
            User.role == "operator",
            User.organization_id == admin.organization_id,
            User.is_active == True,
            User.is_deleted == False
        )
        operators = (await db.execute(op_query)).scalars().all()
        
        print("Operators:")
        for op in operators:
            team_query = select(User).where(User.operator_id == op.id, User.is_deleted == False)
            team = (await db.execute(team_query)).scalars().all()
            print(f"- {op.full_name or op.email}: team size {len(team)}")
            
            team_ids = [u.id for u in team]
            if team_ids:
                task_query = select(Task).where(
                    Task.assignee_id.in_(team_ids), 
                    Task.status != "done", 
                    Task.is_deleted == False
                )
                active_tasks = (await db.execute(task_query)).scalars().all()
                total_capacity = sum(u.capacity_hours or 40.0 for u in team)
                if total_capacity > 0:
                    tasks_dict = [{"effort_hours": t.effort_hours, "status": t.status} for t in active_tasks]
                    util = compute_utilization(tasks_dict, total_capacity)
                    print(f"  utilization: {util}, tasks: {len(tasks_dict)}")

asyncio.run(main())
