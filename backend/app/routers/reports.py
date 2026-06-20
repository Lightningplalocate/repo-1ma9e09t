from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Report, Scale, TaskAssignment, User
from ..schemas import ReportOut, ReportSummary, SubmissionIn
from ..services import (
    build_ai_analysis,
    can_view_report,
    score_submission,
    visible_reports_query,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _summary(db: Session, r: Report) -> ReportSummary:
    return ReportSummary(
        id=r.id,
        user_id=r.user_id,
        user_name=(r.user.full_name or r.user.username) if r.user else "",
        department_name=r.user.department.name if r.user and r.user.department else None,
        scale_name=r.scale.name if r.scale else "",
        report_type=r.report_type,
        total_score=r.total_score,
        crisis_level=r.crisis_level,
        submitted_at=r.submitted_at,
    )


@router.post("/submit", response_model=ReportOut)
def submit(
    payload: SubmissionIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    assignment = (
        db.query(TaskAssignment)
        .filter(TaskAssignment.id == payload.assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="测评任务不存在")
    if assignment.user_id != current.id:
        raise HTTPException(status_code=403, detail="不能提交他人的测评任务")

    scale = db.query(Scale).filter(Scale.id == assignment.task.scale_id).first()
    answer_map = {a.question_id: a.choice_index for a in payload.answers}
    result = score_submission(scale, answer_map)
    ai_text = build_ai_analysis(current.full_name or current.username, scale, result)

    report = Report(
        assignment_id=assignment.id,
        user_id=current.id,
        scale_id=scale.id,
        report_type="self",
        answers=result["answers"],
        factor_scores=result["factor_scores"],
        total_score=result["total_score"],
        crisis_level=result["crisis_level"],
        ai_analysis=ai_text,
    )
    db.add(report)
    assignment.status = "completed"
    assignment.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(report)
    return _full_report(db, report)


def _full_report(db: Session, r: Report) -> ReportOut:
    out = ReportOut.model_validate(r)
    out.user_name = (r.user.full_name or r.user.username) if r.user else ""
    out.department_name = r.user.department.name if r.user and r.user.department else None
    out.scale_name = r.scale.name if r.scale else ""
    return out


@router.get("", response_model=list[ReportSummary])
def list_reports(
    crisis_only: bool = False,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """报告管理：按当前用户权限返回可见报告列表。"""
    q = visible_reports_query(db, current)
    if crisis_only:
        q = q.filter(Report.crisis_level.in_(["medium", "high"]))
    reports = q.order_by(Report.submitted_at.desc()).all()
    return [_summary(db, r) for r in reports]


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    if not can_view_report(db, current, report):
        raise HTTPException(status_code=403, detail="没有权限查看该报告")
    return _full_report(db, report)
