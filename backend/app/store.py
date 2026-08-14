"""Database-backed persistence facade."""
from dataclasses import dataclass
from time import time
from uuid import uuid4
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from .database import SessionLocal
from .db_models import ActiveGameRecord, ScoreRecord, SessionRecord, UserRecord
from .models import ActiveGame, GameMode, GameSnapshot, ScoreEntry, User
def now_ms(): return int(time()*1000)
@dataclass(frozen=True)
class StoredUser: user: User; password_hash: str
def _user(r): return User(id=r.id,username=r.username,created_at=r.created_at)
def _stored(r): return StoredUser(_user(r),r.password_hash) if r else None
def _score(r): return ScoreEntry(id=r.id,user_id=r.user_id,username=r.username,mode=r.mode,score=r.score,created_at=r.created_at)
def _game(r): return ActiveGame(id=r.id,user_id=r.user_id,username=r.username,mode=r.mode,score=r.score,started_at=r.started_at,is_bot=r.is_bot,snapshot=GameSnapshot.model_validate(r.snapshot))
class DatabaseStore:
 def next_id(self): return str(uuid4())
 def create_user(self,username,password_hash):
  r=UserRecord(id=self.next_id(),username=username,username_normalized=username.lower(),password_hash=password_hash,created_at=now_ms())
  try:
   with SessionLocal.begin() as s:s.add(r)
  except IntegrityError:return None
  return _user(r)
 def user_by_username(self,username):
  with SessionLocal() as s:return _stored(s.scalar(select(UserRecord).where(UserRecord.username_normalized==username.lower())))
 def user_by_session(self,token):
  with SessionLocal() as s:return _stored(s.scalar(select(UserRecord).join(SessionRecord).where(SessionRecord.token==token)))
 def create_session(self,user_id,token):
  with SessionLocal.begin() as s:s.add(SessionRecord(token=token,user_id=user_id))
 def delete_session(self,token):
  with SessionLocal.begin() as s:
   if r:=s.get(SessionRecord,token):s.delete(r)
 def add_score(self,u,m,score):
  r=ScoreRecord(id=self.next_id(),user_id=u.id,username=u.username,mode=m.value,score=score,created_at=now_ms())
  with SessionLocal.begin() as s:s.add(r)
  return _score(r)
 def leaderboard(self,m,limit):
  with SessionLocal() as s:rs=s.scalars(select(ScoreRecord).where(ScoreRecord.mode==m.value)).all()
  best={}
  for r in rs:
   p=best.get(r.user_id)
   if p is None or r.score>p.score or(r.score==p.score and r.created_at<p.created_at):best[r.user_id]=r
  return [_score(r) for r in sorted(best.values(),key=lambda r:(-r.score,r.created_at))[:limit]]
 def personal_best(self,user_id,m):
  with SessionLocal() as s:return s.scalar(select(func.max(ScoreRecord.score)).where(ScoreRecord.user_id==user_id,ScoreRecord.mode==m.value))or 0
 def create_game(self,u,m,snap):
  r=ActiveGameRecord(id=self.next_id(),user_id=u.id,username=u.username,mode=m.value,score=snap.score,started_at=now_ms(),is_bot=False,snapshot=snap.model_dump(mode="json"))
  with SessionLocal.begin() as s:s.add(r)
  return _game(r)
 def active_games(self):
  with SessionLocal() as s:return [_game(r) for r in s.scalars(select(ActiveGameRecord).order_by(ActiveGameRecord.score.desc())).all()]
 def game(self,id):
  with SessionLocal() as s:
   r=s.get(ActiveGameRecord,id);return _game(r)if r else None
 def update_game_snapshot(self,id,snap):
  with SessionLocal.begin() as s:
   if r:=s.get(ActiveGameRecord,id):r.snapshot,r.score=snap.model_dump(mode="json"),snap.score
 def remove_game(self,id):
  with SessionLocal.begin() as s:
   if r:=s.get(ActiveGameRecord,id):s.delete(r)
store=DatabaseStore()
def seed_store():
 from .models import Direction,Point
 from .security import hash_password
 with SessionLocal() as s:
  if s.scalar(select(UserRecord.id).limit(1)):return
 created=now_ms()-86400000;users=[]
 with SessionLocal.begin() as s:
  for i,(name,password) in enumerate((("Ada","snakepass"),("Blaze","snakepass"),("Cy","snakepass"))):
   u=User(id=f"seed-user-{i+1}",username=name,created_at=created+i);users.append(u);s.add(UserRecord(id=u.id,username=name,username_normalized=name.lower(),password_hash=hash_password(password),created_at=u.created_at))
  for i,(u,m,score) in enumerate(((users[0],GameMode.walls,420),(users[1],GameMode.walls,310),(users[2],GameMode.pass_through,515))):s.add(ScoreRecord(id=f"seed-score-{i+1}",user_id=u.id,username=u.username,mode=m.value,score=score,created_at=created+1000+i))
  for i,(u,m,score) in enumerate(((users[0],GameMode.walls,80),(users[1],GameMode.pass_through,125))):
   snap=GameSnapshot(grid=20,snake=[Point(x=8,y=10),Point(x=7,y=10)],food=Point(x=14,y=4),dir=Direction.right,score=score,status="running");s.add(ActiveGameRecord(id=f"seed-game-{i+1}",user_id=u.id,username=u.username,mode=m.value,score=score,started_at=created+2000+i,is_bot=False,snapshot=snap.model_dump(mode="json")))
