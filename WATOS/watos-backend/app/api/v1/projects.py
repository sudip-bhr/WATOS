from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone
import uuid
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.project import Project
from app.models.task import Task
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    project = Project(
        **payload.model_dump(exclude_unset=True),
        admin_id=current_user.id,
        organization_id=current_user.organization_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Project).where(Project.is_deleted == False)
    if current_user.organization_id:
        query = query.where(Project.organization_id == current_user.organization_id)
    result = await db.execute(query.order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_deleted == False)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_deleted == False)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_deleted == False)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Soft delete
    project.is_deleted = True
    project.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/{project_id}/tasks")
async def get_project_tasks(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return tasks + summary stats for a project."""
    result = await db.execute(
        select(Task).where(
            Task.project_id == project_id,
            Task.is_deleted == False,
        )
    )
    tasks = result.scalars().all()
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == "done")
    return {
        "tasks": tasks,
        "summary": {
            "total": total,
            "done": done,
            "completion_pct": round((done / total * 100) if total else 0, 1),
            "avg_delay_prob": round(
                sum(t.delay_prob or 0 for t in tasks) / total if total else 0, 2
            ),
        },
    }
