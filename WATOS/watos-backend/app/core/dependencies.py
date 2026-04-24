from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import decode_access_token
from app.core.permissions import has_permission
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User
    payload = decode_access_token(token)
    result = await db.execute(
        select(User).where(User.id == payload["sub"], User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_role(*roles: str):
    """Legacy role-based check — kept for backwards compatibility."""
    def checker(user=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


def require_permission(permission: str):
    """Permission-based access control.

    Usage:
        current_user = Depends(require_permission("task:create"))
    """
    def checker(user=Depends(get_current_user)):
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission}",
            )
        return user
    return checker


def get_org_id(user=Depends(get_current_user)):
    """Extract and validate the organization_id from the current user.

    This is the OrgScopedQuery utility — use it as a dependency
    in any endpoint that needs tenant-scoped queries.

    Usage:
        org_id = Depends(get_org_id)
        query = select(Task).where(Task.organization_id == org_id)
    """
    org_id = user.organization_id
    if not org_id:
        raise HTTPException(
            status_code=400,
            detail="User is not associated with any organization",
        )
    return org_id
