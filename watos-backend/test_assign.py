import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.workload import get_recommendations

class FakeUser:
    id = "1"
    role = "operator"

async def main():
    async with AsyncSessionLocal() as db:
        res = await get_recommendations(task_skills="React, Node.js", db=db, current_user=FakeUser())
        for r in res:
            print(f"- {r.full_name} / score: {r.combined_score} / reason: {r.reason}")

asyncio.run(main())
