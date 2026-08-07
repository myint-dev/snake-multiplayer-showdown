"""Bearer-token authentication dependencies and token issuance."""

import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .store import StoredUser, store

_bearer = HTTPBearer(auto_error=False)


def create_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    with store.lock:
        store.sessions[token] = user_id
    return token


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing, invalid, or expired session token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def current_session(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> tuple[StoredUser, str]:
    if credentials is None:
        raise unauthorized()
    with store.lock:
        user_id = store.sessions.get(credentials.credentials)
        user = store.users.get(user_id) if user_id else None
    if user is None:
        raise unauthorized()
    return user, credentials.credentials


def current_user(session: Annotated[tuple[StoredUser, str], Depends(current_session)]) -> StoredUser:
    return session[0]


def optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> StoredUser | None:
    if credentials is None:
        return None
    with store.lock:
        user_id = store.sessions.get(credentials.credentials)
        return store.users.get(user_id) if user_id else None
