from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict
import uuid
from app.db.session import get_db
from app.core.dependencies import require_role
from app.services.analytics_service import calculate_critical_path, get_skill_distribution

router = APIRouter()


@router.get("/pert")
@router.get("/pert/{project_id}")
async def get_pert_chart(
    project_id: uuid.UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    if not project_id:
        # For mock/demo purposes, fetch first project if no ID provided
        from app.models.project import Project
        result = await db.execute(select(Project).limit(1))
        project = result.scalar_one_or_none()
        if not project:
            return {"nodes": [], "edges": []}
        project_id = project.id

    return await calculate_critical_path(project_id, db)


@router.get("/skills-gap")
async def get_skills_analytics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """Returns skill supply vs demand analytics."""
    return await get_skill_distribution(db)
