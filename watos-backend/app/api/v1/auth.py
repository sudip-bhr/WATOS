# Authentication API Routes
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.organization import Organization
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, AccessTokenResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_refresh_token
from app.core.logging import get_logger
from app.core.rate_limit import limiter
import re

router = APIRouter()
logger = get_logger("auth")


def _slugify(name: str) -> str:
    """Convert a name to a URL-friendly slug."""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug or "org"


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("3/minute")
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.role not in ("operator", "admin", "member"):
        raise HTTPException(status_code=400, detail="Invalid role")

    # Auto-create a personal organization for the user
    org_name = payload.org_name or f"{payload.full_name or payload.email.split('@')[0]}'s Workspace"
    base_slug = _slugify(org_name)

    # Ensure slug uniqueness
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Organization).where(Organization.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=org_name, slug=slug)
    db.add(org)
    await db.flush()  # Get org.id before creating user

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        organization_id=org.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("User registered", extra={"user_id": str(user.id), "org_id": str(org.id)})

    access = create_access_token(str(user.id), user.role)
    refresh = create_refresh_token(str(user.id))
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == payload.email, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access = create_access_token(str(user.id), user.role)
    refresh = create_refresh_token(str(user.id))
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    data = decode_refresh_token(payload.refresh_token)
    result = await db.execute(
        select(User).where(User.id == data["sub"], User.is_deleted == False)
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    access = create_access_token(str(user.id), user.role)
    return AccessTokenResponse(access_token=access)
