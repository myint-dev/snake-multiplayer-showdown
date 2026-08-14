"""FastAPI application configuration."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
