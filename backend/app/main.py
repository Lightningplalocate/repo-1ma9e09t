import os
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import (
    auth_router,
    crisis,
    departments,
    license_router,
    overview,
    reports,
    scales,
    tasks,
    users,
)
from .seed import seed_data

app = FastAPI(title="心理测评平台 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(departments.router)
app.include_router(users.router)
app.include_router(scales.router)
app.include_router(tasks.router)
app.include_router(reports.router)
app.include_router(crisis.router)
app.include_router(overview.router)
app.include_router(license_router.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    seed_data()


@app.get("/api/health")
def health():
    return {"status": "ok"}


def _static_dir() -> str:
    # Built frontend (vite `dist`). When frozen, PyInstaller unpacks it to
    # `_MEIPASS/webdist`; in dev it lives at <repo>/frontend/dist.
    if getattr(sys, "frozen", False):
        return os.path.join(sys._MEIPASS, "webdist")
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(here, "..", "..", "frontend", "dist"))


_STATIC = _static_dir()
if os.path.isdir(_STATIC):
    _assets = os.path.join(_STATIC, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/")
    def _index():
        return FileResponse(os.path.join(_STATIC, "index.html"))

    @app.get("/{full_path:path}")
    def _spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = os.path.join(_STATIC, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_STATIC, "index.html"))
