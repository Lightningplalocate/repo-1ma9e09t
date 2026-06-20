from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_permission
from ..database import get_db
from ..models import Appointment, User
from ..permissions import Permission, Role
from ..schemas import AppointmentConfirm, AppointmentCreate, AppointmentOut
from ..services import (
    SLOT_LABELS,
    appointment_display_status,
    descendant_department_ids,
    slot_start_dt,
)

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


def _out(appt: Appointment) -> AppointmentOut:
    o = AppointmentOut.model_validate(appt)
    o.slot_label = SLOT_LABELS.get(appt.slot, appt.slot)
    o.student_name = (
        (appt.student.full_name or appt.student.username) if appt.student else ""
    )
    o.counselor_name = (
        (appt.counselor.full_name or appt.counselor.username)
        if appt.counselor
        else ""
    )
    o.display_status = appointment_display_status(appt)
    return o


@router.get("/slots")
def slots(_: User = Depends(get_current_user)):
    return [{"key": k, "label": v} for k, v in SLOT_LABELS.items()]


def _visible_query(db: Session, current: User):
    q = db.query(Appointment)
    if current.role == Role.STUDENT.value:
        return q.filter(Appointment.student_id == current.id)
    if current.role == Role.COUNSELOR.value and Permission.MANAGE_USERS.value not in (
        current.permissions or []
    ):
        # 咨询师：本人 + 所辖部门学员的预约
        ids = []
        if current.department_id:
            dept_ids = descendant_department_ids(db, current.department_id)
            ids = [
                u.id
                for u in db.query(User.id)
                .filter(User.department_id.in_(dept_ids))
                .all()
            ]
        ids.append(current.id)
        return q.filter(
            (Appointment.student_id.in_(ids))
            | (Appointment.counselor_id == current.id)
        )
    return q  # 管理员可见全部


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    start: str | None = None,
    end: str | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    q = _visible_query(db, current)
    if start:
        q = q.filter(Appointment.date >= start)
    if end:
        q = q.filter(Appointment.date <= end)
    appts = q.order_by(Appointment.date, Appointment.slot).all()
    return [_out(a) for a in appts]


@router.post("", response_model=AppointmentOut)
def book(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.BOOK_APPOINTMENT)),
):
    if payload.slot not in SLOT_LABELS:
        raise HTTPException(status_code=400, detail="无效的预约时间段")
    start = slot_start_dt(payload.date, payload.slot)
    if not start:
        raise HTTPException(status_code=400, detail="无效的预约日期")
    # 学员需提前 24 小时预约
    if start < datetime.now() + timedelta(hours=24):
        raise HTTPException(status_code=400, detail="需提前至少 24 小时预约")
    # 避免同一时段重复预约（未取消）
    dup = (
        db.query(Appointment)
        .filter(
            Appointment.student_id == current.id,
            Appointment.date == payload.date,
            Appointment.slot == payload.slot,
            Appointment.status != "cancelled",
        )
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="该时段你已预约")
    appt = Appointment(
        date=payload.date,
        slot=payload.slot,
        student_id=current.id,
        status="pending",
        note=payload.note,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return _out(appt)


@router.post("/{appt_id}/confirm", response_model=AppointmentOut)
def confirm(
    appt_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.MANAGE_APPOINTMENT)),
):
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="预约不存在")
    appt.status = "confirmed"
    appt.counselor_id = current.id
    db.commit()
    db.refresh(appt)
    return _out(appt)


@router.post("/{appt_id}/cancel", response_model=AppointmentOut)
def cancel(
    appt_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="预约不存在")
    is_counselor = current.role in (Role.ADMIN.value, Role.COUNSELOR.value) or (
        Permission.MANAGE_APPOINTMENT.value in (current.permissions or [])
    )
    if not (is_counselor or appt.student_id == current.id):
        raise HTTPException(status_code=403, detail="没有权限取消该预约")
    appt.status = "cancelled"
    db.commit()
    db.refresh(appt)
    return _out(appt)


@router.post("/confirm-group", response_model=list[AppointmentOut])
def confirm_group(
    payload: AppointmentConfirm,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.MANAGE_APPOINTMENT)),
):
    """将多名学员的预约确认为团体咨询预约。"""
    appts = (
        db.query(Appointment).filter(Appointment.id.in_(payload.ids or [])).all()
    )
    for a in appts:
        a.status = "confirmed"
        a.counselor_id = current.id
        a.is_group = True
    db.commit()
    return [_out(a) for a in appts]
