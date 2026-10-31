---
id: 036
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Build: TL1 Program Detail

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-library`. Don't commit.

## Goal
Build TL1 so its tests pass. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL1 Program Detail");
- the behaviour, `features/training-library/program-detail.feature`;
- the tests and seams, `work/035-handback.md`;
- the test files, `__tests__/features/training-library/program-detail.steps.ts` and `__tests__/components/program-detail-view.test.tsx` (read-only: don't edit them);
- the code map, `work/034-handback.md` §1.

## Do
1. Build the seams exactly as named in `035-handback.md`.
2. **Page glue (no tests, so be careful):**
   - Add `app/(app)/library/programs/[id]/page.tsx`. It calls `notFound()` on null and passes `readOnly={!canTrain}` and `canActivate`.
   - `/training` redirects through `trainingRedirectTarget`, or else shows `NoActiveProgram`.
   - `app/(app)/programs/[id]/page.tsx` redirects through `legacyProgramRedirectTarget`.
   - The detail page's back link goes to `/training`.
3. **Lead decisions for spec gaps:**
   - A `?week=` that is out of range or not a number shows the current week. Never 404 for it.
   - Declining the activation modal closes it and stays on the page. Remove the stale `/programs?tab=strength` push.
   - Point every "active program" link at its detail URL (the list in the spec's Links section). Where the link needs a `programId` that an API doesn't return yet, add `programId` to that API response, e.g. `GET /api/training/next-workout` or the draft lookup. Links that mean home stay `/training`.
4. **Run the check:**
   - the two TL1 files;
   - the full suite;
   - `npx tsc --noEmit`;
   - biome on the changed files.

   Use the env from `AGENTS.md`/#1002 (one Postgres per run, Ryuk on).

## Done when
- The TL1 tests are green.
- The full suite passes.
- tsc is clean.
- Every scenario in the `.feature` maps to code.
- `grep -rn "'/training" app components lib` shows only home-meaning links. List them in the packet.

## Don't touch
- The test files.
- `work/`, `STATE.md`, status files.
- No schema change.

## Hand back
The `handoff-implementer` packet. First line: `Report: complete | needs decision | further handoff`. SendMessage the lead (`lead-ripit-mcp`) when done.

## Log
- 2026-10-31 MDT: created; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: handback saved (036-handback.md). Lead re-ran full suite: 1725 passed, 4 skipped; tsc clean. Review 037 dispatched.
- 2026-10-31 MDT: review 037 fixes sent to implementer: #1 builder skip nav, #2 empty program, #4 history ?week, #5 revalidate.
- 2026-10-31 MDT: fixes in; tests updated by test-builder (035 follow-up). Lead re-ran full suite: 1733 passed, 4 skipped; tsc clean. Preview rebuilt; waiting on Dustin's phone check.
- 2026-10-31 MDT: Dustin OK'd TL1 to go up as the bottom of a stacked PR chain into dev. Accepted.
