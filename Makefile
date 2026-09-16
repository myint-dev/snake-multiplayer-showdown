.PHONY: install backend frontend dev build backend-tests frontend-tests test backend-integration-tests

install:
	cd backend && uv sync
	cd frontend && npm install

build:
	cd frontend && npm run build

backend:
	cd backend && uv run python main.py

frontend:
	cd frontend && npm run dev

dev:
	./scripts/dev.sh

backend-tests:
	cd backend && uv run pytest tests

frontend-tests:
	cd frontend && npm test

backend-integration-tests:
	cd backend && uv run pytest tests_integration

test: backend-tests frontend-tests backend-integration-tests
