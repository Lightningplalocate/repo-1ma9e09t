from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..models import Report, User
from ..permissions import Permission
from ..schemas import ReportSummary
from ..services import CRISIS_LABELS, visible_reports_query

router = APIRouter(prefix="/api/crisis", tags=["crisis"])


@router.get("/warnings", response_model=list[ReportSummary])
def warnings(
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.VIEW_CRISIS)),
):
    """危机预警：仅在此处可看到预警学员（中/高风险）的报告。

    仍受数据范围限制：管理员看全部，咨询师看所辖部门。
    """
    q = visible_reports_query(db, current).filter(
        Report.crisis_level.in_(["medium", "high"])
    )
    reports = q.order_by(Report.submitted_at.desc()).all()
    out = []
    for r in reports:
        out.append(
            ReportSummary(
                id=r.id,
                user_id=r.user_id,
                user_name=(r.user.full_name or r.user.username) if r.user else "",
                department_name=r.user.department.name
                if r.user and r.user.department
                else None,
                scale_name=r.scale.name if r.scale else "",
                report_type=r.report_type,
                total_score=r.total_score,
                crisis_level=r.crisis_level,
                submitted_at=r.submitted_at,
            )
        )
    return out


@router.get("/stats")
def stats(
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.VIEW_CRISIS)),
):
    q = visible_reports_query(db, current)
    counts = {"high": 0, "medium": 0, "low": 0, "none": 0}
    for r in q.all():
        counts[r.crisis_level] = counts.get(r.crisis_level, 0) + 1
    return {
        "counts": counts,
        "labels": CRISIS_LABELS,
    }
