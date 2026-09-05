"""Integration-test configuration using a real temporary SQLite database."""

import atexit
import os
import tempfile
from pathlib import Path

_database_file = Path(tempfile.mkstemp(prefix="snake-integration-", suffix=".sqlite3")[1])
os.environ["DATABASE_URL"] = f"sqlite:///{_database_file}"
os.environ["SNAKE_ROYALE_DATABASE_URL"] = f"sqlite:///{_database_file}"

# Ensure a mock static directory exists for isolated integration testing in CI
# when the frontend dist bundle has not been built yet.
_temp_static_dir = Path(tempfile.mkdtemp(prefix="snake-integration-static-"))
_index_file = _temp_static_dir / "index.html"
_index_file.write_text("<!DOCTYPE html><html><head><title>Snake Multiplayer Showdown</title></head><body><div id='root'></div></body></html>")
os.environ.setdefault("SNAKE_ROYALE_STATIC_DIR", str(_temp_static_dir))

from fastapi.testclient import TestClient
import pytest

from app.database import engine
from app.main import app


@atexit.register
def remove_temporary_database() -> None:
    engine.dispose()
    _database_file.unlink(missing_ok=True)
    import shutil
    shutil.rmtree(_temp_static_dir, ignore_errors=True)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
