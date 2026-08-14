"""Score submission and leaderboard routes."""
from typing import Annotated
from fastapi import APIRouter,Depends,Query,status
from ..auth import current_user,optional_current_user
from ..models import Error,GameMode,ScoreEntry,SubmitScoreRequest
from ..store import StoredUser,store
router=APIRouter(prefix="/leaderboard",tags=["scores"])
@router.get("",response_model=list[ScoreEntry])
def leaderboard(mode:GameMode,limit:Annotated[int,Query(ge=1)]=10)->list[ScoreEntry]:return store.leaderboard(mode,limit)
@router.post("",response_model=ScoreEntry,status_code=status.HTTP_201_CREATED,responses={401:{"model":Error}})
def submit_score(payload:SubmitScoreRequest,stored_user:Annotated[StoredUser,Depends(current_user)])->ScoreEntry:return store.add_score(stored_user.user,payload.mode,payload.score)
@router.get("/personal-best",response_model=int)
def personal_best(mode:GameMode,stored_user:Annotated[StoredUser|None,Depends(optional_current_user)])->int:return store.personal_best(stored_user.user.id,mode) if stored_user else 0
