import asyncio
from app.db.session import AsyncSessionLocal
from app.api.v1.analytics import get_member_performance

class FakeUser:
    id = "1"
    role = "admin"

async def main():
    async with AsyncSessionLocal() as db:
        res = await get_member_performance(db=db, current_user=FakeUser())
        for r in res:
            print(f"{r['full_name']}: total={r['total_tasks']} done={r['done_count']} comp_rate={r['completion_rate']} on_time={r['on_time_rate']} avg_ratio={r['avg_time_ratio']} trend={r['weekly_trend']}")

asyncio.run(main())
