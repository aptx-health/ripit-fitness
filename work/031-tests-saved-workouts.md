---
id: 031
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (pre-approved via /goal)
updated: 2026-10-31
---
# Tests for saved workout proposals (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/agent-workout-draft`.

## Goal
Failing tests for every scenario in `features/agent-tools/saved-workout-proposals.feature` (15), against spec section "Saved workouts". Item 032 makes them pass.

## Do
1. `__tests__/features/agent-tools/saved-workout-proposals.steps.ts`, in the style of the other agent-tools steps files (newest: `balance-proposals.steps.ts`). Use `callTool` and the proposal service functions against a real test DB.
2. Cover what the scenarios imply but don't spell out:
   - input bounds: 1–15 exercises, 1–10 sets, `reps` 1–20 chars, `rir` 0–10 integer, `rpe` 1–10, unknown fields refused, `name` 1–100, `notes` ≤ 1000; `field` names the first failure;
   - update needs at least one of `name`, `notes`, `exercises`; `notes: null` clears;
   - `workoutData` shape after approve (`order` and `setNumber` from position, `name` from the definition, `exerciseGroup` null, `isWarmup` default false), and `exerciseCount`;
   - `before` holds the touched fields only; an edit to an untouched field doesn't conflict;
   - revert of a create is refused once a `WorkoutCompletion` has that `savedWorkoutId`, or if the row was edited after approve; revert of an update is refused when a touched field moved;
   - approve re-checks visibility (an exercise deleted while pending gives `invalid`);
   - reads do no writes (count write calls, as in `balance-proposals.steps.ts`), and `get_active_draft` returns `null` with no draft;
   - `tools/list` annotations: every read tool `readOnlyHint: true`; propose tools `readOnlyHint: false, destructiveHint: false`;
   - the summary formats.
3. Lock the file read-only when done.

## Done when
- `npm run test:run -- saved-workout-proposals` fails only because the tools, kinds and annotations are missing.
- Pass-proof with the `break-matrix` skill against a scratch fake; delete the fake afterwards. Keep it to the rules that matter (about 30 variants).
- The rest of agent-tools still passes, and biome is clean.

Env: Colima env vars from `docs/TESTING.md` (Ryuk stays on now). Re-run `npx prisma@6.19.0 generate` if the client is stale.

## Don't touch
`lib/`, `app/`, `components/`, `features/**`, the spec, and other tests.

## Hand back
The handoff-test-builder packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-31 00:20 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 00:55 MDT: handback saved. Lead re-ran: 139 failed / 60 passed of 199, all missing tools/kinds/annotations; file read-only. Lead decided: field stays the full path (spec); singular summary is `(1 exercise)`; spec updated; test-builder asked to add the singular test. Assumptions accepted.
- 2026-10-31 01:05 MDT: follow-up: test-builder added the singular-summary test (200 tests, 140 red). File relocked.
- 2026-10-31 01:30 MDT: retry: 032 found that RPE must be an integer (PrescribedSet.rpe is Int; start copies it). Spec changed to integer 1–10. Test-builder asked to change the fractional-RPE tests to expect refusal (and keep integer RPE accepted).
- 2026-10-31 01:45 MDT: retry done: fractional RPE refused (2 new tests), valid workouts use integers; 202 tests, 2 red on current code. State review.
- 2026-10-31 02:15 MDT: 033 verdict ship. Accepted by the lead under Dustin's /goal pre-approval; Dustin can still review the PR.
