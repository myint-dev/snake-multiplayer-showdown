import os
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

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
