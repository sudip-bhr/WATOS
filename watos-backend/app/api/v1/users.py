from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


# ── Request schemas ──────────────────────────────────────────────────────────

class AssignMemberRequest(BaseModel):
    operator_id: uuid.UUID


# ── Me endpoints ─────────────────────────────────────────────────────────────

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


# ── Unassigned members (admin only) ─────────────────────────────────────────

@router.get("/unassigned", response_model=List[UserResponse])
async def list_unassigned_members(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Return members with no operator assignment — shown in admin's assignment queue."""
    query = select(User).where(
        User.role == "member",
        User.operator_id == None,  # noqa: E711
        User.is_active == True,
        User.is_deleted == False,
        User.organization_id == current_user.organization_id,
    )
    result = await db.execute(query.order_by(User.created_at.desc()))
    return result.scalars().all()


# ── List all users (scoped by role) ─────────────────────────────────────────

@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    query = select(User).where(User.is_active == True, User.is_deleted == False)

    if current_user.organization_id:
        query = query.where(User.organization_id == current_user.organization_id)

    # Operators only see members assigned to them
    if current_user.role == "operator":
        query = query.where(
            User.role == "member",
            User.operator_id == current_user.id,
        )

    result = await db.execute(query.order_by(User.created_at.desc()))
    return result.scalars().all()


# ── Assign member to operator (admin only) ───────────────────────────────────

@router.post("/{member_id}/assign", response_model=UserResponse)
async def assign_member_to_operator(
    member_id: uuid.UUID,
    payload: AssignMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Admin assigns an unassigned (or reassigns an already-assigned) member to an operator."""
    # Validate member
    member_result = await db.execute(
        select(User).where(
            User.id == member_id,
            User.is_deleted == False,
            User.organization_id == current_user.organization_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role != "member":
        raise HTTPException(status_code=400, detail="Only members can be assigned to operators")

    # Validate operator
    operator_result = await db.execute(
        select(User).where(
            User.id == payload.operator_id,
            User.role == "operator",
            User.is_active == True,
            User.is_deleted == False,
            User.organization_id == current_user.organization_id,
        )
    )
    operator = operator_result.scalar_one_or_none()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    # Perform assignment
    member.operator_id = payload.operator_id
    member.assigned_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(member)

    # Notify operator
    try:
        from app.services.notification_service import create_notification
        await create_notification(
            db=db,
            user_id=str(operator.id),
            notif_type="member_assigned",
            message=f"Member {member.full_name or member.email} has been assigned to your team.",
            action_url="/operator/users",
            related_entity_id=member.id,
        )
        # Notify member
        await create_notification(
            db=db,
            user_id=str(member.id),
            notif_type="member_assigned",
            message=f"You have been assigned to {operator.full_name or operator.email}'s team.",
            action_url="/member",
        )
    except Exception:
        pass  # Assignment succeeded; notification failure is non-blocking

    return member


# ── Update user (operator or admin) ─────────────────────────────────────────

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Operators can only update their own assigned members
    if current_user.role == "operator":
        if user.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update members assigned to you")
        # Operators cannot change roles or operator assignment
        payload_data = payload.model_dump(exclude_unset=True)
        for restricted in ("role", "operator_id"):
            payload_data.pop(restricted, None)
        for field, value in payload_data.items():
            setattr(user, field, value)
    else:
        # Admin can update anything
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


# ── Soft-delete user ─────────────────────────────────────────────────────────

@router.delete("/{user_id}", status_code=204)
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Operators can only deactivate their own members
    if current_user.role == "operator" and user.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only deactivate members assigned to you")

    user.is_active = False
    user.is_deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    await db.commit()
