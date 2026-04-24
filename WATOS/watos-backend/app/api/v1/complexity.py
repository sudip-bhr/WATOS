"""
Complexity Calibration API.
Provides endpoints for managing complexity anchors and detecting scoring drift.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.complexity_anchor import ComplexityAnchor

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class AnchorCreate(BaseModel):
    complexity_level: float = Field(..., ge=1.0, le=10.0)
    label: str = Field(..., max_length=100)
    description: Optional[str] = None
    example_task: Optional[str] = None
    typical_effort_hours: Optional[float] = None
    typical_duration_hours: Optional[float] = None


class AnchorResponse(BaseModel):
    id: uuid.UUID
    complexity_level: float
    label: str
    description: Optional[str] = None
    example_task: Optional[str] = None
    typical_effort_hours: Optional[float] = None
    typical_duration_hours: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplexitySuggestionRequest(BaseModel):
    project_id: str
    effort_hours: float = 8.0
    required_skills: Optional[List[str]] = None


class ComplexitySuggestionResponse(BaseModel):
    suggested_complexity: float
    confidence: str
    sample_size: int
    message: str
    range: Optional[dict] = None


# ── Anchor CRUD ───────────────────────────────────────────────────────

@router.get("/anchors", response_model=List[AnchorResponse])
async def list_anchors(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """List all complexity anchors for the current user's organization."""
    result = await db.execute(
        select(ComplexityAnchor)
        .where(ComplexityAnchor.organization_id == current_user.organization_id)
        .order_by(ComplexityAnchor.complexity_level)
    )
    return result.scalars().all()


@router.post("/anchors", response_model=AnchorResponse, status_code=201)
async def create_anchor(
    data: AnchorCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Create a new complexity reference anchor (admin only)."""
    anchor = ComplexityAnchor(
        organization_id=current_user.organization_id,
        complexity_level=data.complexity_level,
        label=data.label,
        description=data.description,
        example_task=data.example_task,
        typical_effort_hours=data.typical_effort_hours,
        typical_duration_hours=data.typical_duration_hours,
        created_by=current_user.id,
    )
    db.add(anchor)
    await db.commit()
    await db.refresh(anchor)
    return anchor


@router.delete("/anchors/{anchor_id}", status_code=204)
async def delete_anchor(
    anchor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Delete a complexity anchor."""
    result = await db.execute(
        select(ComplexityAnchor).where(
            ComplexityAnchor.id == anchor_id,
            ComplexityAnchor.organization_id == current_user.organization_id,
        )
    )
    anchor = result.scalar_one_or_none()
    if not anchor:
        raise HTTPException(status_code=404, detail="Anchor not found")
    await db.delete(anchor)
    await db.commit()


# ── Complexity Suggestion ─────────────────────────────────────────────

@router.post("/suggest", response_model=ComplexitySuggestionResponse)
async def suggest_complexity(
    data: ComplexitySuggestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """Get an ML-based complexity suggestion for a new task."""
    from app.services.complexity_service import suggest_complexity as _suggest
    result = await _suggest(
        project_id=data.project_id,
        effort_hours=data.effort_hours,
        required_skills=data.required_skills,
        db=db,
    )
    return ComplexitySuggestionResponse(**result)


# ── Drift Detection ──────────────────────────────────────────────────

@router.get("/drift")
async def get_scoring_drift(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """Detect complexity scoring drift across operators (admin only)."""
    from app.services.complexity_service import detect_scoring_drift
    return await detect_scoring_drift(str(current_user.organization_id), db)
