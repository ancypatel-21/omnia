#!/usr/bin/env bash
# One-command dev launcher for Omnia: Postgres+Redis (Docker), FastAPI backend,
# and the Vite frontend. Ctrl+C stops the backend/frontend; the DB containers
# are left running (data persists) — stop them yourself with `docker compose down`.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! docker info >/dev/null 2>&1; then
  echo "Docker doesn't seem to be running. Start Docker Desktop and try again."
  exit 1
fi

if [ ! -x "backend/.venv/bin/uvicorn" ]; then
  echo "Backend virtualenv not found. Set it up first:"
  echo "  cd backend && python3.12 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Frontend dependencies not installed. Run this first:"
  echo "  cd frontend && npm install"
  exit 1
fi

echo "==> Starting Postgres + Redis (Docker)..."
docker compose up -d

echo "==> Waiting for Postgres to be healthy..."
for _ in $(seq 1 30); do
  health=$(docker inspect --format='{{.State.Health.Status}}' omnia-postgres-1 2>/dev/null || echo "starting")
  [ "$health" = "healthy" ] && break
  sleep 1
done

PIDS=()
CLEANED_UP=0

cleanup() {
  [ "$CLEANED_UP" = "1" ] && return
  CLEANED_UP=1
  echo ""
  echo "==> Stopping backend and frontend..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "==> Postgres/Redis containers are still running (data persists)."
  echo "    Stop them with: docker compose down"
}
trap cleanup EXIT INT TERM

echo "==> Starting backend (FastAPI on :8000)..."
(
  cd "$ROOT_DIR/backend"
  source .venv/bin/activate
  exec uvicorn app.main:app --reload --port 8000
) &
PIDS+=("$!")

echo "==> Starting frontend (Vite on :5173)..."
(
  cd "$ROOT_DIR/frontend"
  exec npm run dev
) &
PIDS+=("$!")

cat <<EOF

Omnia is starting up:
  Frontend: http://localhost:5173
  Backend:  http://localhost:8000/docs

Press Ctrl+C to stop the backend + frontend (Docker containers keep running).
EOF

wait
