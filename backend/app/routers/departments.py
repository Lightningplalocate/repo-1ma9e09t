from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_permission
from ..database import get_db
from ..models import Department, User
from ..permissions import Permission
from ..schemas import DepartmentCreate, DepartmentOut, DepartmentTree

router = APIRouter(prefix="/api/departments", tags=["departments"])


def _build_tree(db: Session, parent_id=None):
    nodes = (
        db.query(Department).filter(Department.parent_id == parent_id).all()
    )
    result = []
    for n in nodes:
        count = db.query(User).filter(User.department_id == n.id).count()
        node = DepartmentTree.model_validate(n)
        node.user_count = count
        node.children = _build_tree(db, n.id)
        result.append(node)
    return result


@router.get("/tree", response_model=list[DepartmentTree])
def get_tree(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _build_tree(db, None)


@router.get("", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return db.query(Department).all()


@router.post("", response_model=DepartmentOut)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS)),
):
    if payload.parent_id is not None:
        if not db.query(Department).filter(Department.id == payload.parent_id).first():
            raise HTTPException(status_code=404, detail="上级部门不存在")
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS)),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")
    if payload.parent_id == dept_id:
        raise HTTPException(status_code=400, detail="不能将部门挂到自身下")
    dept.name = payload.name
    dept.node_type = payload.node_type
    dept.parent_id = payload.parent_id
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.MANAGE_DEPARTMENTS)),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")
    if db.query(Department).filter(Department.parent_id == dept_id).first():
        raise HTTPException(status_code=400, detail="请先删除下级部门")
    if db.query(User).filter(User.department_id == dept_id).first():
        raise HTTPException(status_code=400, detail="该部门下仍有成员，无法删除")
    db.delete(dept)
    db.commit()
    return {"ok": True}
