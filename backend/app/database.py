import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _default_sqlite_url() -> str:
    # When bundled into a single exe (PyInstaller), write the DB next to the
    # executable so data persists across runs; otherwise use the working dir.
    if getattr(sys, "frozen", False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.getcwd()
    path = os.path.join(base, "psych_platform.db").replace("\\", "/")
    return f"sqlite:///{path}"


DATABASE_URL = os.getenv("DATABASE_URL") or _default_sqlite_url()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
