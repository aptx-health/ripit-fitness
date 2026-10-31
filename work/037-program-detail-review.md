---
id: 037
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Review: TL1 Program Detail

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-library`. The change is uncommitted: `git status` and `git diff`, plus the new files. Change no files.

## Goal
Judge whether TL1 meets its contract and is good code. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL1 Program Detail");
- the behaviour, `features/training-library/program-detail.feature`;
- the decisions, `initiatives/training-library/docs/decisions.md`;
- the tests, `__tests__/features/training-library/program-detail.steps.ts` and `__tests__/components/program-detail-view.test.tsx`.

Do not read `work/036-handback.md` until you've written your first-pass verdict.

## Focus
- **Untested page glue:**
  - `app/(app)/library/programs/[id]/page.tsx`: ownership, `notFound()` status, and `readOnly`/`canActivate` wiring;
  - `app/(app)/training/page.tsx`;
  - `app/(app)/programs/[id]/page.tsx`.
- **Authz:** can any path show or write another user's program, week or completion? Can read-only be bypassed (e.g. `?resume=` on a non-active program)?
- **Links:** every link that means "the active program" goes to the detail URL; `/training` remains only where it means home. Check the APIs that gained `programId`.
- **Regressions** for the active program vs today's `/training`: logging, resume, Complete Week, completion and restart, PWA prompt.
- **Test quality:** do the tests check behaviour, and is anything important unguarded?

## Done when
A verdict (ship / ship with notes / fix first), with findings ranked by severity and each with a `file:line` and a concrete failure. Re-run the TL1 tests and tsc.

## Hand back
First line: `Report: complete | needs decision | further handoff`. SendMessage the lead (`lead-ripit-mcp`) when done. Don't edit any files.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: verdict ship with notes. #1, #2, #4 and #5 go to the implementer as 036 fixes; #3 goes to the roadmap. Accepted by the lead.
