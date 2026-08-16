"""FastAPI application configuration."""

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .routers import active_games, auth, scores
from .database import initialize_database
from .store import seed_store

app = FastAPI(title="Snake Multiplayer Showdown API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Use the public API's `{message}` error envelope."""
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"message": message}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else {}
    return JSONResponse(status_code=400, content={"message": first_error.get("msg", "Invalid request data")})


app.include_router(auth.router, prefix="/api")
app.include_router(scores.router, prefix="/api")
app.include_router(active_games.router, prefix="/api")
initialize_database()
seed_store()


static_dir = Path(__file__).resolve().parent.parent / "static"
if static_dir.is_dir():
    # Hashed JavaScript and CSS bundles can be cached independently of the SPA
    # document. The catch-all route below handles the document and client routes.
    assets_dir = static_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def serve_frontend(path: str):
        """Serve static files and fall back to the frontend for client routes."""
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        requested_file = (static_dir / path).resolve()
        if requested_file.is_relative_to(static_dir) and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(static_dir / "index.html")
