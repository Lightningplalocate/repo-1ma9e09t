from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_permission
from ..database import get_db
from ..models import Question, Scale, User
from ..permissions import Permission
from ..schemas import ScaleCreate, ScaleDetail, ScaleOut, ScaleUpdate

router = APIRouter(prefix="/api/scales", tags=["scales"])


def _to_out(scale: Scale) -> ScaleOut:
    out = ScaleOut.model_validate(scale)
    out.question_count = len(scale.questions)
    return out


@router.get("", response_model=list[ScaleOut])
def list_scales(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return [_to_out(s) for s in db.query(Scale).filter(Scale.is_active == True).all()]


@router.get("/{scale_id}", response_model=ScaleDetail)
def get_scale(
    scale_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    scale = db.query(Scale).filter(Scale.id == scale_id).first()
    if not scale:
        raise HTTPException(status_code=404, detail="量表不存在")
    detail = ScaleDetail.model_validate(scale)
    detail.question_count = len(scale.questions)
    return detail


@router.post("", response_model=ScaleDetail)
def create_scale(
    payload: ScaleCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.ADD_SCALES)),
):
    scale = Scale(
        name=payload.name,
        description=payload.description,
        instructions=payload.instructions,
        factors=payload.factors,
        crisis_rules=payload.crisis_rules,
        created_by=current.id,
    )
    db.add(scale)
    db.flush()
    for q in payload.questions:
        db.add(Question(scale_id=scale.id, **q.model_dump()))
    db.commit()
    db.refresh(scale)
    detail = ScaleDetail.model_validate(scale)
    detail.question_count = len(scale.questions)
    return detail


@router.put("/{scale_id}", response_model=ScaleDetail)
def update_scale(
    scale_id: int,
    payload: ScaleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.ADD_SCALES)),
):
    scale = db.query(Scale).filter(Scale.id == scale_id).first()
    if not scale:
        raise HTTPException(status_code=404, detail="量表不存在")
    data = payload.model_dump(exclude_unset=True)
    questions = data.pop("questions", None)
    for k, v in data.items():
        setattr(scale, k, v)
    if questions is not None:
        db.query(Question).filter(Question.scale_id == scale_id).delete()
        for q in questions:
            db.add(Question(scale_id=scale.id, **q))
    db.commit()
    db.refresh(scale)
    detail = ScaleDetail.model_validate(scale)
    detail.question_count = len(scale.questions)
    return detail


@router.delete("/{scale_id}")
def delete_scale(
    scale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.ADD_SCALES)),
):
    scale = db.query(Scale).filter(Scale.id == scale_id).first()
    if not scale:
        raise HTTPException(status_code=404, detail="量表不存在")
    scale.is_active = False
    db.commit()
    return {"ok": True}
