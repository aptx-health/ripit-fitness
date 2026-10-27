#!/usr/bin/env bash
# Serve this checkout's branch over the tailnet so Dustin can test on his phone.
# Usage: phone-preview.sh start | stop | status
# Dev data only: uses the checkout's own Postgres and blanks every outbound notifier.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
source ./scripts/worktree-env.sh

APP_PORT=$((3000 + WORKTREE_SLOT * 100))
TS_PORT="${PHONE_PREVIEW_PORT:-10000}"   # tailscale serve allows 443, 8443, 10000
HOST="$(tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
URL="https://${HOST}:${TS_PORT}"
DB="postgresql://postgres:postgres@localhost:${PG_PORT}/ripit"
PIDFILE="/tmp/ripit-phone-preview-${WORKTREE_SLOT}.pid"

case "${1:-}" in
  start)
    docker start "$PG_CONTAINER_NAME" >/dev/null
    tailscale serve --bg --https="$TS_PORT" "http://127.0.0.1:${APP_PORT}" >/dev/null
    echo "Building and starting on :${APP_PORT}; open ${URL}"
    doppler run --project fitcsv --config dev_personal -- sh -c "
      export DATABASE_URL='$DB' DIRECT_URL='$DB' BETTER_AUTH_URL='$URL' NEXT_PUBLIC_APP_URL='$URL' \
             DISCORD_PROPOSALS_WEBHOOK_URL= DISCORD_WEBHOOK_URL= BARK_URL=
      npm run build && exec npx next start --port ${APP_PORT}" &
    echo $! > "$PIDFILE"
    wait
    ;;
  stop)
    [ -f "$PIDFILE" ] && pkill -P "$(cat "$PIDFILE")" 2>/dev/null; rm -f "$PIDFILE"
    lsof -ti tcp:"$APP_PORT" | xargs kill 2>/dev/null || true
    tailscale serve --https="$TS_PORT" off >/dev/null 2>&1 || true
    docker stop "$PG_CONTAINER_NAME" >/dev/null
    echo "Stopped preview, tailnet port ${TS_PORT} and ${PG_CONTAINER_NAME}"
    ;;
  status)
    tailscale serve status | grep -A1 ":${TS_PORT}" || echo "tailnet port ${TS_PORT} not served"
    curl -s -o /dev/null -w "app ${URL}: %{http_code}\n" "${URL}/api/health/live" || true
    ;;
  *) echo "usage: $0 start|stop|status" >&2; exit 2 ;;
esac
