from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..database import get_db
from ..models import User
from ..permissions import (
    PERMISSION_LABELS,
    ROLE_LABELS,
    Role,
    DEFAULT_ROLE_PERMISSIONS,
)
from ..schemas import RegisterRequest, Token, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # 支持用「用户名」或「学号」登录
    user = (
        db.query(User)
        .filter(
            (User.username == form_data.username)
            | (User.student_no == form_data.username)
        )
        .first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="账号已被禁用")
    return Token(access_token=create_access_token(user))


@router.post("/register", response_model=Token)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """允许咨询师 / 学员用学号自助注册账号（学号即登录账号）。"""
    role = payload.role if payload.role in (
        Role.STUDENT.value,
        Role.COUNSELOR.value,
    ) else Role.STUDENT.value
    sn = (payload.student_no or "").strip()
    if not sn:
        raise HTTPException(status_code=400, detail="请填写学号")
    exists = (
        db.query(User)
        .filter((User.username == sn) | (User.student_no == sn))
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="该学号已被注册")
    user = User(
        username=sn,
        student_no=sn,
        full_name=payload.full_name,
        gender=payload.gender,
        birth_date=payload.birth_date,
        role=role,
        permissions=DEFAULT_ROLE_PERMISSIONS.get(role, []),
        department_id=payload.department_id,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    out = UserOut.model_validate(current_user)
    out.department_name = current_user.department.name if current_user.department else None
    return out


@router.get("/meta")
def meta():
    """权限与角色元数据，供前端勾选界面使用。"""
    return {
        "permissions": [
            {"key": k, "label": v} for k, v in PERMISSION_LABELS.items()
        ],
        "roles": [{"key": k, "label": v} for k, v in ROLE_LABELS.items()],
        "default_role_permissions": DEFAULT_ROLE_PERMISSIONS,
    }
