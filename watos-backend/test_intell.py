import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.intelligence import suggest_operator
from sqlalchemy import select
from app.models.user import User

class FakeUser:
    id = "1"
    role = "admin"
    organization_id = "00000000-0000-0000-0000-000000000001"

async def main():
    async with AsyncSessionLocal() as db:
        member_q = await db.execute(select(User).where(User.role == "member", User.operator_id == None).limit(1))
        member = member_q.scalar_one_or_none()
        if not member:
            print("No unassigned member found")
            return
            
        admin_q = await db.execute(select(User).where(User.role == "admin").limit(1))
        admin = admin_q.scalar_one_or_none()
        
        try:
            res = await suggest_operator(member_id=member.id, db=db, current_user=admin)
            print("Suggestion:")
            for cand in res["candidates"]:
                print(f" - {cand['full_name']} / score: {cand['combined_score']} / team size: {cand['team_size']} / util: {cand['team_utilization']} / reason: {cand['reason']}")
        except Exception as e:
            print("Error:", e)

asyncio.run(main())
