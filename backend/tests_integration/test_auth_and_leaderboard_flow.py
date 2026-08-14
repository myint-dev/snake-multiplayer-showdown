"""End-to-end HTTP flow against the temporary SQLite integration database."""


def test_signup_login_submit_score_and_read_leaderboard(client):
    credentials = {"username": "integration-player", "password": "secret12"}

    signup = client.post("/api/auth/signup", json=credentials)
    assert signup.status_code == 201
    assert signup.json()["user"]["username"] == credentials["username"]

    login = client.post("/api/auth/login", json=credentials)
    assert login.status_code == 200
    token = login.json()["token"]

    submitted = client.post(
        "/api/leaderboard",
        headers={"Authorization": f"Bearer {token}"},
        json={"mode": "walls", "score": 999},
    )
    assert submitted.status_code == 201
    assert submitted.json()["username"] == credentials["username"]

    leaderboard = client.get("/api/leaderboard", params={"mode": "walls"})
    assert leaderboard.status_code == 200
    entry = next(item for item in leaderboard.json() if item["userId"] == signup.json()["user"]["id"])
    assert entry["score"] == 999
    assert entry["username"] == credentials["username"]
