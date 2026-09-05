import atexit
import os
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["SNAKE_ROYALE_DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

# Ensure a mock static directory exists for isolated unit testing in CI
# when the frontend dist bundle has not been built yet.
_temp_static_dir = Path(tempfile.mkdtemp(prefix="snake-test-static-"))
_index_file = _temp_static_dir / "index.html"
_index_file.write_text("<!DOCTYPE html><html><head><title>Snake Multiplayer Showdown</title></head><body><div id='root'></div></body></html>")
os.environ.setdefault("SNAKE_ROYALE_STATIC_DIR", str(_temp_static_dir))


@atexit.register
def _cleanup_temp_static() -> None:
    import shutil
    shutil.rmtree(_temp_static_dir, ignore_errors=True)

from fastapi.testclient import TestClient
import pytest
from app.database import Base, engine, initialize_database
from app.main import app
from app.store import seed_store

@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(engine)
    initialize_database()
    seed_store()

@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

def credentials(username: str) -> dict[str, str]:
    return {"username": username, "password": "secret12"}

def signup(client: TestClient, username: str) -> str:
    response = client.post("/api/auth/signup", json=credentials(username))
    assert response.status_code == 201
    return response.json()["token"]
