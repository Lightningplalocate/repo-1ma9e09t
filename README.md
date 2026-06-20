# 心理测评平台 (Psych Assessment Platform)

一个面向学校/机构的心理测评管理平台，支持多级权限管理、量表库维护、按班级批量发放测评、
危机预警、按权限分级的报告管理与可视化分析。

## 技术栈
- 后端：FastAPI + SQLAlchemy + SQLite（默认）/ Postgres，JWT 鉴权 + RBAC 细粒度权限
- 前端：React + TypeScript + Vite + Ant Design + ECharts

## 目录结构
```
backend/    FastAPI 后端（app/ 下含 models / routers / services / seed）
frontend/   React 前端（src/pages 各功能页面）
```

## 本地运行

### 后端
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
启动时会自动建表并写入演示数据（仅当数据库为空时）。

### 前端
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 （已配置 /api 代理到 8000）
```

## 演示账号
| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员（全部权限） |
| counselor | counselor123 | 咨询师/教师（所辖部门报告、发任务、加量表、危机预警） |
| student1 | student123 | 学员（仅本人自评报告） |

## 功能与需求映射
1. **密钥生成/发放不在测评软件内**：平台不含任何密钥生成接口；`/api/license/status` 仅做外部授权校验。
2. **量表库可维护**：拥有「新增量表」权限的管理员/教师可在「量表库」创建量表（题目、因子、危机规则）。
3. **多级管理 + 勾选式权限**：组织树（部门/班级多级）+ 用户（管理员/咨询师/学员），可新增、改权限、跨部门挪动，功能权限以勾选授予。
4. **按班级/部门批量发任务**：新建测评任务时以班级/部门为单位，向其下所有学员账号一次性发放。
5. **报告管理 + 按权限可见**：左侧「报告管理」，管理员看全部、咨询师看所辖部门、学员仅看本人自评；危机预警处可查看预警学员报告。
6. **报告内容**：逐题作答、因子分析、趋势曲线/柱状图/饼图，AI 分析为第三人称（“此来访者”）且可隐藏/不打印。
7. **去除无效占位功能**，仅保留可操作闭环。
8. **数据总览合并日常检测**：支持按部门查看分布，可逐级下钻进入部门/个人并查看报告。
