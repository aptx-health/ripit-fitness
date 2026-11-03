#!/usr/bin/env bash
# Build this checkout and serve it with `next start`, for the tap test: a production
# build prefetches links and doesn't compile on demand, as the phone sees it.
# Usage: serve-build.sh start | stop     (PERF_PORT, PERF_DATABASE_URL override)
# Dev data only: the checkout's own Postgres, every outbound notifier blank, and a
# throwaway auth secret (`next start` refuses BetterAuth's default one).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
source ./scripts/worktree-env.sh

PORT="${PERF_PORT:-$((3000 + WORKTREE_SLOT * 100 + 50))}"
DB="${PERF_DATABASE_URL:-postgresql://postgres:postgres@localhost:${PG_PORT}/ripit}"
TMP="${TMPDIR:-/tmp}"
STATE="${TMP%/}/perf-check-serve-${PORT}"
URL="http://localhost:${PORT}"

case "${1:-}" in
  start)
    # Remember whether the DB was already up, so stop leaves it as found.
    if [ "$(docker inspect -f '{{.State.Running}}' "$PG_CONTAINER_NAME" 2>/dev/null)" = "true" ]; then
      echo running > "${STATE}.db"
    else
      echo stopped > "${STATE}.db"
      docker start "$PG_CONTAINER_NAME" >/dev/null
    fi
    ENV="export DATABASE_URL='$DB' DIRECT_URL='$DB' BETTER_AUTH_URL='$URL' NEXT_PUBLIC_APP_URL='$URL' \
      BETTER_AUTH_SECRET='$(openssl rand -hex 32)' DISCORD_PROPOSALS_WEBHOOK_URL= DISCORD_WEBHOOK_URL= BARK_URL="
    echo "Building (a few minutes; log ${STATE}.log)"
    doppler run --project fitcsv --config dev_personal -- sh -c "$ENV; npm run build" > "${STATE}.log" 2>&1 \
      || { tail -20 "${STATE}.log"; exit 1; }
    nohup doppler run --project fitcsv --config dev_personal -- sh -c "$ENV; exec npx next start --port $PORT" >> "${STATE}.log" 2>&1 &
    for _ in $(seq 60); do
      curl -sf -o /dev/null "${URL}/api/health/live" && { echo "Serving ${URL}"; exit 0; }
      sleep 1
    done
    echo "Server didn't come up; see ${STATE}.log" >&2
    exit 1
    ;;
  stop)
    lsof -ti tcp:"$PORT" | xargs kill 2>/dev/null || true
    if [ "$(cat "${STATE}.db" 2>/dev/null)" = "stopped" ]; then docker stop "$PG_CONTAINER_NAME" >/dev/null; fi
    rm -f "${STATE}.db"
    echo "Stopped ${URL}"
    ;;
  *) echo "usage: $0 start|stop" >&2; exit 2 ;;
esac
