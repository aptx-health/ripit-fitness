---
id: 044
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Tests: TL4 Pinned workouts (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/pinned-workouts`, stacked on TL3 (#1008), TL2 (#1007) and TL1 (#1006). Don't commit.

## Goal
Write the tests TL4 will be judged against, before it is built. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL4 Pinned workouts");
- the behaviour, `features/training-library/pinned-workouts.feature`;
- the existing seams, in `work/038-handback.md` (`getTrainingHome`, `TrainingHome`) and `work/041-handback.md` (`LibraryView`);
- the saved-workout code: `app/api/workouts/saved/**`, `components/features/saved-workouts/**`.

The schema change (`SavedWorkout.pinnedAt`) is part of the build, so tests that need the column will be red until the implementer migrates. Say in your packet exactly which field and index the tests expect.

## Do
1. **Choose seams and name them precisely.** For example:
   - the PATCH handler called directly;
   - `getTrainingHome`'s new `pinned` field;
   - `TrainingHome` rendered with `pinned`;
   - the saved-workout row and detail dialog toggles rendered with Testing Library.
2. **Update any locked TL2 test** that asserts the exact shape of `getTrainingHome` or the section order, and list each one you change.
3. **Write the tests.** Cover every scenario as steps, plus edges:
   - pinning again keeps `pinnedAt`;
   - `false` clears it;
   - a 400 for a non-boolean `pinned`;
   - rename and pin in one PATCH;
   - a 404 for another user's or an unknown id;
   - `GET` returns `pinnedAt`;
   - at most 5, newest first;
   - "1 exercise" in the singular;
   - Start's 409 message, and only one request at a time;
   - the toggle's `aria-pressed`, and that it reverts on failure;
   - the section is hidden with no pins;
   - a deleted pinned workout is gone from Training.
4. **Lock the files read-only.**
5. **Prove the tests can fail** with the break matrix.

## Done when
- Every scenario is covered.
- The tests are red only for missing TL2 code.
- Every other test file still passes, apart from the ones you deliberately updated, which go red only for missing TL4 code.
- The breaks are killed.

## Don't touch
- Non-test code.
- `work/`, `STATE.md`, status files.

## Hand back
The `handoff-test-builder` packet, with the seams spelled out. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: handback saved (84 tests, 38/38 breaks). Lead: PATCH 404 for another user's id is a deliberate change. Accepted.
