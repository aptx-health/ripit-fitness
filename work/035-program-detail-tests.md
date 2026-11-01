---
id: 035
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Tests: TL1 Program Detail (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-library`. Don't commit.

## Goal
Write the tests that TL1 will be judged against, before it is built. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL1 Program Detail");
- the behaviour, `features/training-library/program-detail.feature`;
- the current code map, `work/034-handback.md` §1.

## Do
1. **Choose the test seams.** No tests cover these screens today, so pick seams the implementer can build to, and name them precisely in your packet (module path, export, signature). For example:
   - the loaders keyed by `programId` + `userId`;
   - the server page functions, called with a mocked current user, catching Next's redirect and not-found;
   - a read-only prop on the week view, rendered with Testing Library if the setup supports it.

   Prefer seams that test behaviour, not markup. Keep the visual layout out of tests; Dustin checks that on a phone preview.
2. **Write the tests.** Cover every scenario in the `.feature` as steps, plus plain describes for the edges in the spec:
   - query strings kept on redirects;
   - skipped counts as done for the current week;
   - archived programs;
   - another user's id;
   - the `WorkoutHistoryList` link target;
   - restart going to week 1 of the detail page.
3. **Lock the steps file read-only,** as in earlier slices.
4. **Prove the tests can fail** with the `break-matrix` skill. The test harness changed in #1002: one Postgres per run, and Ryuk stays on.

## Done when
- Every scenario is covered.
- The tests are red only for missing TL1 code.
- Every other test file still passes.
- The break matrix shows the targeted tests kill their breaks.

## Don't touch
Anything under `app/`, `components/` or `lib/` (non-test code), `work/`, `STATE.md`, status files.

## Hand back
The `handoff-test-builder` packet, with the seams spelled out for the implementer. First line: `Report: complete | needs decision | further handoff`. SendMessage the lead (`lead-ripit-mcp`) when done.

## Log
- 2026-10-31 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: handback saved (035-handback.md). Lead re-ran: 75 failed / 26 passed (101), all from missing TL1 code. Accepted by the lead.
