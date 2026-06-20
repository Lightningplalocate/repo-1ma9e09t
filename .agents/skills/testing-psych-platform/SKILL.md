---
name: testing-psych-platform
description: Run and test the psychological assessment platform (FastAPI + React/AntD/ECharts) end-to-end. Use when verifying RBAC report visibility, scale creation, batch task assignment by class, report charts/AI, crisis warnings, or data-overview drill-down.
---

# Testing the Psych Assessment Platform

Monorepo: `backend/` (FastAPI + SQLAlchemy + SQLite) and `frontend/` (React + TS + Vite + Ant Design + ECharts).

## Run locally (Windows / PowerShell)
- Backend (auto-creates `psych_platform.db` and seeds demo data on first run):
  `cd backend; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
  - Use `--reload` so schema/router edits hot-reload; without it you must restart to pick up backend changes.
- Frontend (proxies `/api` -> :8000): `cd frontend; npm install; npm run dev` -> http://localhost:5173
- Health check: `(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health).Content` -> `{"status":"ok"}`
  - In PowerShell `curl` is aliased to `Invoke-WebRequest`; use `Invoke-WebRequest -UseBasicParsing` not unix `curl` flags.

## Demo accounts (seeded)
- `admin` / `admin123` — all permissions
- `counselor` / `counselor123` — dept reports, distribute tasks, add scales, crisis
- `student1` / `student123` — own self-reports only (张伟, in 高一(1)班)

## Seed structure (useful for assertions)
- Tree: 示范中学 -> {心理咨询中心, 高一年级 -> {高一(1)班, 高一(2)班}}
- 8 students; student1/3/5/7 are in 高一(1)班 -> **高一(1)班 has 4 members**. A task targeting that class must create exactly 4 assignments (progress denominator 4).
- Crisis seed: high:2, medium:1 (plus any you create).

## Auth for scripted API checks
Login is OAuth2 form-encoded, NOT JSON:
`POST /api/auth/login` with `application/x-www-form-urlencoded` body `username=..&password=..` -> `{access_token}`. Then `Authorization: Bearer <token>`.

## Primary E2E flow (covers the 8 requirements)
1. admin -> 量表库 -> 新增量表 (req 2)
2. admin -> 测评任务 -> new task targeting 高一(1)班, expect **0/4** (req 4)
3. student1 -> 我的测评 -> answer all 20 -> report with 3 ECharts + factor table + per-question table; AI uses 第三人称「此来访者」(no「你」), toggle 显示AI分析 hides it (req 6)
4. student1 -> 报告管理 shows only own 自评 rows + banner「仅可查看本人自评报告」; sidebar lacks 危机预警/人员与班级 (req 3,5)
5. counselor -> 危机预警 lists only 中/高 rows, 查看预警报告 opens report (req 5)
6. admin -> 数据总览 -> 各部门/班级数据分布 drill 示范中学->高一年级->高一(1)班->members, breadcrumb tracks path (req 8)
7. admin sidebar has only 6 modules, no key/license generation entry (req 1)

## Gotchas / known-fragile spots (verify these specifically)
- **Scale form factor Select**: must bind directly to the form (was once wrapped in a nested `Form.Item` so the factor value never registered -> "所属因子" required error on save even after selecting). Test: create a scale, pick a factor for the question, save — should succeed.
- **`/api/tasks/mine`**: response model `AssignmentOut` fills `scale_id`/`scale_name`/`task_title` AFTER `model_validate`, so those fields need defaults or it 500s and the student sees an empty 我的测评. Test: as a student with a pending assignment, 我的测评 must list it (not empty).
- Answering the 20-question modal: scroll-and-click is error-prone; track question numbers and verify each radio turned blue before submitting (submit blocks until all answered with "请完成所有题目").
- The app runs in the Chrome-for-Testing window; localStorage session persists across reloads/restarts (you may already be logged in). Navigate with `Start-Process chrome "http://localhost:5173/login"`.

## Devin Secrets Needed
None — fully local with seeded SQLite and hardcoded demo accounts.
