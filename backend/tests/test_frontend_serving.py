from fastapi.testclient import TestClient


def test_serve_frontend_index(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "")
    assert "<!DOCTYPE html>" in response.text


def test_serve_frontend_spa_routes(client: TestClient):
    response = client.get("/play")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "")


def test_api_routes_not_swallowed_by_spa(client: TestClient):
    response = client.get("/api/unknown-route")
    assert response.status_code == 404
    assert response.headers.get("content-type", "").startswith("application/json")
    assert response.json() == {"message": "Not found"}
