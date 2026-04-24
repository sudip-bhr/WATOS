from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.subtask import Subtask
from app.models.task import Task
from app.schemas.subtask import SubtaskCreate, SubtaskUpdate, SubtaskResponse

router = APIRouter()


async def _get_parent_task(task_id: uuid.UUID, db: AsyncSession) -> Task:
    """Validate parent task exists and is not deleted."""
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.is_deleted == False)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Parent task not found")
    return task


@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=201)
async def create_subtask(
    task_id: uuid.UUID,
    payload: SubtaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_parent_task(task_id, db)
    subtask = Subtask(task_id=task_id, title=payload.title)
    db.add(subtask)
    await db.commit()
    await db.refresh(subtask)
    return subtask


@router.get("/{task_id}/subtasks", response_model=List[SubtaskResponse])
async def list_subtasks(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_parent_task(task_id, db)
    result = await db.execute(
        select(Subtask)
        .where(Subtask.task_id == task_id)
        .order_by(Subtask.created_at.asc())
    )
    return result.scalars().all()


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    task_id: uuid.UUID,
    subtask_id: uuid.UUID,
    payload: SubtaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)
    )
    subtask = result.scalar_one_or_none()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)
    await db.commit()
    await db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=204)
async def delete_subtask(
    task_id: uuid.UUID,
    subtask_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)
    )
    subtask = result.scalar_one_or_none()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    await db.delete(subtask)
    await db.commit()
