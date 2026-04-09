#!/bin/bash
# Entry point for local dev: sources worktree-env.sh (so OVERMIND_SOCKET,
# PG_PORT, etc. are exported) and then execs overmind.
#
# Default (no args) starts just postgres + app — the common subset.
# Worker and minio are opt-in.
#
# Usage:
#   ./scripts/dev.sh                            # postgres + app
#   ./scripts/dev.sh -l postgres,redis,app      # custom subset (first arg starts with -)
#   ./scripts/dev.sh start                      # ALL services (postgres,redis,worker,minio,app)
#   ./scripts/dev.sh start -l postgres,app,redis
#   ./scripts/dev.sh restart worker             # any overmind subcommand
#   ./scripts/dev.sh connect app
set -e
source "$(dirname "$0")/worktree-env.sh"

if [ $# -eq 0 ]; then
  # Default: common minimal subset
  exec overmind start -l postgres,app
elif [[ "$1" == -* ]]; then
  # First arg is a flag (e.g. -l) — treat as `start` with those flags
  exec overmind start "$@"
else
  # First arg is a subcommand (start, restart, connect, kill, etc.) — pass through
  exec overmind "$@"
fi
