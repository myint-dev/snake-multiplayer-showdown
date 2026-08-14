# Backend

The server persists users, bearer sessions, scores, and active games with SQLAlchemy.

Configure the database with `DATABASE_URL`. It defaults to `sqlite:///./snake.db` for local development:

```bash
DATABASE_URL=sqlite:///./snake.db uv run uvicorn app.main:app --reload
```

The application contains no SQLite-specific queries, so a supported SQLAlchemy URL can be supplied later, for example `postgresql+psycopg://user:password@host/snake` (with the matching PostgreSQL driver installed).
