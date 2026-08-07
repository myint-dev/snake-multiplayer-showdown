from fastapi.testclient import TestClient

from .conftest import credentials, signup


def test_signup_login_me_and_logout(client: TestClient):
    token = signup(client, "authplayer")
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=headers).json()["user"]["username"] == "authplayer"
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert client.post("/api/auth/login", json=credentials("authplayer")).status_code == 200


def test_duplicate_signup_and_validation_return_public_errors(client: TestClient):
    signup(client, "duplicate")
    duplicate = client.post("/api/auth/signup", json=credentials("duplicate"))
    assert duplicate.status_code == 409
    assert duplicate.json() == {"message": "Username is already taken"}
    assert client.post("/api/auth/signup", json={"username": "x", "password": "short"}).status_code == 400
