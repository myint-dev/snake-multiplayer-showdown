#!/usr/bin/env bash
# ==============================================================================
# render-deploy-check.sh
# Verifies database configuration, connection, and schema migrations before
# the application starts up on Render or in local/Docker environments.
# ==============================================================================
set -euo pipefail

log_info() {
    echo "==> [render-deploy-check] [INFO] $*"
}

log_warn() {
    echo "==> [render-deploy-check] [WARN] $*" >&2
}

log_error() {
    echo "==> [render-deploy-check] [ERROR] $*" >&2
}

# ------------------------------------------------------------------------------
# 1. Verify Database Configuration
# ------------------------------------------------------------------------------
log_info "Verifying database configuration..."

# Fallback to DATABASE_URL if SNAKE_ROYALE_DATABASE_URL is not set
if [[ -z "${SNAKE_ROYALE_DATABASE_URL:-}" ]]; then
    if [[ -n "${DATABASE_URL:-}" ]]; then
        log_warn "SNAKE_ROYALE_DATABASE_URL is not set, falling back to DATABASE_URL."
        export SNAKE_ROYALE_DATABASE_URL="$DATABASE_URL"
    else
        log_error "Missing required environment variable: SNAKE_ROYALE_DATABASE_URL"
        log_error "Please configure SNAKE_ROYALE_DATABASE_URL in your Render service environment variables."
        log_error "Example: postgres://avnadmin:<password>@<host>:<port>/<dbname>?sslmode=require"
        exit 1
    fi
fi

# Print masked URL for debugging and auditing
MASKED_URL=$(echo "$SNAKE_ROYALE_DATABASE_URL" | sed -E 's|://([^:]+):([^@]+)@|://\1:****@|')
log_info "Configured Database URL: $MASKED_URL"

# ------------------------------------------------------------------------------
# 2. Locate Python Runtime & Setup PYTHONPATH
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PYTHON_EXEC=""
if [[ -x "/app/.venv/bin/python" ]]; then
    PYTHON_EXEC="/app/.venv/bin/python"
elif [[ -x "$REPO_ROOT/backend/.venv/bin/python" ]]; then
    PYTHON_EXEC="$REPO_ROOT/backend/.venv/bin/python"
elif [[ -x "$PWD/.venv/bin/python" ]]; then
    PYTHON_EXEC="$PWD/.venv/bin/python"
elif command -v uv >/dev/null 2>&1; then
    PYTHON_EXEC="uv run python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_EXEC="python3"
else
    PYTHON_EXEC="python"
fi

log_info "Using Python executable: $PYTHON_EXEC"

# Set up PYTHONPATH so Python can locate backend modules
if [[ -d "/app/app" ]]; then
    export PYTHONPATH="/app:${PYTHONPATH:-}"
elif [[ -d "$REPO_ROOT/backend/app" ]]; then
    export PYTHONPATH="$REPO_ROOT/backend:${PYTHONPATH:-}"
elif [[ -d "$PWD/backend/app" ]]; then
    export PYTHONPATH="$PWD/backend:${PYTHONPATH:-}"
fi

# ------------------------------------------------------------------------------
# 3. Verify Database Connectivity (with Retries) and Run Migrations
# ------------------------------------------------------------------------------
MAX_RETRIES="${DB_MAX_RETRIES:-5}"
RETRY_DELAY="${DB_RETRY_DELAY:-3}"

log_info "Testing database connectivity and verifying migrations (max retries: $MAX_RETRIES)..."

CHECK_SUCCESS=false

for attempt in $(seq 1 "$MAX_RETRIES"); do
    log_info "Attempt $attempt of $MAX_RETRIES: connecting to database..."
    if $PYTHON_EXEC -c '
import os
import sys
from pathlib import Path

# Ensure app modules are importable
for candidate in [Path("/app"), Path("backend"), Path(".")]:
    if (candidate / "app").is_dir():
        sys.path.insert(0, str(candidate.resolve()))
        break

from sqlalchemy import inspect, text
from app.database import engine, initialize_database
from app.db_models import Base
from app.store import seed_store

# 1. Verify basic connection and query execution
with engine.connect() as conn:
    conn.execute(text("SELECT 1"))
print("[render-deploy-check] Database connection established successfully.")

# 2. Check for Alembic migrations if configured
if Path("alembic.ini").is_file() or Path("backend/alembic.ini").is_file():
    from alembic.config import Config
    from alembic import command
    cfg_file = "alembic.ini" if Path("alembic.ini").is_file() else "backend/alembic.ini"
    print(f"[render-deploy-check] Running Alembic migrations with {cfg_file}...")
    alembic_cfg = Config(cfg_file)
    command.upgrade(alembic_cfg, "head")

# 3. Initialize/verify schema tables (SQLAlchemy metadata create_all)
initialize_database()

# 4. Verify all expected tables exist
inspector = inspect(engine)
existing_tables = set(inspector.get_table_names())
expected_tables = set(Base.metadata.tables.keys())
missing = expected_tables - existing_tables
if missing:
    raise RuntimeError(f"Missing database tables after initialization: {missing}")

print(f"[render-deploy-check] Schema verified. Tables present: {sorted(list(existing_tables))}")

# 5. Initialize seed data if required
seed_store()
print("[render-deploy-check] Database seed state verified.")
'; then
        CHECK_SUCCESS=true
        break
    else
        log_warn "Connection attempt $attempt failed. Waiting $RETRY_DELAY seconds before retrying..."
        sleep "$RETRY_DELAY"
    fi
done

if [[ "$CHECK_SUCCESS" != "true" ]]; then
    log_error "Could not connect to database or verify migrations after $MAX_RETRIES attempts."
    exit 1
fi

log_info "Database checks and migrations completed successfully."

# ------------------------------------------------------------------------------
# 4. Launch Application (if command arguments provided)
# ------------------------------------------------------------------------------
if [[ $# -gt 0 ]]; then
    CMD_ARGS=()
    PREV_ARG=""
    for arg in "$@"; do
        if [[ -n "${PORT:-}" && "$arg" == "8000" && "$PREV_ARG" == "--port" ]]; then
            CMD_ARGS+=("$PORT")
        else
            CMD_ARGS+=("$arg")
        fi
        PREV_ARG="$arg"
    done
    log_info "Executing application command: ${CMD_ARGS[*]}"
    exec "${CMD_ARGS[@]}"
fi

log_info "Deploy check finished successfully. Ready for app startup."
