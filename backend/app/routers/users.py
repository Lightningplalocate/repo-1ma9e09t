from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, require_permission
from ..database import get_db
from ..models import Department, User
from ..permissions import DEFAULT_ROLE_PERMISSIONS, Permission
from ..schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _to_out(db: Session, user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.department_name = user.department.name if user.department else None
    return out


@router.get("", response_model=list[UserOut])
def list_users(
    department_id: int | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    q = db.query(User)
    if department_id is not None:
        q = q.filter(User.department_id == department_id)
    if role:
        q = q.filter(User.role == role)
    return [_to_out(db, u) for u in q.all()]


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    perms = payload.permissions or DEFAULT_ROLE_PERMISSIONS.get(payload.role, [])
    user = User(
        username=payload.username,
        full_name=payload.full_name,
        role=payload.role,
        permissions=perms,
        department_id=payload.department_id,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_out(db, user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.hashed_password = hash_password(data.pop("password"))
    else:
        data.pop("password", None)
    if "department_id" in data and data["department_id"] is not None:
        if not db.query(Department).filter(
            Department.id == data["department_id"]
        ).first():
            raise HTTPException(status_code=404, detail="部门不存在")
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return _to_out(db, user)


@router.post("/{user_id}/move", response_model=UserOut)
def move_user(
    user_id: int,
    department_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    """将用户挪动到另一个班级 / 部门。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not db.query(Department).filter(Department.id == department_id).first():
        raise HTTPException(status_code=404, detail="目标部门不存在")
    user.department_id = department_id
    db.commit()
    db.refresh(user)
    return _to_out(db, user)


@router.put("/{user_id}/permissions", response_model=UserOut)
def set_permissions(
    user_id: int,
    permissions: list[str],
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    valid = {p.value for p in Permission}
    user.permissions = [p for p in permissions if p in valid]
    db.commit()
    db.refresh(user)
    return _to_out(db, user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_active = False
    db.commit()
    return {"ok": True}
