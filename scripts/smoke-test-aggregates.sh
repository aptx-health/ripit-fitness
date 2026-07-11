#!/usr/bin/env bash
#
# Post-deploy staging smoke test for the UserTrainingAggregates recompute
# pipeline (issue #940). Drives a REAL end-to-end path against a deployed stack:
#
#   app (completion route) -> publisher (lib/queue/aggregates-jobs.ts)
#     -> Redis -> BullMQ worker (cloud-functions/clone-program)
#     -> recomputeUserAggregates -> Postgres (UserTrainingAggregates row)
#
# This catches a whole class of failures that in-process tests (PR #939) can't:
# queue-name drift between publisher and worker, the second Worker never
# registering, a wrong Redis db number in the worker pod, or DIRECT_URL/env
# wiring differences. None of those show up until you exercise the deployed
# topology.
#
# It signs in as a dedicated smoke-test user, completes a freestyle (ad-hoc)
# workout, then polls a read-only status endpoint until the user's aggregates
# row's `computedAt` advances past the pre-completion baseline.
#
# Usage:
#   BASE_URL=https://staging.ripit.fit \
#   SMOKE_USER_EMAIL=... SMOKE_USER_PASSWORD=... \
#   scripts/smoke-test-aggregates.sh
#
# Env:
#   BASE_URL            Base URL of the deployed app (required)
#   SMOKE_USER_EMAIL    Login email for the dedicated smoke user (required)
#   SMOKE_USER_PASSWORD Login password (required)
#   POLL_TIMEOUT_SECS   Max seconds to wait for the recompute (default 120)
#   POLL_INTERVAL_SECS  Seconds between polls (default 3)
#   EXERCISE_QUERY      Search term for the seed exercise (default "bench")
#
# Exit codes:
#   0  aggregates row refreshed end-to-end
#   1  setup/auth/seed failure (app-side; pipeline not reached)
#   2  timeout waiting for the worker to refresh the row
set -euo pipefail

BASE_URL="${BASE_URL:?BASE_URL is required (e.g. https://staging.ripit.fit)}"
SMOKE_USER_EMAIL="${SMOKE_USER_EMAIL:?SMOKE_USER_EMAIL is required}"
SMOKE_USER_PASSWORD="${SMOKE_USER_PASSWORD:?SMOKE_USER_PASSWORD is required}"
POLL_TIMEOUT_SECS="${POLL_TIMEOUT_SECS:-120}"
POLL_INTERVAL_SECS="${POLL_INTERVAL_SECS:-3}"
EXERCISE_QUERY="${EXERCISE_QUERY:-bench}"

BASE_URL="${BASE_URL%/}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

log()  { printf '[smoke-aggregates] %s\n' "$*"; }
fail() { printf '[smoke-aggregates] FAIL: %s\n' "$*" >&2; exit "${2:-1}"; }

for bin in curl jq; do
  command -v "$bin" >/dev/null 2>&1 || fail "$bin is required but not installed"
done

# api METHOD PATH [JSON_BODY] -> prints "HTTP_STATUS<newline>BODY"
api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -m 30 -X "$method" -b "$COOKIE_JAR" -c "$COOKIE_JAR"
    -H 'Content-Type: application/json' -w '\n%{http_code}')
  if [ -n "$body" ]; then args+=(-d "$body"); fi
  curl "${args[@]}" "${BASE_URL}${path}"
}

# Split the api() output into $RESP_BODY / $RESP_CODE globals.
call() {
  local out
  out="$(api "$@")"
  RESP_CODE="${out##*$'\n'}"
  RESP_BODY="${out%$'\n'*}"
}

# --- 1. Authenticate --------------------------------------------------------
log "Signing in as $SMOKE_USER_EMAIL against $BASE_URL"
call POST /api/auth/sign-in/email \
  "$(jq -nc --arg e "$SMOKE_USER_EMAIL" --arg p "$SMOKE_USER_PASSWORD" \
     '{email: $e, password: $p}')"
[ "$RESP_CODE" = "200" ] || fail "sign-in failed (HTTP $RESP_CODE): $RESP_BODY" 1
grep -q 'better-auth' "$COOKIE_JAR" || fail "no session cookie set after sign-in" 1

# --- 2. Baseline computedAt (before the completion) -------------------------
call GET /api/debug/aggregates-status
[ "$RESP_CODE" = "200" ] || fail "aggregates-status probe unavailable (HTTP $RESP_CODE): $RESP_BODY" 1
BASELINE="$(printf '%s' "$RESP_BODY" | jq -r 'if .exists then .computedAt else "" end')"
log "Baseline computedAt: ${BASELINE:-<none>}"

# --- 3. Seed + complete a freestyle workout ---------------------------------
call POST /api/workouts/adhoc
if [ "$RESP_CODE" = "409" ]; then
  # An open draft already exists (previous run) — reuse it.
  COMPLETION_ID="$(printf '%s' "$RESP_BODY" | jq -r '.draft.completionId // empty')"
elif [ "$RESP_CODE" = "200" ] || [ "$RESP_CODE" = "201" ]; then
  COMPLETION_ID="$(printf '%s' "$RESP_BODY" | jq -r '.completion.id // empty')"
else
  fail "creating ad-hoc workout failed (HTTP $RESP_CODE): $RESP_BODY" 1
fi
[ -n "$COMPLETION_ID" ] || fail "could not resolve ad-hoc completion id from: $RESP_BODY" 1
log "Ad-hoc completion: $COMPLETION_ID"

call GET "/api/exercises/search?query=${EXERCISE_QUERY}&limit=1"
[ "$RESP_CODE" = "200" ] || fail "exercise search failed (HTTP $RESP_CODE): $RESP_BODY" 1
EX_DEF_ID="$(printf '%s' "$RESP_BODY" | jq -r '.exercises[0].id // empty')"
[ -n "$EX_DEF_ID" ] || fail "no exercise definition matched query '$EXERCISE_QUERY'" 1
log "Seed exercise definition: $EX_DEF_ID"

call POST "/api/workouts/adhoc/${COMPLETION_ID}/exercises" \
  "$(jq -nc --arg id "$EX_DEF_ID" '{exerciseDefinitionId: $id}')"
[ "$RESP_CODE" = "200" ] || fail "adding exercise failed (HTTP $RESP_CODE): $RESP_BODY" 1
EX_ID="$(printf '%s' "$RESP_BODY" | jq -r '.exercise.id // empty')"
[ -n "$EX_ID" ] || fail "no exercise id returned: $RESP_BODY" 1

call POST "/api/workouts/adhoc/${COMPLETION_ID}/sets" \
  "$(jq -nc --arg ex "$EX_ID" \
     '{exerciseId: $ex, setNumber: 1, reps: 5, weight: 135, weightUnit: "lbs", rpe: null, rir: null}')"
[ "$RESP_CODE" = "200" ] || fail "logging set failed (HTTP $RESP_CODE): $RESP_BODY" 1

log "Completing workout (enqueues aggregates recompute)"
call POST "/api/workouts/adhoc/${COMPLETION_ID}/complete"
[ "$RESP_CODE" = "200" ] || fail "completing workout failed (HTTP $RESP_CODE): $RESP_BODY" 1

# --- 4. Poll for the recompute ----------------------------------------------
log "Polling aggregates-status for up to ${POLL_TIMEOUT_SECS}s (baseline=${BASELINE:-<none>})"
DEADLINE=$(( $(date +%s) + POLL_TIMEOUT_SECS ))
LAST_STATE=""
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  call GET /api/debug/aggregates-status
  if [ "$RESP_CODE" = "200" ]; then
    LAST_STATE="$RESP_BODY"
    EXISTS="$(printf '%s' "$RESP_BODY" | jq -r '.exists')"
    CURRENT="$(printf '%s' "$RESP_BODY" | jq -r 'if .exists then .computedAt else "" end')"
    if [ "$EXISTS" = "true" ] && [ -n "$CURRENT" ] && [ "$CURRENT" != "$BASELINE" ]; then
      log "PASS: aggregates refreshed end-to-end. computedAt ${BASELINE:-<none>} -> $CURRENT"
      log "State: $(printf '%s' "$RESP_BODY" | jq -c '{dataMaturity, qualifyingSessionsTotal, sessionsLast7d}')"
      exit 0
    fi
  fi
  sleep "$POLL_INTERVAL_SECS"
done

# --- 5. Timed out — emit diagnostics distinguishing failure modes -----------
{
  echo "TIMEOUT: aggregates row did not refresh within ${POLL_TIMEOUT_SECS}s."
  echo "  baseline computedAt : ${BASELINE:-<none>}"
  echo "  last status body    : ${LAST_STATE:-<no successful read>}"
  echo
  echo "Interpreting this failure:"
  echo "  * row still absent / computedAt unchanged, worker healthy in other"
  echo "    respects -> the aggregates Worker is not CONSUMING the"
  echo "    'user-training-aggregates' queue (queue-name drift, wrong Redis db,"
  echo "    or the second Worker never registered)."
  echo "  * worker logs show job picked up then 'failed' -> COMPUTE error"
  echo "    (recomputeUserAggregates threw; removeOnFail drops it after retries)."
  echo "  * nothing in worker logs at all -> publisher/Redis wiring or DIRECT_URL"
  echo "    mismatch between app and worker pods."
  echo
  echo "Next: check the clone-program worker pod logs for '[aggregates ...]' lines."
} >&2
exit 2
