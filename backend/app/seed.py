"""Seed demo data: departments, users, scales, tasks and sample reports."""

import random
from datetime import datetime, timedelta

from .auth import hash_password
from .database import SessionLocal
from .models import (
    AssessmentTask,
    Department,
    Question,
    Report,
    Scale,
    TaskAssignment,
    User,
)
from .permissions import DEFAULT_ROLE_PERMISSIONS, Role
from .scl90 import build_scl90
from .services import build_ai_analysis, score_submission

OPTIONS = [
    {"label": "没有", "score": 1},
    {"label": "偶尔", "score": 2},
    {"label": "经常", "score": 3},
    {"label": "总是", "score": 4},
]

FACTORS = [
    {"key": "depression", "name": "抑郁"},
    {"key": "anxiety", "name": "焦虑"},
    {"key": "somatization", "name": "躯体化"},
    {"key": "interpersonal", "name": "人际敏感"},
]

QUESTION_BANK = {
    "depression": [
        "我感到情绪低落、闷闷不乐",
        "我对平时感兴趣的事情提不起劲",
        "我觉得前途没有希望",
        "我容易感到疲乏、没有精力",
        "我觉得自己没有价值",
    ],
    "anxiety": [
        "我无缘无故地感到害怕",
        "我容易紧张或心烦意乱",
        "我感到心跳加快、坐立不安",
        "我担心会有不好的事情发生",
        "我难以放松下来",
    ],
    "somatization": [
        "我会头痛或头晕",
        "我感到胸闷或呼吸不畅",
        "我有食欲不振的情况",
        "我睡眠质量不好",
        "我会感到身体某处疼痛",
    ],
    "interpersonal": [
        "我在人群中感到不自在",
        "我担心别人对我的看法",
        "我觉得与人交往很困难",
        "我容易因小事与人产生摩擦",
        "我感到孤独、不被理解",
    ],
}

CRISIS_RULES = [
    {"factor": "depression", "op": ">=", "threshold": 3.0, "level": "high"},
    {"factor": "anxiety", "op": ">=", "threshold": 3.0, "level": "medium"},
    {"factor": "somatization", "op": ">=", "threshold": 3.2, "level": "medium"},
]


def _build_scale(db, name, description):
    scale = Scale(
        name=name,
        description=description,
        instructions="请根据最近两周的真实感受，选择最符合的选项。",
        factors=FACTORS,
        crisis_rules=CRISIS_RULES,
    )
    db.add(scale)
    db.flush()
    order = 1
    for factor in FACTORS:
        for text in QUESTION_BANK[factor["key"]]:
            db.add(
                Question(
                    scale_id=scale.id,
                    order=order,
                    text=text,
                    factor=factor["key"],
                    options=OPTIONS,
                )
            )
            order += 1
    return scale


def seed_data():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return  # already seeded

        # ---------- Departments (tree) ----------
        root = Department(name="示范中学", node_type="department", parent_id=None)
        db.add(root)
        db.flush()
        center = Department(name="心理咨询中心", node_type="department", parent_id=root.id)
        grade1 = Department(name="高一年级", node_type="department", parent_id=root.id)
        db.add_all([center, grade1])
        db.flush()
        class1 = Department(name="高一(1)班", node_type="class", parent_id=grade1.id)
        class2 = Department(name="高一(2)班", node_type="class", parent_id=grade1.id)
        db.add_all([class1, class2])
        db.flush()

        # ---------- Users ----------
        admin = User(
            username="admin",
            full_name="系统管理员",
            hashed_password=hash_password("admin123"),
            role=Role.ADMIN.value,
            permissions=DEFAULT_ROLE_PERMISSIONS[Role.ADMIN.value],
            department_id=root.id,
        )
        counselor = User(
            username="counselor",
            full_name="李咨询师",
            hashed_password=hash_password("counselor123"),
            role=Role.COUNSELOR.value,
            permissions=DEFAULT_ROLE_PERMISSIONS[Role.COUNSELOR.value],
            department_id=grade1.id,
        )
        db.add_all([admin, counselor])
        db.flush()

        students = []
        names = ["张伟", "王芳", "李娜", "刘强", "陈静", "杨洋", "赵敏", "周杰"]
        genders = ["男", "女", "女", "男", "女", "男", "女", "男"]
        for i, name in enumerate(names):
            dept = class1 if i % 2 == 0 else class2
            s = User(
                username=f"student{i+1}",
                full_name=name,
                student_no=f"2026{i + 1:04d}",
                gender=genders[i],
                birth_date=f"2009-{(i % 12) + 1:02d}-15",
                hashed_password=hash_password("student123"),
                role=Role.STUDENT.value,
                permissions=DEFAULT_ROLE_PERMISSIONS[Role.STUDENT.value],
                department_id=dept.id,
            )
            db.add(s)
            students.append(s)
        db.flush()

        # ---------- Scales ----------
        scale = _build_scale(
            db, "中学生心理健康自评量表（简版）", "包含抑郁、焦虑、躯体化、人际敏感四个因子。"
        )
        scale2 = _build_scale(
            db, "抑郁焦虑筛查量表", "用于日常心理状态的快速筛查。"
        )
        # 标准 SCL-90 量表
        build_scl90(db, Scale, Question)
        db.flush()

        # ---------- Task targeting 高一年级 (batch by department) ----------
        task = AssessmentTask(
            title="2026春季学期心理普测",
            scale_id=scale.id,
            created_by=admin.id,
            target_type="department",
            target_department_id=grade1.id,
            due_date=datetime.utcnow() + timedelta(days=14),
        )
        db.add(task)
        db.flush()

        # ---------- Assignments + sample reports ----------
        # Make a few students high/medium crisis for demo.
        crisis_profile = {0: "high", 2: "medium", 4: "high"}
        for idx, s in enumerate(students):
            assignment = TaskAssignment(task_id=task.id, user_id=s.id)
            db.add(assignment)
            db.flush()

            answer_map = {}
            level = crisis_profile.get(idx)
            for q in scale.questions:
                if level == "high" and q.factor == "depression":
                    choice = 3  # 总是 -> score 4
                elif level == "medium" and q.factor == "anxiety":
                    choice = 2
                else:
                    choice = random.randint(0, 1)
                answer_map[q.id] = choice

            result = score_submission(scale, answer_map)
            ai = build_ai_analysis(s.full_name, scale, result)
            report = Report(
                assignment_id=assignment.id,
                user_id=s.id,
                scale_id=scale.id,
                report_type="self",
                answers=result["answers"],
                factor_scores=result["factor_scores"],
                total_score=result["total_score"],
                crisis_level=result["crisis_level"],
                ai_analysis=ai,
                submitted_at=datetime.utcnow() - timedelta(days=random.randint(0, 20)),
            )
            db.add(report)
            assignment.status = "completed"
            assignment.completed_at = datetime.utcnow()

        db.commit()
    finally:
        db.close()
