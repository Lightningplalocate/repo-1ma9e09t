from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_current_user, verify_password
from ..database import get_db
from ..models import User
from ..permissions import (
    PERMISSION_LABELS,
    ROLE_LABELS,
    Role,
    DEFAULT_ROLE_PERMISSIONS,
)
from ..schemas import Token, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="账号已被禁用")
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
