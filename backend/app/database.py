"""Database configuration. Set DATABASE_URL to any SQLAlchemy URL."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool


def get_database_url() -> str:
    snake_url = os.getenv("SNAKE_ROYALE_DATABASE_URL")
    db_url = os.getenv("DATABASE_URL")

    # If SNAKE_ROYALE_DATABASE_URL was set to the default SQLite path in Docker
    # but DATABASE_URL was provided (e.g. Aiven on Render), use DATABASE_URL.
    if db_url and (not snake_url or snake_url == "sqlite:////data/snake_royale.db"):
        raw_url = db_url
    else:
        raw_url = snake_url or db_url or ("sqlite:////data/snake_royale.db" if os.path.exists("/data") else "sqlite:///./snake.db")

    if raw_url.startswith("postgres://"):
        raw_url = "postgresql+psycopg://" + raw_url[len("postgres://"):]
    elif raw_url.startswith("postgresql://"):
        raw_url = "postgresql+psycopg://" + raw_url[len("postgresql://"):]

    # Aiven and hosted Postgres require SSL mode
    if raw_url.startswith("postgresql+psycopg://") and "sslmode=" not in raw_url:
        if "aivencloud.com" in raw_url:
            delimiter = "&" if "?" in raw_url else "?"
            raw_url = f"{raw_url}{delimiter}sslmode=require"

    return raw_url


DATABASE_URL = get_database_url()
options = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
if DATABASE_URL.endswith(":memory:"):
    options["poolclass"] = StaticPool
engine = create_engine(DATABASE_URL, **options)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def initialize_database() -> None:
    Base.metadata.create_all(engine)
