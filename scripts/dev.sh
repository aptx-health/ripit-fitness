#!/bin/bash
# Entry point for local dev: sources worktree-env.sh (so OVERMIND_SOCKET,
# PG_PORT, etc. are exported) and then execs overmind.
#
# Default (no args) starts postgres + redis + worker + app.
# Minio is opt-in.
#
# Usage:
#   ./scripts/dev.sh                            # postgres + app
#   ./scripts/dev.sh -l postgres,redis,app      # custom subset (first arg starts with -)
#   ./scripts/dev.sh start                      # ALL services (postgres,redis,worker,minio,app)
#   ./scripts/dev.sh start -l postgres,app,redis
#   ./scripts/dev.sh restart worker             # any overmind subcommand
#   ./scripts/dev.sh connect app
set -e

# Pre-flight: verify Docker is responsive (hangs when VM is frozen)
if ! perl -e 'alarm 5; exec @ARGV' -- docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running or not responding (timed out after 5s)." >&2
  echo "Try: open -a Docker   (or restart Docker Desktop)" >&2
  exit 1
fi

source "$(dirname "$0")/worktree-env.sh"

if [ $# -eq 0 ]; then
  # Default: postgres + redis + worker + app
  exec overmind start -l postgres,redis,worker,app
elif [[ "$1" == -* ]]; then
  # First arg is a flag (e.g. -l) — treat as `start` with those flags
  exec overmind start "$@"
else
  # First arg is a subcommand (start, restart, connect, kill, etc.) — pass through
  exec overmind "$@"
fi
