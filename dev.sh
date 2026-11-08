#!/usr/bin/env bash
# Spins up the whole local stack: Postgres + Redis (Docker), the Spring Boot API and the Vite dev server.
# Ctrl+C stops the API and frontend; the datastores keep running (stop them with `docker compose down`).
#
# Usage: ./dev.sh [--seed]      (from PowerShell: bash dev.sh)
#   --seed   start the backend with the seed profile to load demo data (skips itself if already loaded)

set -euo pipefail
cd "$(dirname "$0")"

PROFILE_ARG=""
case "${1:-}" in
  --seed)    PROFILE_ARG="-Dspring-boot.run.profiles=seed" ;;
  -h|--help) sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "")        ;;
  *)         echo "Unknown option: $1 (try --help)" >&2; exit 1 ;;
esac

for cmd in docker java node npm; do
  command -v "$cmd" >/dev/null || { echo "✗ $cmd not found on PATH" >&2; exit 1; }
done
docker info >/dev/null 2>&1 || { echo "✗ Docker isn't running. Start Docker Desktop and try again." >&2; exit 1; }

echo "▶ Starting Postgres and Redis…"
docker compose up -d --wait

if [ ! -d frontend/node_modules ]; then
  echo "▶ Installing frontend dependencies…"
  (cd frontend && npm install)
fi

# Each service runs in its own process group so Ctrl+C can take down its whole tree
# (spring-boot:run forks a second JVM that would otherwise keep port 8080)
set -m
PIDS=()

stop_tree() {
  local pid=$1
  if [ -r "/proc/$pid/winpid" ]; then
    # Git Bash on Windows: native processes need taskkill to stop their children
    taskkill //F //T //PID "$(cat "/proc/$pid/winpid")" >/dev/null 2>&1 || true
  else
    kill -- "-$pid" 2>/dev/null || true
  fi
}

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "▶ Stopping API and frontend…"
  for pid in "${PIDS[@]}"; do stop_tree "$pid"; done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "▶ Starting API on http://localhost:8080/api${PROFILE_ARG:+ (seed profile)}"
# shellcheck disable=SC2086 # PROFILE_ARG is empty or a single word
(cd backend && exec ./mvnw -q spring-boot:run $PROFILE_ARG) > >(sed -u 's/^/[api] /') 2>&1 &
PIDS+=($!)

echo "▶ Starting frontend on http://localhost:5173"
(cd frontend && exec npm run dev) > >(sed -u 's/^/[web] /') 2>&1 &
PIDS+=($!)

# Exit (and clean up the other) as soon as either service stops
while kill -0 "${PIDS[0]}" 2>/dev/null && kill -0 "${PIDS[1]}" 2>/dev/null; do sleep 1; done
