from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


class Department(Base):
    """组织节点：部门或班级，支持多级（parent_id 自引用形成树）。"""

    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # node_type: "department" 部门 / "class" 班级
    node_type = Column(String, default="department")
    parent_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    parent = relationship("Department", remote_side=[id], backref="children")
    users = relationship("User", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, default="")
    student_no = Column(String, index=True, default="")  # 学号
    gender = Column(String, default="")  # 男 / 女
    birth_date = Column(String, default="")  # 出生日期 YYYY-MM-DD
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student")  # admin / counselor / student
    permissions = Column(JSON, default=list)   # 勾选式权限 key 列表
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="users")


class Scale(Base):
    """量表：由管理员/教师维护。"""

    __tablename__ = "scales"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    instructions = Column(Text, default="")
    # factors: [{"key": "somatization", "name": "躯体化"}, ...]
    factors = Column(JSON, default=list)
    # crisis_rules: [{"factor": "depression", "op": ">=", "threshold": 3, "level": "high"}]
    crisis_rules = Column(JSON, default=list)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    questions = relationship(
        "Question", back_populates="scale", cascade="all, delete-orphan",
        order_by="Question.order",
    )


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    scale_id = Column(Integer, ForeignKey("scales.id"), nullable=False)
    order = Column(Integer, default=0)
    text = Column(Text, nullable=False)
    factor = Column(String, default="")  # 该题归属因子 key
    # options: [{"label": "没有", "score": 1}, ...]
    options = Column(JSON, default=list)

    scale = relationship("Scale", back_populates="questions")


class AssessmentTask(Base):
    """测评任务：可按班级/部门为单位批量发放。"""

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    scale_id = Column(Integer, ForeignKey("scales.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    # target_type: "department" | "class" | "user"
    target_type = Column(String, default="department")
    target_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    target_label = Column(String, default="")  # 发放对象的可读描述（支持多选部门/学员）
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    scale = relationship("Scale")
    assignments = relationship(
        "TaskAssignment", back_populates="task", cascade="all, delete-orphan"
    )


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending / completed
    assigned_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    task = relationship("AssessmentTask", back_populates="assignments")
    user = relationship("User")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("task_assignments.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scale_id = Column(Integer, ForeignKey("scales.id"), nullable=False)
    # report_type: "self" 自评 / "other" 他评
    report_type = Column(String, default="self")
    # answers: [{"question_id": 1, "order": 1, "text": "...", "factor": "...",
    #            "choice_label": "没有", "score": 1}]
    answers = Column(JSON, default=list)
    # factor_scores: [{"key": "depression", "name": "抑郁", "score": 2.4, "items": 13}]
    factor_scores = Column(JSON, default=list)
    total_score = Column(Float, default=0.0)
    crisis_level = Column(String, default="none")  # none / low / medium / high
    ai_analysis = Column(Text, default="")
    # 咨询师建议（报告底部可编辑文本）
    counselor_advice = Column(Text, default="")
    # 咨询师签名 / 负责咨询师（与报告底部下拉勾选同步）
    counselor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    counselor = relationship("User", foreign_keys=[counselor_id])
    scale = relationship("Scale")


class Appointment(Base):
    """咨询预约：月历模式，4 个固定时段，学员发起、咨询师确认的双向预约。"""

    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    # slot: am1 (08:00-09:00) / am2 (10:00-11:00) / pm1 (14:00-15:00) / pm2 (15:00-16:00)
    slot = Column(String, nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    counselor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # status: pending 预约中 / confirmed 预约成功 / cancelled 预约未成功
    status = Column(String, default="pending")
    is_group = Column(Boolean, default=False)  # 团体咨询预约
    note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])
    counselor = relationship("User", foreign_keys=[counselor_id])
