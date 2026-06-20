from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel


# ---------- Auth ----------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


# ---------- Department ----------
class DepartmentBase(BaseModel):
    name: str
    node_type: str = "department"
    parent_id: Optional[int] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentOut(DepartmentBase):
    id: int

    class Config:
        from_attributes = True


class DepartmentTree(DepartmentOut):
    children: List["DepartmentTree"] = []
    user_count: int = 0


# ---------- User ----------
class UserBase(BaseModel):
    username: str
    full_name: str = ""
    role: str = "student"
    permissions: List[str] = []
    department_id: Optional[int] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(UserBase):
    id: int
    is_active: bool
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Scale ----------
class QuestionIn(BaseModel):
    order: int = 0
    text: str
    factor: str = ""
    options: List[dict] = []


class QuestionOut(QuestionIn):
    id: int

    class Config:
        from_attributes = True


class ScaleBase(BaseModel):
    name: str
    description: str = ""
    instructions: str = ""
    factors: List[dict] = []
    crisis_rules: List[dict] = []


class ScaleCreate(ScaleBase):
    questions: List[QuestionIn] = []


class ScaleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    factors: Optional[List[dict]] = None
    crisis_rules: Optional[List[dict]] = None
    is_active: Optional[bool] = None
    questions: Optional[List[QuestionIn]] = None


class ScaleOut(ScaleBase):
    id: int
    is_active: bool
    question_count: int = 0

    class Config:
        from_attributes = True


class ScaleDetail(ScaleOut):
    questions: List[QuestionOut] = []


# ---------- Task ----------
class TaskCreate(BaseModel):
    title: str
    scale_id: int
    target_type: str = "department"  # department / class / user
    target_department_id: Optional[int] = None
    target_user_ids: List[int] = []
    due_date: Optional[datetime] = None


class TaskOut(BaseModel):
    id: int
    title: str
    scale_id: int
    scale_name: str = ""
    target_type: str
    target_department_id: Optional[int] = None
    target_department_name: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    total_count: int = 0
    completed_count: int = 0

    class Config:
        from_attributes = True


class AssignmentOut(BaseModel):
    id: int
    task_id: int
    task_title: str = ""
    scale_id: int
    scale_name: str = ""
    status: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Submission / Report ----------
class AnswerIn(BaseModel):
    question_id: int
    choice_index: int


class SubmissionIn(BaseModel):
    assignment_id: int
    answers: List[AnswerIn]


class ReportOut(BaseModel):
    id: int
    user_id: int
    user_name: str = ""
    department_name: Optional[str] = None
    scale_id: int
    scale_name: str = ""
    report_type: str
    answers: List[dict] = []
    factor_scores: List[dict] = []
    total_score: float
    crisis_level: str
    ai_analysis: str = ""
    submitted_at: datetime

    class Config:
        from_attributes = True


class ReportSummary(BaseModel):
    id: int
    user_id: int
    user_name: str = ""
    department_name: Optional[str] = None
    scale_name: str = ""
    report_type: str
    total_score: float
    crisis_level: str
    submitted_at: datetime


DepartmentTree.model_rebuild()
