"""Bearer-token authentication dependencies and token issuance."""
import secrets
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .store import StoredUser, store
_bearer=HTTPBearer(auto_error=False)
def create_token(user_id: str)->str:
 token=secrets.token_urlsafe(32);store.create_session(user_id,token);return token
def unauthorized()->HTTPException:return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Missing, invalid, or expired session token",headers={"WWW-Authenticate":"Bearer"})
def current_session(credentials: Annotated[HTTPAuthorizationCredentials|None,Depends(_bearer)])->tuple[StoredUser,str]:
 if credentials is None:raise unauthorized()
 user=store.user_by_session(credentials.credentials)
 if user is None:raise unauthorized()
 return user,credentials.credentials
def current_user(session:Annotated[tuple[StoredUser,str],Depends(current_session)])->StoredUser:return session[0]
def optional_current_user(credentials:Annotated[HTTPAuthorizationCredentials|None,Depends(_bearer)])->StoredUser|None:return store.user_by_session(credentials.credentials) if credentials else None
