"""Thread-safe in-memory persistence; replace this module with a database later."""

from dataclasses import dataclass, field
from threading import RLock
from time import time
from uuid import uuid4

from .models import ActiveGame, Direction, GameMode, GameSnapshot, Point, ScoreEntry, User


def now_ms() -> int:
    return int(time() * 1000)


@dataclass
class StoredUser:
    user: User
    password_hash: str


@dataclass
class MemoryStore:
    users: dict[str, StoredUser] = field(default_factory=dict)
    usernames: dict[str, str] = field(default_factory=dict)
    sessions: dict[str, str] = field(default_factory=dict)
    scores: list[ScoreEntry] = field(default_factory=list)
    games: dict[str, ActiveGame] = field(default_factory=dict)
    lock: RLock = field(default_factory=RLock)

    def next_id(self) -> str:
        return str(uuid4())


store = MemoryStore()


def seed_store() -> None:
    """Populate deterministic demo data once per process."""
    from .security import hash_password

    if store.users:
        return
    created = now_ms() - 86_400_000
    seeded: list[User] = []
    for index, (username, password) in enumerate(
        (("Ada", "snakepass"), ("Blaze", "snakepass"), ("Cy", "snakepass"))
    ):
        user = User(id=f"seed-user-{index + 1}", username=username, created_at=created + index)
        store.users[user.id] = StoredUser(user, hash_password(password))
        store.usernames[username.lower()] = user.id
        seeded.append(user)
    for index, (user, mode, score) in enumerate(
        ((seeded[0], GameMode.walls, 420), (seeded[1], GameMode.walls, 310), (seeded[2], GameMode.pass_through, 515))
    ):
        store.scores.append(ScoreEntry(id=f"seed-score-{index + 1}", user_id=user.id, username=user.username, mode=mode, score=score, created_at=created + 1000 + index))

    def snapshot(score: int) -> GameSnapshot:
        return GameSnapshot(grid=20, snake=[Point(x=8, y=10), Point(x=7, y=10)], food=Point(x=14, y=4), dir=Direction.right, score=score, status="running")

    for index, (user, mode, score) in enumerate(
        ((seeded[0], GameMode.walls, 80), (seeded[1], GameMode.pass_through, 125))
    ):
        game = ActiveGame(id=f"seed-game-{index + 1}", user_id=user.id, username=user.username, mode=mode, score=score, started_at=created + 2000 + index, is_bot=False, snapshot=snapshot(score))
        store.games[game.id] = game
