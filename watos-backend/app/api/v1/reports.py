from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.dependencies import require_role
from app.models.task import Task
from app.models.user import User
import io

router = APIRouter()


@router.get("/workload")
async def download_workload_report(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    from openpyxl import Workbook
    from app.services.workload_service import compute_utilization

    users_result = await db.execute(select(User).where(User.is_active == True, User.is_deleted == False))
    users = users_result.scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Workload Report"
    ws.append(["Name", "Email", "Role", "Capacity (hrs)", "Utilization %", "Active Tasks"])

    for user in users:
        tasks_result = await db.execute(
            select(Task).where(Task.assignee_id == user.id, Task.status != "done", Task.is_deleted == False)
        )
        tasks = tasks_result.scalars().all()
        util = compute_utilization(
            [{"effort_hours": t.effort_hours, "status": t.status} for t in tasks],
            user.capacity_hours,
        )
        ws.append([
            user.full_name or "", user.email, user.role,
            user.capacity_hours, f"{util * 100:.1f}%", len(tasks),
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=workload_report.xlsx"},
    )


@router.get("/performance")
async def download_performance_report(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors

    tasks_result = await db.execute(
        select(Task).where(Task.status == "done", Task.actual_hours != None, Task.is_deleted == False)
    )
    tasks = tasks_result.scalars().all()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = [Paragraph("WATOS Performance Report", styles["Title"])]

    table_data = [["Task", "Predicted Hrs", "Actual Hrs", "Delay Risk", "Status"]]
    for t in tasks:
        table_data.append([
            t.title[:40],
            f"{t.predicted_hours:.1f}" if t.predicted_hours else "N/A",
            f"{t.actual_hours:.1f}" if t.actual_hours else "N/A",
            f"{t.delay_prob*100:.0f}%" if t.delay_prob else "N/A",
            t.status,
        ])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
    ]))
    elements.append(table)
    doc.build(elements)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=performance_report.pdf"},
    )
