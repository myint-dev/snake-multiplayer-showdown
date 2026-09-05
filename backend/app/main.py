import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .routers import active_games, auth, scores
from .database import initialize_database
from .store import seed_store

app = FastAPI(title="Snake Multiplayer Showdown API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Use the public API's `{message}` error envelope."""
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"message": message}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else {}
    return JSONResponse(status_code=400, content={"message": first_error.get("msg", "Invalid request data")})

# Health check endpoints for Render and load balancers (supporting GET and HEAD)
@app.api_route("/healthz", methods=["GET", "HEAD"])
@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check():
    return {"status": "ok"}


# Alias for active games in case older configs or external probes hit /api/active-games
@app.api_route("/api/active-games", methods=["GET", "HEAD"], include_in_schema=False)
async def legacy_active_games():
    from .store import store
    return store.active_games()


# 2. Register API routers
app.include_router(auth.router, prefix="/api")
app.include_router(scores.router, prefix="/api")
app.include_router(active_games.router, prefix="/api")
initialize_database()
seed_store()


def find_static_dir() -> Path | None:
    env_dir = os.getenv("SNAKE_ROYALE_STATIC_DIR") or os.getenv("STATIC_DIR")
    if env_dir:
        env_path = Path(env_dir).resolve()
        if env_path.is_dir():
            return env_path

    candidates = [
        Path(__file__).resolve().parent.parent / "static",
        Path(__file__).resolve().parent.parent.parent / "frontend" / "dist" / "client",
        Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    ]
    for candidate in candidates:
        if candidate.is_dir() and (candidate / "index.html").is_file():
            return candidate
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return None


static_dir = find_static_dir()
if static_dir and (static_dir / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")


@app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_frontend(path: str):
    """Serve static files and fall back to the frontend for client routes."""
    if path == "api" or path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    current_static = find_static_dir()
    if current_static and current_static.is_dir():
        requested_file = (current_static / path).resolve()
        if requested_file.is_relative_to(current_static) and requested_file.is_file():
            return FileResponse(requested_file)
        index_file = current_static / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

    return HTMLResponse(
        content="""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Snake Multiplayer Showdown</title></head>
<body style="font-family: sans-serif; padding: 2rem; text-align: center;">
  <h2>Frontend build not found</h2>
  <p>Please build the frontend by running <code>npm run build</code> inside the <code>frontend/</code> directory.</p>
</body>
</html>""",
        status_code=404,
    )
