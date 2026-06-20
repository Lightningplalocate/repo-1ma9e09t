from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Department, Report, TaskAssignment, User
from ..permissions import Role
from ..schemas import ReportSummary
from ..services import descendant_department_ids, visible_reports_query

router = APIRouter(prefix="/api/overview", tags=["overview"])


@router.get("/summary")
def summary(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
):
    """数据总览（合并原“日常检测”）：核心指标 + 风险分布。"""
    reports = visible_reports_query(db, current).all()
    crisis_counts = {"high": 0, "medium": 0, "low": 0, "none": 0}
    for r in reports:
        crisis_counts[r.crisis_level] = crisis_counts.get(r.crisis_level, 0) + 1

    total_users = db.query(User).filter(
        User.role == Role.STUDENT.value, User.is_active == True
    ).count()
    total_assignments = db.query(TaskAssignment).count()
    completed = db.query(TaskAssignment).filter(
        TaskAssignment.status == "completed"
    ).count()
    return {
        "total_students": total_users,
        "total_reports": len(reports),
        "total_assignments": total_assignments,
        "completed_assignments": completed,
        "completion_rate": round(completed / total_assignments * 100, 1)
        if total_assignments
        else 0,
        "crisis_counts": crisis_counts,
    }


@router.get("/departments")
def department_distribution(
    parent_id: int | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """按部门查看数据分布；parent_id 为空时返回顶层部门，支持逐级下钻。"""
    depts = db.query(Department).filter(Department.parent_id == parent_id).all()
    visible_ids = {r.user_id for r in visible_reports_query(db, current).all()}

    rows = []
    for d in depts:
        sub_ids = descendant_department_ids(db, d.id)
        student_count = (
            db.query(User)
            .filter(
                User.department_id.in_(sub_ids),
                User.role == Role.STUDENT.value,
                User.is_active == True,
            )
            .count()
        )
        sub_reports = (
            db.query(Report)
            .join(User, Report.user_id == User.id)
            .filter(User.department_id.in_(sub_ids))
            .all()
        )
        sub_reports = [r for r in sub_reports if r.user_id in visible_ids]
        crisis = sum(1 for r in sub_reports if r.crisis_level in ("medium", "high"))
        avg_score = (
            round(sum(r.total_score for r in sub_reports) / len(sub_reports), 1)
            if sub_reports
            else 0
        )
        rows.append(
            {
                "department_id": d.id,
                "name": d.name,
                "node_type": d.node_type,
                "has_children": db.query(Department)
                .filter(Department.parent_id == d.id)
                .count()
                > 0,
                "student_count": student_count,
                "report_count": len(sub_reports),
                "crisis_count": crisis,
                "avg_score": avg_score,
            }
        )
    return rows


@router.get("/department/{dept_id}/members")
def department_members(
    dept_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """下钻到部门内的个人：每位学员最近一次测评概况，可继续点入个人报告。"""
    sub_ids = descendant_department_ids(db, dept_id)
    students = (
        db.query(User)
        .filter(
            User.department_id.in_(sub_ids),
            User.role == Role.STUDENT.value,
            User.is_active == True,
        )
        .all()
    )
    visible_ids = {r.user_id for r in visible_reports_query(db, current).all()}
    rows = []
    for s in students:
        latest = (
            db.query(Report)
            .filter(Report.user_id == s.id)
            .order_by(Report.submitted_at.desc())
            .first()
        )
        rows.append(
            {
                "user_id": s.id,
                "name": s.full_name or s.username,
                "department_name": s.department.name if s.department else None,
                "latest_report_id": latest.id
                if latest and s.id in visible_ids
                else None,
                "latest_scale": latest.scale.name if latest else None,
                "latest_score": latest.total_score if latest else None,
                "crisis_level": latest.crisis_level if latest else "none",
                "submitted_at": latest.submitted_at if latest else None,
            }
        )
    return rows


@router.get("/trend")
def trend(
    days: int = 30,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """近 N 天测评提交量与预警量趋势，供折线图使用。"""
    start = datetime.utcnow() - timedelta(days=days)
    reports = [
        r
        for r in visible_reports_query(db, current).all()
        if r.submitted_at and r.submitted_at >= start
    ]
    by_day = defaultdict(lambda: {"submitted": 0, "crisis": 0})
    for r in reports:
        key = r.submitted_at.strftime("%Y-%m-%d")
        by_day[key]["submitted"] += 1
        if r.crisis_level in ("medium", "high"):
            by_day[key]["crisis"] += 1
    series = [
        {"date": k, "submitted": v["submitted"], "crisis": v["crisis"]}
        for k, v in sorted(by_day.items())
    ]
    return series
