"""Database configuration. Set DATABASE_URL to any SQLAlchemy URL."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("SNAKE_ROYALE_DATABASE_URL") or "sqlite:///./snake.db"
options = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
if DATABASE_URL.endswith(":memory:"): options["poolclass"] = StaticPool
engine = create_engine(DATABASE_URL, **options)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
class Base(DeclarativeBase): pass
def initialize_database() -> None: Base.metadata.create_all(engine)
