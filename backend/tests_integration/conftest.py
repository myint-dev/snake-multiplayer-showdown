"""Integration-test configuration using a real temporary SQLite database."""

import atexit
import os
import tempfile
from pathlib import Path

_database_file = Path(tempfile.mkstemp(prefix="snake-integration-", suffix=".sqlite3")[1])
os.environ["DATABASE_URL"] = f"sqlite:///{_database_file}"

from fastapi.testclient import TestClient
import pytest

from app.database import engine
from app.main import app


@atexit.register
def remove_temporary_database() -> None:
    engine.dispose()
    _database_file.unlink(missing_ok=True)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
