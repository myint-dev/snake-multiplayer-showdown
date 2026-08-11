#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  trap - INT TERM
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}

(
  cd "$project_root/backend"
  exec uv run python main.py
) &
backend_pid=$!

(
  cd "$project_root/frontend"
  exec npm run dev
) &
frontend_pid=$!

trap 'cleanup; exit 0' INT TERM

wait "$backend_pid" || exit_code=$?
kill "$frontend_pid" 2>/dev/null || true
wait "$frontend_pid" 2>/dev/null || true
exit "${exit_code:-0}"
