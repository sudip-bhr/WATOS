"""
Resource Leveling API.
Generate, review, and execute rebalancing proposals.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import require_role
from app.models.rebalance_proposal import RebalanceProposal

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class ProposalResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    task_title: Optional[str] = None
    from_user_id: uuid.UUID
    from_user_name: Optional[str] = None
    to_user_id: uuid.UUID
    to_user_name: Optional[str] = None
    reason: Optional[str] = None
    from_utilization_before: Optional[float] = None
    from_utilization_after: Optional[float] = None
    to_utilization_before: Optional[float] = None
    to_utilization_after: Optional[float] = None
    skill_match_score: Optional[float] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProposalAction(BaseModel):
    proposal_ids: List[uuid.UUID]
    action: str  # "approve" or "reject"


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/generate", response_model=List[ProposalResponse])
async def generate_proposals(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """Generate rebalancing proposals based on current workload distribution."""
    from app.services.leveling_engine import generate_rebalance_plan

    proposals = await generate_rebalance_plan(
        org_id=str(current_user.organization_id),
        db=db,
    )

    if not proposals:
        return []

    return proposals


@router.get("/proposals", response_model=List[ProposalResponse])
async def list_proposals(
    status: Optional[str] = "pending",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """List rebalancing proposals for the current organization."""
    query = (
        select(RebalanceProposal)
        .where(RebalanceProposal.organization_id == current_user.organization_id)
        .order_by(RebalanceProposal.created_at.desc())
    )
    if status:
        query = query.where(RebalanceProposal.status == status)

    result = await db.execute(query.limit(50))
    return result.scalars().all()


@router.post("/review")
async def review_proposals(
    data: ProposalAction,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """Approve or reject rebalancing proposals."""
    from datetime import timezone

    if data.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    updated = 0
    for pid in data.proposal_ids:
        result = await db.execute(
            select(RebalanceProposal).where(
                RebalanceProposal.id == pid,
                RebalanceProposal.organization_id == current_user.organization_id,
                RebalanceProposal.status == "pending",
            )
        )
        proposal = result.scalar_one_or_none()
        if proposal:
            proposal.status = "approved" if data.action == "approve" else "rejected"
            proposal.reviewed_by = current_user.id
            proposal.reviewed_at = datetime.now(timezone.utc)
            updated += 1

    await db.commit()
    return {"status": "ok", "updated": updated, "action": data.action}


@router.post("/execute")
async def execute_proposals(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    """Execute all approved proposals — reassign tasks."""
    # Get all approved proposals for this org
    result = await db.execute(
        select(RebalanceProposal).where(
            RebalanceProposal.organization_id == current_user.organization_id,
            RebalanceProposal.status == "approved",
        )
    )
    approved = result.scalars().all()
    proposal_ids = [p.id for p in approved]

    if not proposal_ids:
        return {"status": "ok", "executed": 0, "message": "No approved proposals to execute."}

    from app.services.leveling_engine import execute_approved_proposals
    executed = await execute_approved_proposals(
        proposal_ids=proposal_ids,
        reviewer_id=str(current_user.id),
        db=db,
    )

    return {"status": "ok", "executed": len(executed)}
