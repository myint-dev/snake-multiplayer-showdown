"""Pydantic request and response models for the public API."""

from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class GameMode(str, Enum):
    walls = "walls"
    pass_through = "pass-through"


class Direction(str, Enum):
    up = "up"
    down = "down"
    left = "left"
    right = "right"


class Point(APIModel):
    x: int
    y: int


class GameSnapshot(APIModel):
    grid: Annotated[int, Field(ge=1)]
    snake: Annotated[list[Point], Field(min_length=1)]
    food: Point
    dir: Direction
    score: Annotated[int, Field(ge=0)]
    status: str = Field(pattern="^(running|over)$")


class Credentials(APIModel):
    username: Annotated[str, Field(min_length=3)]
    password: Annotated[str, Field(min_length=6)]


class User(APIModel):
    id: str
    username: str
    created_at: int = Field(serialization_alias="createdAt")


class Session(APIModel):
    token: str
    user: User


class SubmitScoreRequest(APIModel):
    mode: GameMode
    score: Annotated[int, Field(ge=0)]


class ScoreEntry(APIModel):
    id: str
    user_id: str = Field(serialization_alias="userId")
    username: str
    mode: GameMode
    score: Annotated[int, Field(ge=0)]
    created_at: int = Field(serialization_alias="createdAt")


class StartGameRequest(APIModel):
    mode: GameMode
    snapshot: GameSnapshot


class ActiveGame(APIModel):
    id: str
    user_id: str = Field(serialization_alias="userId")
    username: str
    mode: GameMode
    score: Annotated[int, Field(ge=0)]
    started_at: int = Field(serialization_alias="startedAt")
    is_bot: bool = Field(serialization_alias="isBot")
    snapshot: GameSnapshot


class FinishGameRequest(APIModel):
    score: Annotated[int, Field(ge=0)]


class Error(APIModel):
    message: str
