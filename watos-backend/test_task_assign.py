import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.workload import get_recommendations

class FakeUser:
    id = "1"
    role = "operator"
    organization_id = "00000000-0000-0000-0000-000000000001"

async def main():
    async with AsyncSessionLocal() as db:
        res = await get_recommendations(task_skills="React, Node.js", db=db, current_user=FakeUser())
        print("Task assignment candidates:")
        for r in res:
            print(f"- {r['full_name']} / score: {r['combined_score']}")

asyncio.run(main())
