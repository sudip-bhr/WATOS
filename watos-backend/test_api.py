import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.services.analytics_service import get_skill_distribution

async def main():
    async with AsyncSessionLocal() as db:
        res = await get_skill_distribution(db)
        print("Skill Distribution:", res)

asyncio.run(main())
