from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.dependencies import require_role
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.organization import Organization

router = APIRouter()

@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    stmt = select(Organization).limit(1)
    if current_user.organization_id:
        stmt = select(Organization).where(Organization.id == current_user.organization_id)
        
    result = await db.execute(stmt)
    org = result.scalar_one_or_none()
    
    if not org:
        # Create a default org if none exists
        org = Organization(
            name="WATOS Default",
            slug="watos-default",
            require_mfa=False,
            allow_public_registration=True,
            allowed_domains="",
            max_users=100
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

    return {
        "name": org.name,
        "domain": org.allowed_domains,
        "require_mfa": org.require_mfa,
        "allow_public_registration": org.allow_public_registration,
        "max_users": org.max_users,
        "session_timeout_minutes": org.session_timeout_minutes
    }

@router.put("/settings")
async def update_settings(
    settings: Dict[str, Any], 
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    stmt = select(Organization).limit(1)
    if current_user.organization_id:
        stmt = select(Organization).where(Organization.id == current_user.organization_id)
        
    result = await db.execute(stmt)
    org = result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if "name" in settings:
        org.name = settings["name"]
    if "domain" in settings:
        org.allowed_domains = settings["domain"]
    if "require_mfa" in settings:
        org.require_mfa = settings["require_mfa"]
    if "allow_public_registration" in settings:
        org.allow_public_registration = settings["allow_public_registration"]
    if "max_users" in settings:
        org.max_users = settings["max_users"]
    if "session_timeout_minutes" in settings:
        org.session_timeout_minutes = settings["session_timeout_minutes"]
        
    await db.commit()
    await db.refresh(org)
    
    return {
        "name": org.name,
        "domain": org.allowed_domains,
        "require_mfa": org.require_mfa,
        "allow_public_registration": org.allow_public_registration,
        "max_users": org.max_users,
        "session_timeout_minutes": org.session_timeout_minutes
    }

@router.get("/audit-logs")
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    # Join with User to get email and filter by Org
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .where(AuditLog.organization_id == current_user.organization_id)
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    result = await db.execute(stmt)
    
    formatted_logs = []
    for log, user in result.all():
        formatted_logs.append({
            "id": str(log.id),
            "user_email": user.email if user else "system@watos.com",
            "action": log.action,
            "entity_type": log.resource,
            "entity_id": str(log.resource_id) if log.resource_id else None,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
        
    return formatted_logs
