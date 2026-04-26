import asyncio
from app.db.session import async_session_factory
from app.models.user import User

async def run():
    print("Test")

asyncio.run(run())
