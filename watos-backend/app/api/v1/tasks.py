from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from datetime import datetime, timezone
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.task import Task, TaskDependency
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, DependencyCreate, DependencyResponse

router = APIRouter()


async def _run_ml_pipeline(task: Task, db: AsyncSession):
    """Run ML pipeline in background after task creation."""
    try:
        from app.services.ml_service import run_full_pipeline
        from sqlalchemy import select as sa_select
        result = await db.execute(
            sa_select(Task).where(Task.assignee_id == task.assignee_id, Task.status != "done")
        )
        active_tasks = result.scalars().all()
        total_effort = sum((t.effort_hours or 0) for t in active_tasks if t.id != task.id)
        assignee_workload = total_effort / 40.0  # assume 40h capacity

        task_data = {
            "complexity": task.complexity,
            "effort_hours": task.effort_hours or 8,
            "deadline": task.deadline or (datetime.now(timezone.utc)),
            "assignee_id": str(task.assignee_id) if task.assignee_id else None,
            "optimistic_hrs": task.optimistic_hrs or (task.effort_hours or 8) * 0.7,
            "most_likely_hrs": task.most_likely_hrs or (task.effort_hours or 8),
            "pessimistic_hrs": task.pessimistic_hrs or (task.effort_hours or 8) * 1.5,
        }
        results = await run_full_pipeline(task_data, assignee_workload, db)

        task.predicted_hours = results.get("predicted_hours")
        task.delay_prob = results.get("delay_prob")
        task.pert_estimate = results.get("pert_estimate")
        task.pert_std_dev = results.get("pert_std_dev")
        task.priority_score = results.get("priority_score")
        task.shap_explanation = results.get("shap_explanation")
        await db.commit()

        # Trigger notification if high delay risk
        if task.delay_prob and task.delay_prob > 0.7:
            from app.services.notification_service import create_notification
            await create_notification(
                db=db,
                user_id=str(task.assignee_id) if task.assignee_id else None,
                notif_type="delay_risk",
                message=f"Task '{task.title}' has a high delay risk ({task.delay_prob*100:.0f}%).",
            )
    except Exception as e:
        print(f"ML pipeline error for task {task.id}: {e}")


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    payload: TaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    # Validate assignee
    if payload.assignee_id:
        res = await db.execute(select(User).where(User.id == payload.assignee_id))
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Assignee not found")

    task = Task(
        **payload.model_dump(exclude_unset=True),
        created_by=current_user.id,
        organization_id=current_user.organization_id,
    )

    # Auto-assign if no assignee specified but skills are provided
    if not task.assignee_id and task.required_skills:
        try:
            from app.services.auto_assignment_service import auto_assign
            assignment = await auto_assign(
                task_skills=task.required_skills,
                org_id=str(current_user.organization_id),
                db=db,
            )
            if assignment["auto_assigned"] and assignment["recommended"]:
                import uuid as _uuid
                task.assignee_id = _uuid.UUID(assignment["recommended"]["user_id"])
        except Exception:
            pass  # Graceful fallback — task created unassigned

    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Run ML pipeline as background task
    background_tasks.add_task(_run_ml_pipeline, task, db)
    return task


@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    status: str = None,
    project_id: uuid.UUID = None,
):
    query = select(Task).where(Task.is_deleted == False)
    # Org-scope
    if current_user.organization_id:
        query = query.where(Task.organization_id == current_user.organization_id)
    # Operators only see tasks assigned to their team members
    if current_user.role == "operator":
        from sqlalchemy import select as sa_select
        team_ids_q = sa_select(User.id).where(User.operator_id == current_user.id)
        query = query.where(Task.assignee_id.in_(team_ids_q))
    
    # Members only see their own tasks
    elif current_user.role == "member":
        query = query.where(Task.assignee_id == current_user.id)
    if status:
        query = query.where(Task.status == status)
    if project_id:
        query = query.where(Task.project_id == project_id)
    result = await db.execute(query.order_by(Task.created_at.desc()))
    return result.scalars().all()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.is_deleted == False)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "member" and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)

    # --- Feature 3: Task Review Workflow Enforcement ---
    if payload.status and payload.status != task.status:
        MEMBER_ALLOWED = {
            "todo": ["in_progress"],
            "in_progress": ["review"],
            "rejected": ["in_progress"],
        }
        OPERATOR_ALLOWED = {
            **MEMBER_ALLOWED,
            "review": ["approved", "rejected"],
            "approved": ["done"],
        }
        
        if current_user.role == "member":
            allowed = MEMBER_ALLOWED.get(task.status, [])
            if payload.status not in allowed:
                raise HTTPException(status_code=403, detail=f"Members cannot move tasks from '{task.status}' to '{payload.status}'")
        elif current_user.role == "operator":
            allowed = OPERATOR_ALLOWED.get(task.status, [])
            if payload.status not in allowed:
                raise HTTPException(status_code=403, detail="Invalid transition for operator")

        # Handle review submission
        if payload.status == "review":
            # Notify the operator responsible for this member
            member = await db.get(User, task.assignee_id)
            if member and member.operator_id:
                from app.services.notification_service import create_notification
                await create_notification(
                    db=db,
                    user_id=str(member.operator_id),
                    notif_type="task_review",
                    message=f"Task '{task.title}' has been submitted for review by {member.full_name or member.email}.",
                    action_url="/operator/board"
                )

        # Handle rejection
        if payload.status == "rejected":
            if not payload.rejection_note:
                raise HTTPException(status_code=400, detail="rejection_note is required when rejecting a task")
            task.rejection_note = payload.rejection_note
            task.reviewed_by = current_user.id
            task.reviewed_at = datetime.now(timezone.utc)
            # Notify assignee
            from app.services.notification_service import create_notification
            await create_notification(
                db=db,
                user_id=str(task.assignee_id),
                notif_type="task_rejected",
                message=f"Task '{task.title}' needs revision: {payload.rejection_note}",
                action_url="/member/board" # Frontend redirects to member/tasks
            )

        # Handle approval
        if payload.status == "approved":
            task.reviewed_by = current_user.id
            task.reviewed_at = datetime.now(timezone.utc)
            task.completed_at = datetime.now(timezone.utc)
            # Auto-set to done
            task.status = "done"
            from app.services.notification_service import create_notification
            await create_notification(
                db=db,
                user_id=str(task.assignee_id),
                notif_type="task_approved",
                message=f"Task '{task.title}' has been approved. Well done.",
                action_url="/member/board"
            )
            # Skip setting status to 'approved' in the setattr loop
            update_data.pop("status", None)

    for field, value in update_data.items():
        setattr(task, field, value)

    # Mark completion time (Fallback for direct done setting by admin)
    if payload.status == "done" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
        
        # Calculate features for training
        d_deadline = task.deadline or task.created_at
        days_to_deadline = (d_deadline - task.created_at).days
        
        # Record to task_history for ML training
        if task.assignee_id:
            from app.models.task_history import TaskHistory
            from app.services.workload_service import compute_utilization
            
            # Get current workload of the assignee
            workload_res = await db.execute(
                select(Task).where(Task.assignee_id == task.assignee_id, Task.status != "done")
            )
            assignee_tasks = [{"effort_hours": t.effort_hours, "status": t.status} for t in workload_res.scalars().all()]
            utilization = compute_utilization(assignee_tasks, 40.0) # base 40h

            history = TaskHistory(
                task_id=task.id,
                user_id=task.assignee_id,
                was_delayed=(task.completed_at > task.deadline) if task.deadline else False,
                predicted_hours=task.predicted_hours or (task.effort_hours or 0.0),
                actual_hours=task.actual_hours or (task.effort_hours or 0.0),
                complexity=task.complexity or 1.0,
                effort_hours=task.effort_hours or 0.0,
                priority_score=task.priority_score or 0.5,
                days_to_deadline=days_to_deadline,
                assignee_workload=utilization,
            )
            db.add(history)

            # Trigger Incremental learning (Partial Fit)
            try:
                from app.ml.incremental import partial_fit_duration
                partial_fit_duration({
                    "complexity": task.complexity or 1.0,
                    "effort_hours": task.effort_hours or 8.0,
                    "completion_rate": 0.8,
                    "days_to_deadline": days_to_deadline,
                    "workload_at_assignment": utilization,
                    "actual_hours": task.actual_hours or (task.effort_hours or 8.0),
                })
                
                # Full retraining trigger every 10 tasks
                from app.models.task_history import TaskHistory
                from sqlalchemy import func
                count_res = await db.execute(select(func.count()).select_from(TaskHistory))
                total_completed = count_res.scalar() or 0
                
                if total_completed > 0 and total_completed % 10 == 0:
                    from app.workers.tasks import retrain_models
                    retrain_models.delay(triggered_by_user_id=str(current_user.id))
                    
            except Exception as e:
                print(f"ML Pipeline trigger error: {e}")

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "operator")),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.is_deleted == False)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Soft delete
    task.is_deleted = True
    task.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/{task_id}/dependencies", response_model=DependencyResponse, status_code=201)
async def add_dependency(
    task_id: uuid.UUID,
    payload: DependencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    if payload.blocker_task_id == payload.blocked_task_id:
        raise HTTPException(status_code=400, detail="A task cannot depend on itself")
    dep = TaskDependency(
        blocker_task_id=payload.blocker_task_id,
        blocked_task_id=payload.blocked_task_id,
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return dep


@router.delete("/{task_id}/dependencies/{dep_id}", status_code=204)
async def remove_dependency(
    task_id: uuid.UUID,
    dep_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    result = await db.execute(select(TaskDependency).where(TaskDependency.id == dep_id))
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")
    await db.delete(dep)
    await db.commit()
