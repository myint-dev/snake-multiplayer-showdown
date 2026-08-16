# syntax=docker/dockerfile:1

# Build the browser application separately so Node is absent from the final image.
FROM node:24-bookworm-slim AS frontend-build
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
# The browser calls the FastAPI service in this same image.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build \
    && test -s .output/public/index.html

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    SNAKE_ROYALE_DATABASE_URL=sqlite:////data/snake_royale.db

# Install locked production dependencies before copying application source to
# retain Docker layer caching when only backend code changes.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend ./
COPY --from=frontend-build /frontend/.output/public ./static
RUN mkdir -p /data

EXPOSE 8000
VOLUME ["/data"]
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
