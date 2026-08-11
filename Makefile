.PHONY: install backend frontend dev backend-tests frontend-tests test

install:
	cd backend && uv sync
	cd frontend && npm install

backend:
	cd backend && uv run python main.py

frontend:
	cd frontend && npm run dev

dev:
	./scripts/dev.sh

backend-tests:
	cd backend && uv run pytest

frontend-tests:
	cd frontend && npm test

test: backend-tests frontend-tests
