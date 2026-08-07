from fastapi.testclient import TestClient

from .conftest import signup


def snapshot(score: int = 0) -> dict:
    return {"grid": 20, "snake": [{"x": 3, "y": 4}], "food": {"x": 10, "y": 11}, "dir": "right", "score": score, "status": "running"}


def test_active_game_lifecycle(client: TestClient):
    token = signup(client, "gameplayer")
    created = client.post("/api/games", headers={"Authorization": f"Bearer {token}"}, json={"mode": "pass-through", "snapshot": snapshot(4)})
    assert created.status_code == 201
    game_id = created.json()["id"]
    assert client.put(f"/api/games/{game_id}/snapshot", json=snapshot(22)).status_code == 204
    assert client.get(f"/api/games/{game_id}").json()["score"] == 22
    assert client.post(f"/api/games/{game_id}/finish", json={"score": 22}).status_code == 204
    assert client.get(f"/api/games/{game_id}").status_code == 404
