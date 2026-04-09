#!/bin/bash
# Entry point for local dev: sources worktree-env.sh (so OVERMIND_SOCKET,
# PG_PORT, etc. are exported) and then execs overmind with whatever args
# the caller passed.
#
# Usage:
#   ./scripts/dev.sh                      # all services (overmind start)
#   ./scripts/dev.sh start -l postgres,app  # subset
#   ./scripts/dev.sh restart worker       # overmind subcommand
set -e
source "$(dirname "$0")/worktree-env.sh"

# If no args, default to `start`. Otherwise pass args through (e.g. restart,
# connect, kill, etc).
if [ $# -eq 0 ]; then
  exec overmind start
else
  exec overmind "$@"
fi
