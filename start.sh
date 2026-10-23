#!/usr/bin/env bash

# Re-exec under bash when invoked as `sh script.sh` (dash lacks pipefail).
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
# Runs both halves of the product in the foreground:
#   backend/   FastAPI + SQLite on 0.0.0.0:${PORT:-8000}
#   frontend/  Vite dev server on 0.0.0.0:${FRONTEND_PORT:-5173}, proxying /api to the backend
set -euo pipefail
cd "$(dirname "$0")"

BACKEND_PORT="${PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

# Idempotent: creates the schema and demo data if they are missing, then exits.
( cd backend && python3 -m seed )

( cd backend && exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" ) &
BACKEND_PID=$!

( cd frontend && exec npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" --strictPort ) &
FRONTEND_PID=$!

echo "Kiln desk API listening on 0.0.0.0:${BACKEND_PORT}"
echo "Studio app    listening on 0.0.0.0:${FRONTEND_PORT}  (proxying /api → 127.0.0.1:${BACKEND_PORT})"

wait -n "$BACKEND_PID" "$FRONTEND_PID"
