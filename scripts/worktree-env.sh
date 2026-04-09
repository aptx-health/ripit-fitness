#!/bin/bash
# Detects worktree slot and exports unique container names/ports.
# Source this from other scripts: source "$(dirname "$0")/worktree-env.sh"
#
# Slot 0 = primary repo (/Users/dustin/repos/fitcsv)
# Slot 1-9 = worktrees (derived from path hash)
#
# Exports:
#   WORKTREE_SLOT         - integer slot number
#   PG_CONTAINER_NAME     - unique postgres container name
#   PG_PORT               - unique postgres host port
#   REDIS_CONTAINER_NAME  - unique redis container name
#   REDIS_PORT            - unique redis host port
#   PG_VOLUME_NAME        - unique postgres volume name

# Use git to detect worktree — works regardless of symlink resolution
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null || true)"
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || true)"

# If git-dir != git-common-dir, we're in a worktree
if [ -n "$GIT_COMMON_DIR" ] && [ -n "$GIT_DIR" ] && [ "$GIT_COMMON_DIR" != "$GIT_DIR" ]; then
  # Extract worktree name from the git dir path (e.g., .git/worktrees/225-warmup-flag)
  WORKTREE_NAME=$(basename "$GIT_DIR")
  # Hash the name to a slot 1-9 (use printf, not echo -n, for POSIX compat)
  HASH=$(printf '%s' "$WORKTREE_NAME" | cksum | awk '{print $1}')
  WORKTREE_SLOT=$(( (HASH % 9) + 1 ))
else
  WORKTREE_SLOT=0
fi

if [ "$WORKTREE_SLOT" -eq 0 ]; then
  PG_CONTAINER_NAME="fitcsv-postgres"
  PG_PORT=5433
  REDIS_CONTAINER_NAME="fitcsv-redis"
  REDIS_PORT=6379
  PG_VOLUME_NAME="fitcsv-pgdata"
else
  PG_CONTAINER_NAME="fitcsv-postgres-wt${WORKTREE_SLOT}"
  PG_PORT=$((5433 + WORKTREE_SLOT))
  REDIS_CONTAINER_NAME="fitcsv-redis-wt${WORKTREE_SLOT}"
  REDIS_PORT=$((6379 + WORKTREE_SLOT))
  PG_VOLUME_NAME="fitcsv-pgdata-wt${WORKTREE_SLOT}"
fi

MINIO_CONTAINER_NAME="fitcsv-minio${WORKTREE_SLOT:+-wt$WORKTREE_SLOT}"
[ "$WORKTREE_SLOT" -eq 0 ] && MINIO_CONTAINER_NAME="fitcsv-minio"
MINIO_API_PORT=$((9000 + WORKTREE_SLOT))
MINIO_CONSOLE_PORT=$((9001 + WORKTREE_SLOT))

# Place overmind's control socket in /tmp rather than the project root.
# Turbopack (Next 16) panics trying to read `.overmind.sock` as a regular
# file during CSS dependency scanning — "Operation not supported on socket".
# Moving the socket outside the project tree avoids the scan entirely.
# Unique per worktree so multiple worktrees can run overmind concurrently.
if [ "$WORKTREE_SLOT" -eq 0 ]; then
  OVERMIND_SOCKET="/tmp/fitcsv-overmind.sock"
else
  OVERMIND_SOCKET="/tmp/fitcsv-overmind-wt${WORKTREE_SLOT}.sock"
fi

export WORKTREE_SLOT PG_CONTAINER_NAME PG_PORT REDIS_CONTAINER_NAME REDIS_PORT PG_VOLUME_NAME MINIO_CONTAINER_NAME MINIO_API_PORT MINIO_CONSOLE_PORT OVERMIND_SOCKET
