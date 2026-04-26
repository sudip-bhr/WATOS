import asyncio
from app.db.session import async_session_factory
from app.models.user import User
from sqlalchemy import select

async def check():
    async with async_session_factory() as session:
        res = await session.execute(select(User.email))
        emails = res.scalars().all()
        print(f"Total users: {len(emails)}")
        for email in emails:
            print(f"- {email}")

if __name__ == "__main__":
    asyncio.run(check())
