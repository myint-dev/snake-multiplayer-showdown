from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def credentials(username: str) -> dict[str, str]:
    return {"username": username, "password": "secret12"}


def signup(client: TestClient, username: str) -> str:
    response = client.post("/api/auth/signup", json=credentials(username))
    assert response.status_code == 201
    return response.json()["token"]
