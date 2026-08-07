from fastapi.testclient import TestClient

from .conftest import signup


def test_scores_and_personal_best(client: TestClient):
    assert [score["score"] for score in client.get("/api/leaderboard", params={"mode": "walls"}).json()] == [420, 310]
    token = signup(client, "scoreplayer")
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/leaderboard/personal-best", params={"mode": "walls"}).json() == 0
    created = client.post("/api/leaderboard", json={"mode": "walls", "score": 99}, headers=headers)
    assert created.status_code == 201
    assert client.get("/api/leaderboard/personal-best", params={"mode": "walls"}, headers=headers).json() == 99
