"""Central definition of roles and fine-grained function permissions.

Permissions are assigned to users individually (checkbox style). Roles only
provide sensible defaults when a user is created; afterwards an administrator
can toggle any permission on/off per user.
"""

from enum import Enum


class Role(str, Enum):
    ADMIN = "admin"          # 管理员 / 超级管理员
    COUNSELOR = "counselor"  # 咨询师 / 教师
    STUDENT = "student"      # 学员


class Permission(str, Enum):
    VIEW_REPORTS = "view_reports"            # 查看报告（按数据范围）
    VIEW_ALL_REPORTS = "view_all_reports"    # 查看所有报告（全平台）
    VIEW_SELF_REPORT = "view_self_report"    # 查看本人自评报告
    DISTRIBUTE_TASKS = "distribute_tasks"    # 分发测评量表任务
    ADD_SCALES = "add_scales"                # 新增 / 维护量表
    MANAGE_USERS = "manage_users"            # 新增/改权限/挪动 人员
    MANAGE_DEPARTMENTS = "manage_departments"  # 管理部门 / 班级
    VIEW_CRISIS = "view_crisis"              # 查看危机预警及预警学员报告


# 权限的中文标签，供前端勾选界面展示
PERMISSION_LABELS = {
    Permission.VIEW_REPORTS.value: "查看报告",
    Permission.VIEW_ALL_REPORTS.value: "查看所有报告",
    Permission.VIEW_SELF_REPORT.value: "查看本人自评报告",
    Permission.DISTRIBUTE_TASKS.value: "分发测评任务",
    Permission.ADD_SCALES.value: "新增量表",
    Permission.MANAGE_USERS.value: "管理人员",
    Permission.MANAGE_DEPARTMENTS.value: "管理部门/班级",
    Permission.VIEW_CRISIS.value: "查看危机预警",
}

ROLE_LABELS = {
    Role.ADMIN.value: "管理员",
    Role.COUNSELOR.value: "咨询师/教师",
    Role.STUDENT.value: "学员",
}

DEFAULT_ROLE_PERMISSIONS = {
    Role.ADMIN.value: [p.value for p in Permission],
    Role.COUNSELOR.value: [
        Permission.VIEW_REPORTS.value,
        Permission.DISTRIBUTE_TASKS.value,
        Permission.ADD_SCALES.value,
        Permission.VIEW_CRISIS.value,
    ],
    Role.STUDENT.value: [
        Permission.VIEW_SELF_REPORT.value,
    ],
}
