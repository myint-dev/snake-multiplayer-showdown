"""Active multiplayer game routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auth import current_user
from ..models import ActiveGame, Error, FinishGameRequest, GameSnapshot, StartGameRequest
from ..store import StoredUser, now_ms, store

router = APIRouter(prefix="/games", tags=["active-games"])


@router.post("", response_model=ActiveGame, status_code=status.HTTP_201_CREATED, responses={401: {"model": Error}})
def start_game(payload: StartGameRequest, stored_user: Annotated[StoredUser, Depends(current_user)]) -> ActiveGame:
    user = stored_user.user
    game = ActiveGame(id=store.next_id(), user_id=user.id, username=user.username, mode=payload.mode, score=payload.snapshot.score, started_at=now_ms(), is_bot=False, snapshot=payload.snapshot)
    with store.lock:
        store.games[game.id] = game
    return game


@router.get("/active", response_model=list[ActiveGame])
def list_active_games() -> list[ActiveGame]:
    with store.lock:
        return sorted(store.games.values(), key=lambda game: -game.score)


@router.get("/{game_id}", response_model=ActiveGame, responses={404: {"model": Error}})
def get_game(game_id: str) -> ActiveGame:
    with store.lock:
        game = store.games.get(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game does not exist or is no longer active")
    return game


@router.put("/{game_id}/snapshot", status_code=status.HTTP_204_NO_CONTENT)
def publish_snapshot(game_id: str, snapshot: GameSnapshot) -> Response:
    with store.lock:
        if (game := store.games.get(game_id)) is not None:
            game.snapshot, game.score = snapshot, snapshot.score
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{game_id}/finish", status_code=status.HTTP_204_NO_CONTENT)
def finish_game(game_id: str, _: FinishGameRequest) -> Response:
    with store.lock:
        store.games.pop(game_id, None)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
