"""Score submission and leaderboard routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from ..auth import current_user, optional_current_user
from ..models import Error, GameMode, ScoreEntry, SubmitScoreRequest
from ..store import StoredUser, now_ms, store

router = APIRouter(prefix="/leaderboard", tags=["scores"])


@router.get("", response_model=list[ScoreEntry])
def leaderboard(mode: GameMode, limit: Annotated[int, Query(ge=1)] = 10) -> list[ScoreEntry]:
    best: dict[str, ScoreEntry] = {}
    with store.lock:
        scores = list(store.scores)
    for entry in scores:
        if entry.mode != mode:
            continue
        previous = best.get(entry.user_id)
        if previous is None or entry.score > previous.score or (entry.score == previous.score and entry.created_at < previous.created_at):
            best[entry.user_id] = entry
    return sorted(best.values(), key=lambda entry: (-entry.score, entry.created_at))[:limit]


@router.post("", response_model=ScoreEntry, status_code=status.HTTP_201_CREATED, responses={401: {"model": Error}})
def submit_score(payload: SubmitScoreRequest, stored_user: Annotated[StoredUser, Depends(current_user)]) -> ScoreEntry:
    user = stored_user.user
    entry = ScoreEntry(id=store.next_id(), user_id=user.id, username=user.username, mode=payload.mode, score=payload.score, created_at=now_ms())
    with store.lock:
        store.scores.append(entry)
    return entry


@router.get("/personal-best", response_model=int)
def personal_best(mode: GameMode, stored_user: Annotated[StoredUser | None, Depends(optional_current_user)]) -> int:
    if stored_user is None:
        return 0
    with store.lock:
        return max((entry.score for entry in store.scores if entry.user_id == stored_user.user.id and entry.mode == mode), default=0)
