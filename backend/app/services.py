"""Domain services: scoring, crisis evaluation, AI narrative, report visibility."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from .models import Appointment, Department, Report, Scale, User
from .permissions import Permission, Role

# 咨询预约时间段：每天上午两段、下午两段
SLOT_LABELS = {
    "am1": "上午 08:00-09:00",
    "am2": "上午 10:00-11:00",
    "pm1": "下午 14:00-15:00",
    "pm2": "下午 15:00-16:00",
}
SLOT_START = {"am1": (8, 0), "am2": (10, 0), "pm1": (14, 0), "pm2": (15, 0)}
SLOT_END = {"am1": (9, 0), "am2": (11, 0), "pm1": (15, 0), "pm2": (16, 0)}


def slot_start_dt(date_str: str, slot: str) -> Optional[datetime]:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None
    h, m = SLOT_START.get(slot, (0, 0))
    return d.replace(hour=h, minute=m)


def slot_end_dt(date_str: str, slot: str) -> Optional[datetime]:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None
    h, m = SLOT_END.get(slot, (0, 0))
    return d.replace(hour=h, minute=m)


def appointment_display_status(appt: Appointment) -> str:
    """计算预约的展示状态（含超时未确认自动判为未成功）。"""
    if appt.status == "cancelled":
        return "预约未成功"
    if appt.status == "confirmed":
        return "团体预约成功" if appt.is_group else "预约成功"
    # pending：超过咨询时间仍未确认 -> 预约未成功
    end = slot_end_dt(appt.date, appt.slot)
    if end and datetime.now() > end:
        return "预约未成功"
    return "预约中"


def can_manage_user(db: Session, current: User, target: User) -> bool:
    """管理员可管理所有人；咨询师可管理其所辖部门下的学员。"""
    if current.role == Role.ADMIN.value or Permission.MANAGE_USERS.value in (
        current.permissions or []
    ):
        return True
    if current.role == Role.COUNSELOR.value and target.role == Role.STUDENT.value:
        if current.department_id and target.department_id:
            return target.department_id in descendant_department_ids(
                db, current.department_id
            )
    return False

CRISIS_ORDER = {"none": 0, "low": 1, "medium": 2, "high": 3}
CRISIS_LABELS = {
    "none": "正常",
    "low": "轻度关注",
    "medium": "中度预警",
    "high": "高度预警",
}


def descendant_department_ids(db: Session, root_id: int) -> List[int]:
    """Return root + all descendant department ids (BFS over the tree)."""
    ids = [root_id]
    frontier = [root_id]
    while frontier:
        children = (
            db.query(Department.id)
            .filter(Department.parent_id.in_(frontier))
            .all()
        )
        child_ids = [c.id for c in children]
        child_ids = [c for c in child_ids if c not in ids]
        ids.extend(child_ids)
        frontier = child_ids
    return ids


def score_submission(scale: Scale, answer_map: dict) -> dict:
    """Compute per-question detail, factor scores, total and crisis level.

    answer_map: {question_id: choice_index}
    """
    detailed_answers = []
    factor_totals: dict = {}
    factor_counts: dict = {}
    total = 0.0

    factor_names = {f["key"]: f.get("name", f["key"]) for f in (scale.factors or [])}

    for q in scale.questions:
        choice_index = answer_map.get(q.id)
        if choice_index is None or choice_index >= len(q.options or []):
            score = 0.0
            label = ""
        else:
            opt = q.options[choice_index]
            score = float(opt.get("score", 0))
            label = opt.get("label", "")
        total += score
        detailed_answers.append(
            {
                "question_id": q.id,
                "order": q.order,
                "text": q.text,
                "factor": q.factor,
                "factor_name": factor_names.get(q.factor, q.factor),
                "choice_label": label,
                "score": score,
            }
        )
        if q.factor:
            factor_totals[q.factor] = factor_totals.get(q.factor, 0.0) + score
            factor_counts[q.factor] = factor_counts.get(q.factor, 0) + 1

    factor_scores = []
    for key, total_score in factor_totals.items():
        count = factor_counts.get(key, 1)
        factor_scores.append(
            {
                "key": key,
                "name": factor_names.get(key, key),
                "score": round(total_score / count, 2),  # 因子均分
                "sum": round(total_score, 2),
                "items": count,
            }
        )

    crisis_level = evaluate_crisis(scale, factor_scores)
    return {
        "answers": detailed_answers,
        "factor_scores": factor_scores,
        "total_score": round(total, 2),
        "crisis_level": crisis_level,
    }


def evaluate_crisis(scale: Scale, factor_scores: List[dict]) -> str:
    score_by_factor = {f["key"]: f["score"] for f in factor_scores}
    level = "none"
    for rule in scale.crisis_rules or []:
        fk = rule.get("factor")
        if fk not in score_by_factor:
            continue
        value = score_by_factor[fk]
        threshold = float(rule.get("threshold", 0))
        op = rule.get("op", ">=")
        hit = (
            (op == ">=" and value >= threshold)
            or (op == ">" and value > threshold)
            or (op == "<=" and value <= threshold)
            or (op == "<" and value < threshold)
            or (op == "==" and value == threshold)
        )
        if hit:
            rule_level = rule.get("level", "low")
            if CRISIS_ORDER.get(rule_level, 0) > CRISIS_ORDER.get(level, 0):
                level = rule_level
    return level


def build_ai_analysis(
    user_name: str, scale: Scale, result: dict
) -> str:
    """Generate a third-person ("此来访者") narrative analysis.

    The narrative deliberately avoids second-person ("你") per requirement #6.
    """
    factor_scores = sorted(
        result["factor_scores"], key=lambda f: f["score"], reverse=True
    )
    subject = "此来访者"
    lines = [
        f"【AI 分析】（仅供参考，可隐藏 / 不打印）",
        f"{subject}在《{scale.name}》中的总分为 {result['total_score']}，"
        f"整体风险等级为「{CRISIS_LABELS.get(result['crisis_level'], '正常')}」。",
    ]
    if factor_scores:
        top = factor_scores[0]
        lines.append(
            f"在各因子中，{subject}于「{top['name']}」维度得分最高（均分 {top['score']}），"
            f"提示该来访者在此维度上的反应相对突出，建议进一步关注。"
        )
        if len(factor_scores) > 1:
            low = factor_scores[-1]
            lines.append(
                f"相对而言，{subject}在「{low['name']}」维度表现较为平稳（均分 {low['score']}）。"
            )
    if result["crisis_level"] in ("medium", "high"):
        lines.append(
            f"系统检测到{subject}的部分因子达到预警阈值，建议由具备危机干预权限的"
            f"咨询师及时介入并安排面谈。"
        )
    else:
        lines.append(f"当前未检测到明显危机信号，建议{subject}保持常规心理健康关注。")
    return "\n".join(lines)


def visible_reports_query(db: Session, current_user: User):
    """Return a SQLAlchemy query of Report objects visible to current_user."""
    q = db.query(Report)
    role = current_user.role
    perms = current_user.permissions or []

    if role == Role.ADMIN.value or Permission.VIEW_ALL_REPORTS.value in perms:
        return q  # 管理员 / 拥有查看所有报告权限：全部可见

    if role == Role.COUNSELOR.value or Permission.VIEW_REPORTS.value in perms:
        # 咨询师：所辖班级/部门及其下属的报告
        if current_user.department_id:
            dept_ids = descendant_department_ids(db, current_user.department_id)
            user_ids = [
                u.id
                for u in db.query(User.id).filter(
                    User.department_id.in_(dept_ids)
                ).all()
            ]
            user_ids.append(current_user.id)
            return q.filter(Report.user_id.in_(user_ids))
        return q.filter(Report.user_id == current_user.id)

    # 学员：仅本人自评报告（且需被授予查看权限），不可查看他评报告
    if Permission.VIEW_SELF_REPORT.value in perms:
        return q.filter(
            Report.user_id == current_user.id, Report.report_type == "self"
        )

    # 无任何报告权限：返回空集合
    return q.filter(Report.id == -1)


def can_view_report(db: Session, current_user: User, report: Report) -> bool:
    return (
        visible_reports_query(db, current_user)
        .filter(Report.id == report.id)
        .first()
        is not None
    )
