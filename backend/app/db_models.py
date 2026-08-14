from typing import Any
from sqlalchemy import BigInteger, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
class UserRecord(Base):
 __tablename__="users"; id: Mapped[str]=mapped_column(String(36),primary_key=True); username: Mapped[str]=mapped_column(String(255)); username_normalized: Mapped[str]=mapped_column(String(255),unique=True,index=True); password_hash: Mapped[str]=mapped_column(String(255)); created_at: Mapped[int]=mapped_column(BigInteger)
class SessionRecord(Base):
 __tablename__="sessions"; token: Mapped[str]=mapped_column(String(255),primary_key=True); user_id: Mapped[str]=mapped_column(ForeignKey("users.id"),index=True)
class ScoreRecord(Base):
 __tablename__="scores"; id: Mapped[str]=mapped_column(String(36),primary_key=True); user_id: Mapped[str]=mapped_column(ForeignKey("users.id"),index=True); username: Mapped[str]=mapped_column(String(255)); mode: Mapped[str]=mapped_column(String(32),index=True); score: Mapped[int]=mapped_column(Integer); created_at: Mapped[int]=mapped_column(BigInteger)
class ActiveGameRecord(Base):
 __tablename__="active_games"; id: Mapped[str]=mapped_column(String(36),primary_key=True); user_id: Mapped[str]=mapped_column(ForeignKey("users.id"),index=True); username: Mapped[str]=mapped_column(String(255)); mode: Mapped[str]=mapped_column(String(32),index=True); score: Mapped[int]=mapped_column(Integer,index=True); started_at: Mapped[int]=mapped_column(BigInteger); is_bot: Mapped[bool]=mapped_column(default=False); snapshot: Mapped[dict[str,Any]]=mapped_column(JSON)
