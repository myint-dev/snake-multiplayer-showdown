FROM node:24-bookworm-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build
RUN npm run build:static-shell

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend
ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    SNAKE_ROYALE_DATABASE_URL=sqlite:////data/snake_royale.db \
    SNAKE_ROYALE_STATIC_DIR=/app/static
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend ./
COPY --from=frontend-build /frontend/dist/client ./static
RUN mkdir -p /data
EXPOSE 8000
VOLUME ["/data"]
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]