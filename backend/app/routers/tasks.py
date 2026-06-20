from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_permission
from ..database import get_db
from ..models import (
    AssessmentTask,
    Department,
    Scale,
    TaskAssignment,
    User,
)
from ..permissions import Permission, Role
from ..schemas import AssignmentOut, TaskCreate, TaskOut
from ..services import descendant_department_ids

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _task_out(db: Session, task: AssessmentTask) -> TaskOut:
    out = TaskOut.model_validate(task)
    out.scale_name = task.scale.name if task.scale else ""
    if task.target_department_id:
        dept = db.query(Department).filter(
            Department.id == task.target_department_id
        ).first()
        out.target_department_name = dept.name if dept else None
    out.total_count = len(task.assignments)
    out.completed_count = sum(
        1 for a in task.assignments if a.status == "completed"
    )
    return out


@router.get("", response_model=list[TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.DISTRIBUTE_TASKS)),
):
    tasks = db.query(AssessmentTask).order_by(AssessmentTask.created_at.desc()).all()
    return [_task_out(db, t) for t in tasks]


@router.post("", response_model=TaskOut)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.DISTRIBUTE_TASKS)),
):
    scale = db.query(Scale).filter(Scale.id == payload.scale_id).first()
    if not scale:
        raise HTTPException(status_code=404, detail="量表不存在")

    # 发放对象支持：单选/多选「部门或班级」，以及单选/多选「学员」
    dept_ids_selected: list[int] = []
    if payload.target_department_id:
        dept_ids_selected.append(payload.target_department_id)
    dept_ids_selected.extend(payload.target_department_ids or [])
    dept_ids_selected = list(dict.fromkeys(dept_ids_selected))

    target_user_ids: set[int] = set()
    label_parts: list[str] = []

    # 部门/班级 -> 解析其子树下所有学员
    for did in dept_ids_selected:
        dept = db.query(Department).filter(Department.id == did).first()
        if not dept:
            continue
        label_parts.append(dept.name)
        sub_ids = descendant_department_ids(db, did)
        users = (
            db.query(User)
            .filter(
                User.department_id.in_(sub_ids),
                User.role == Role.STUDENT.value,
                User.is_active == True,
            )
            .all()
        )
        target_user_ids.update(u.id for u in users)

    # 指定学员
    if payload.target_user_ids:
        named = (
            db.query(User)
            .filter(User.id.in_(payload.target_user_ids))
            .all()
        )
        for u in named:
            target_user_ids.add(u.id)
        if named:
            label_parts.append(
                "指定学员：" + "、".join(u.full_name or u.username for u in named)
            )

    if not target_user_ids:
        raise HTTPException(status_code=400, detail="目标范围内没有可发放的学员账号")

    if dept_ids_selected and payload.target_user_ids:
        target_type = "mixed"
    elif payload.target_user_ids:
        target_type = "user"
    else:
        target_type = payload.target_type or "department"

    task = AssessmentTask(
        title=payload.title,
        scale_id=payload.scale_id,
        created_by=current.id,
        target_type=target_type,
        target_department_id=dept_ids_selected[0] if dept_ids_selected else None,
        target_label="；".join(label_parts),
        due_date=payload.due_date,
    )
    db.add(task)
    db.flush()
    for uid in target_user_ids:
        db.add(TaskAssignment(task_id=task.id, user_id=uid))
    db.commit()
    db.refresh(task)
    return _task_out(db, task)


@router.get("/{task_id}/assignments")
def task_assignments(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.DISTRIBUTE_TASKS)),
):
    task = db.query(AssessmentTask).filter(AssessmentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    rows = []
    for a in task.assignments:
        rows.append(
            {
                "id": a.id,
                "user_id": a.user_id,
                "user_name": a.user.full_name or a.user.username,
                "department_name": a.user.department.name if a.user.department else None,
                "status": a.status,
                "completed_at": a.completed_at,
            }
        )
    return rows


@router.get("/mine", response_model=list[AssignmentOut])
def my_assignments(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
):
    """当前登录学员待完成 / 已完成的测评任务。"""
    assignments = (
        db.query(TaskAssignment)
        .filter(TaskAssignment.user_id == current.id)
        .order_by(TaskAssignment.assigned_at.desc())
        .all()
    )
    out = []
    for a in assignments:
        item = AssignmentOut.model_validate(a)
        item.task_title = a.task.title
        item.scale_id = a.task.scale_id
        item.scale_name = a.task.scale.name if a.task.scale else ""
        out.append(item)
    return out
