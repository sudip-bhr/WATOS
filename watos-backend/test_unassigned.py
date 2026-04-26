import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User

async def main():
    async with AsyncSessionLocal() as db:
        users_q = await db.execute(select(User).where(User.role == "member", User.operator_id == None))
        users = users_q.scalars().all()
        print(f"Unassigned members: {len(users)}")
        
        op_q = await db.execute(select(User).where(User.role == "operator"))
        ops = op_q.scalars().all()
        print(f"Total operators: {len(ops)}")

asyncio.run(main())
