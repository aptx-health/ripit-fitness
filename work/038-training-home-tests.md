---
id: 038
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Tests: TL2 Training home (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-home`. This branch is stacked on `feature/training-library` (TL1, PR #1006). Don't commit.

## Goal
Write the tests TL2 will be judged against, before it is built. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL2 Training home");
- the behaviour, `features/training-library/training-home.feature`;
- the code map, `work/034-handback.md` §2: the next-workout route, history, the one-draft rule, saved-start hydrate;
- the TL1 seams in `work/035-handback.md`, which you can build on.

## Do
1. **Choose seams and name them precisely** for the implementer, as in 035. For example:
   - a server loader for the home sections (Up Next, Recent, Current Program);
   - the Repeat route handler, called directly with mocked auth;
   - the shared hydrate helper;
   - a home view component rendered with Testing Library;
   - the `/training` and `/` redirect decisions.
2. **Write the tests.** Cover every scenario as steps, plus edges:
   - skipped counts as done;
   - Continue vs Start;
   - only completed sessions in Recent, newest first, limit 3;
   - duration fallback;
   - Repeat:
     - exercise order;
     - sets, reps as text, RIR, RPE and warm-up copied; weight not copied;
     - `workoutId` and `savedWorkoutId` null;
     - 409 `DRAFT_EXISTS` with no write;
     - 404 for another user's, missing or non-completed sessions;
     - 422 `NOTHING_TO_REPEAT`;
   - a Repeat of a program session leaves program progress unchanged;
   - the empty home;
   - an old `?resume=` link redirects;
   - the root redirect.
3. **Lock the steps file read-only.**
4. **Prove the tests can fail** with the break matrix.

## Done when
- Every scenario is covered.
- The tests are red only for missing TL2 code.
- Every other test file still passes.
- The breaks are killed.

## Don't touch
- Non-test code.
- `work/`, `STATE.md`, status files.

## Hand back
The `handoff-test-builder` packet, with the seams spelled out. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: handback saved. Lead re-ran: 120 failed / 12 passed (132), all from missing TL2 code; 91/91 breaks killed. Accepted. Follow-up sent: remove TL1 trainingRedirectTarget tests.
