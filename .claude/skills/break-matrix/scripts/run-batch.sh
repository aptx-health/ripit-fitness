#!/bin/bash
# usage: run-batch.sh BATCH_NO [BATCH_SIZE]
# env:   REPO (repo path), FILE (test file, repo-relative), SCRATCH (dir with vitest.fake.config.ts and breaks.tsv), PAR (default 4)
# breaks.tsv: one break per line as "name<TAB>test-name regex". The regex goes to `vitest -t`, so the variant runs only the
#             tests aimed at that break. Leave the regex empty to run the whole file.
# Gherkin (vitest-cucumber) runs each step as its own test, and -t would skip the Background steps that create the
# scenario's state, so "|Background" is added to every regex. Failures that look like missing setup are flagged.
# Runs one batch, prints one line per variant as it finishes, then a batch summary. Logs: $SCRATCH/logs/<break>.log
export DOCKER_HOST=${DOCKER_HOST:-unix://$HOME/.colima/default/docker.sock} TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=${TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:-/var/run/docker.sock}
for v in REPO FILE SCRATCH; do [ -n "${!v}" ] || { echo "set $v"; exit 2; }; done
N=${1:-1}; SIZE=${2:-12}; PAR=${PAR:-4}; LOGS=$SCRATCH/logs; mkdir -p "$LOGS"
cd "$REPO" || { echo "cannot cd to $REPO"; exit 2; }
[ -f "$SCRATCH/breaks.tsv" ] || { echo "missing $SCRATCH/breaks.tsv"; exit 2; }
TOTAL=$(wc -l < "$SCRATCH/breaks.tsv" | tr -d ' '); BATCHES=$(( (TOTAL + SIZE - 1) / SIZE ))
BATCH=$(sed -n "$(( (N-1)*SIZE + 1 )),$(( N*SIZE ))p" "$SCRATCH/breaks.tsv")
[ -n "$BATCH" ] || { echo "batch $N is empty (there are $BATCHES batches)"; exit 2; }
trap 'pkill -P $$ 2>/dev/null; echo "[interrupted]"; exit 130' INT TERM
TO=""; if command -v timeout >/dev/null; then TO="timeout 300"; elif command -v gtimeout >/dev/null; then TO="gtimeout 300"; else echo "(no timeout command; runs are not time-limited)"; fi
echo "batch $N of $BATCHES: $(echo "$BATCH" | wc -l | tr -d ' ') variants, $PAR at a time"
run() {
  b=${1%%$'\t'*}; pat=${1#*$'\t'}; [ "$pat" = "$1" ] && pat=""; log=$LOGS/$b.log
  if [ -n "$pat" ]; then FAKE_BREAK=$b $TO npx vitest run --config "$SCRATCH/vitest.fake.config.ts" "$FILE" -t "($pat)|Background" >"$log" 2>&1
  else FAKE_BREAK=$b $TO npx vitest run --config "$SCRATCH/vitest.fake.config.ts" "$FILE" >"$log" 2>&1; fi
  rc=$?
  failed=$(grep -cE "^ FAIL " "$log")
  if [ $rc -eq 124 ]; then echo "[$b] TIMEOUT (300s): rerun alone"
  elif [ $rc -eq 0 ]; then echo "[$b] SURVIVED: 0 tests failed (ran: $(grep -m1 -E 'Tests  ' "$log" | sed 's/ *Tests *//'))"
  elif [ "$failed" -eq 0 ]; then echo "[$b] ERROR (no test failures, see $log): $(grep -m1 -iE 'error|not found' "$log" || head -1 "$log")"
  else
    setup=$(grep -cE "TypeError: Cannot read properties of undefined" "$log")
    if [ "$setup" -gt 0 ]; then echo "[$b] killed by $failed tests, but $setup look like SETUP errors (state undefined): check $log"
    else echo "[$b] killed by $failed tests"; fi
  fi
}
export -f run; export SCRATCH FILE LOGS TO
echo "$BATCH" | tr '\n' '\0' | xargs -0 -P "$PAR" -I{} bash -c 'run "$1"' _ {}
echo "batch $N of $BATCHES done; logs in $LOGS"
