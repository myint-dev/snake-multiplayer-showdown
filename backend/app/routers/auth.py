"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auth import create_token, current_session
from ..models import Credentials, Error, Session, User
from ..security import hash_password, verify_password
from ..store import StoredUser, now_ms, store

router = APIRouter(prefix="/auth", tags=["auth"])


def session_for(user: User) -> Session:
    return Session(token=create_token(user.id), user=user)


@router.post("/signup", response_model=Session, status_code=status.HTTP_201_CREATED, responses={400: {"model": Error}, 409: {"model": Error}})
def signup(credentials: Credentials) -> Session:
    with store.lock:
        if credentials.username.lower() in store.usernames:
            raise HTTPException(status_code=409, detail="Username is already taken")
        user = User(id=store.next_id(), username=credentials.username, created_at=now_ms())
        store.users[user.id] = StoredUser(user, hash_password(credentials.password))
        store.usernames[user.username.lower()] = user.id
    return session_for(user)


@router.post("/login", response_model=Session, responses={401: {"model": Error}})
def login(credentials: Credentials) -> Session:
    with store.lock:
        user_id = store.usernames.get(credentials.username.lower())
        stored = store.users.get(user_id) if user_id else None
    if stored is None or not verify_password(credentials.password, stored.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return session_for(stored.user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, responses={401: {"model": Error}})
def logout(session: tuple[StoredUser, str] = Depends(current_session)) -> Response:
    with store.lock:
        store.sessions.pop(session[1], None)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=Session, responses={401: {"model": Error}})
def me(session: tuple[StoredUser, str] = Depends(current_session)) -> Session:
    return Session(token=session[1], user=session[0].user)
