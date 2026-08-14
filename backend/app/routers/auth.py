"""Authentication routes."""
from fastapi import APIRouter,Depends,HTTPException,Response,status
from ..auth import create_token,current_session
from ..models import Credentials,Error,Session,User
from ..security import hash_password,verify_password
from ..store import StoredUser,store
router=APIRouter(prefix="/auth",tags=["auth"])
def session_for(user:User)->Session:return Session(token=create_token(user.id),user=user)
@router.post("/signup",response_model=Session,status_code=status.HTTP_201_CREATED,responses={400:{"model":Error},409:{"model":Error}})
def signup(credentials:Credentials)->Session:
 user=store.create_user(credentials.username,hash_password(credentials.password))
 if user is None:raise HTTPException(status_code=409,detail="Username is already taken")
 return session_for(user)
@router.post("/login",response_model=Session,responses={401:{"model":Error}})
def login(credentials:Credentials)->Session:
 stored=store.user_by_username(credentials.username)
 if stored is None or not verify_password(credentials.password,stored.password_hash):raise HTTPException(status_code=401,detail="Invalid username or password")
 return session_for(stored.user)
@router.post("/logout",status_code=status.HTTP_204_NO_CONTENT,responses={401:{"model":Error}})
def logout(session:tuple[StoredUser,str]=Depends(current_session))->Response:store.delete_session(session[1]);return Response(status_code=204)
@router.get("/me",response_model=Session,responses={401:{"model":Error}})
def me(session:tuple[StoredUser,str]=Depends(current_session))->Session:return Session(token=session[1],user=session[0].user)
