import asyncio
import sys
from app.db.session import AsyncSessionLocal, engine
from app.ml.clustering import run_clustering_async
from app.workers.tasks import run_clustering_sync
from app.models.task import Task
from app.models.user import User
from app.models.project import Project
from app.models.organization import Organization
from sqlalchemy import select

async def run_async_test():
    print("\n=== Testing run_clustering_async ===")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Task).where(Task.is_deleted == False))
        tasks = result.scalars().all()
        if len(tasks) < 4:
            print(f"Not enough tasks in database ({len(tasks)} found, minimum 4 required).")
            return
            
        print("Initial state of tasks before clustering:")
        for t in tasks:
            print(f"  Task: {t.title} | cluster_id: {t.cluster_id}")
            
        print("Running run_clustering_async...")
        await run_clustering_async(db)
        
        # Re-fetch to verify
        result = await db.execute(select(Task).where(Task.is_deleted == False))
        tasks = result.scalars().all()
        print("State of tasks after run_clustering_async:")
        for t in tasks:
            print(f"  Task: {t.title} | cluster_id: {t.cluster_id}")
            
    await engine.dispose()

async def reset_cluster_ids():
    print("\nResetting all cluster_ids to None...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Task).where(Task.is_deleted == False))
        tasks = result.scalars().all()
        for t in tasks:
            t.cluster_id = None
        await db.commit()
    await engine.dispose()

async def verify_sync_results():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Task).where(Task.is_deleted == False))
        tasks = result.scalars().all()
        print("State of tasks after run_clustering_sync:")
        for t in tasks:
            print(f"  Task: {t.title} | cluster_id: {t.cluster_id}")
    await engine.dispose()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "async"
    
    if mode == "async":
        asyncio.run(run_async_test())
    elif mode == "reset":
        asyncio.run(reset_cluster_ids())
        print("Reset completed successfully.")
    elif mode == "run_sync":
        print("\n=== Running run_clustering_sync ===")
        run_clustering_sync()
        print("run_clustering_sync completed successfully.")
    elif mode == "verify":
        print("\n=== Verifying sync results ===")
        asyncio.run(verify_sync_results())
        print("Verification completed successfully.")
    else:
        print(f"Unknown mode: {mode}. Use 'async', 'reset', 'run_sync', or 'verify'.")
