"""Active multiplayer game routes."""
from typing import Annotated
from fastapi import APIRouter,Depends,HTTPException,Response,status
from ..auth import current_user
from ..models import ActiveGame,Error,FinishGameRequest,GameSnapshot,StartGameRequest
from ..store import StoredUser,store
router=APIRouter(prefix="/games",tags=["active-games"])
@router.post("",response_model=ActiveGame,status_code=status.HTTP_201_CREATED,responses={401:{"model":Error}})
def start_game(payload:StartGameRequest,stored_user:Annotated[StoredUser,Depends(current_user)])->ActiveGame:return store.create_game(stored_user.user,payload.mode,payload.snapshot)
@router.get("/active",response_model=list[ActiveGame])
def list_active_games()->list[ActiveGame]:return store.active_games()
@router.get("/{game_id}",response_model=ActiveGame,responses={404:{"model":Error}})
def get_game(game_id:str)->ActiveGame:
 game=store.game(game_id)
 if game is None:raise HTTPException(status_code=404,detail="Game does not exist or is no longer active")
 return game
@router.put("/{game_id}/snapshot",status_code=status.HTTP_204_NO_CONTENT)
def publish_snapshot(game_id:str,snapshot:GameSnapshot)->Response:store.update_game_snapshot(game_id,snapshot);return Response(status_code=204)
@router.post("/{game_id}/finish",status_code=status.HTTP_204_NO_CONTENT)
def finish_game(game_id:str,_:FinishGameRequest)->Response:store.remove_game(game_id);return Response(status_code=204)
