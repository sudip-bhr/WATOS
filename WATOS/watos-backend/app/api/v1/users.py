from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone
import uuid
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Allow any authenticated user to update their own profile."""
    # Only allow safe self-editable fields
    safe_fields = {"full_name", "skills", "capacity_hours"}
    update_data = {
        k: v for k, v in payload.model_dump(exclude_unset=True).items()
        if k in safe_fields
    }
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    query = select(User).where(User.is_active == True, User.is_deleted == False)
    # Org-scope
    if current_user.organization_id:
        query = query.where(User.organization_id == current_user.organization_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("operator")),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("operator")),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Soft delete
    user.is_active = False
    user.is_deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    await db.commit()
