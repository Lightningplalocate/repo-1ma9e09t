from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
