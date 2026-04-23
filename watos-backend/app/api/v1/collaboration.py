from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
import uuid
import os
import shutil
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.task import Task
from app.models.user import User
from app.models.comment import Comment
from app.models.attachment import Attachment
from app.models.task_watcher import TaskWatcher
from app.schemas.collaboration import CommentCreate, CommentResponse, AttachmentResponse, WatcherResponse
from app.services.notification_service import create_notification

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def _get_parent_task(task_id: uuid.UUID, db: AsyncSession) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.is_deleted == False)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Parent task not found")
    return task

async def _notify_watchers(task_id: uuid.UUID, exclude_user_id: uuid.UUID, db: AsyncSession, message: str, notif_type: str = "comment"):
    result = await db.execute(select(TaskWatcher).where(TaskWatcher.task_id == task_id))
    watchers = result.scalars().all()
    for watcher in watchers:
        if watcher.user_id != exclude_user_id:
            await create_notification(db, str(watcher.user_id), notif_type, message)

# --- COMMENTS ---

@router.post("/{task_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment(
    task_id: uuid.UUID,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task = await _get_parent_task(task_id, db)
    
    comment = Comment(
        task_id=task_id,
        user_id=current_user.id,
        content=payload.content
    )
    db.add(comment)
    
    # Auto-watch task when commenting
    existing_watcher = await db.execute(
        select(TaskWatcher).where(TaskWatcher.task_id == task_id, TaskWatcher.user_id == current_user.id)
    )
    if not existing_watcher.scalar_one_or_none():
        db.add(TaskWatcher(task_id=task_id, user_id=current_user.id))

    await db.commit()
    await db.refresh(comment)

    # Notify other watchers
    await _notify_watchers(
        task_id, 
        current_user.id, 
        db, 
        f"New comment on task '{task.title}' by {current_user.full_name or current_user.email}"
    )

    response = CommentResponse.model_validate(comment)
    response.author_name = current_user.full_name
    response.author_email = current_user.email
    return response

@router.get("/{task_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_parent_task(task_id, db)
    result = await db.execute(
        select(Comment, User)
        .outerjoin(User, Comment.user_id == User.id)
        .where(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
    )
    
    comments = []
    for comment, user in result.all():
        resp = CommentResponse.model_validate(comment)
        if user:
            resp.author_name = user.full_name
            resp.author_email = user.email
        comments.append(resp)
    return comments

# --- ATTACHMENTS ---

def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"

@router.post("/{task_id}/attachments", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    task_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task = await _get_parent_task(task_id, db)
    
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(8192):
            buffer.write(chunk)
            file_size += len(chunk)
            
    # Normally you'd upload to S3/GCS here and get a public URL.
    # We simulate it with a local relative URL for this example.
    file_url = f"/uploads/{unique_filename}"
    
    attachment = Attachment(
        task_id=task_id,
        file_url=file_url,
        file_name=file.filename,
        file_size=format_size(file_size),
        uploaded_by=current_user.id
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    
    await _notify_watchers(
        task_id, 
        current_user.id, 
        db, 
        f"New attachment added to task '{task.title}' by {current_user.full_name or current_user.email}"
    )
    
    return attachment

@router.get("/{task_id}/attachments", response_model=List[AttachmentResponse])
async def list_attachments(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_parent_task(task_id, db)
    result = await db.execute(
        select(Attachment).where(Attachment.task_id == task_id).order_by(Attachment.created_at.desc())
    )
    return result.scalars().all()

# --- WATCHERS ---

@router.post("/{task_id}/watch", response_model=WatcherResponse, status_code=201)
async def watch_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_parent_task(task_id, db)
    
    existing = await db.execute(
        select(TaskWatcher).where(TaskWatcher.task_id == task_id, TaskWatcher.user_id == current_user.id)
    )
    watcher = existing.scalar_one_or_none()
    if not watcher:
        watcher = TaskWatcher(task_id=task_id, user_id=current_user.id)
        db.add(watcher)
        await db.commit()
        await db.refresh(watcher)
    return watcher

@router.delete("/{task_id}/watch", status_code=204)
async def unwatch_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(TaskWatcher).where(TaskWatcher.task_id == task_id, TaskWatcher.user_id == current_user.id)
    )
    watcher = result.scalar_one_or_none()
    if watcher:
        await db.delete(watcher)
        await db.commit()
