---
id: 124
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (asked for a flash or check mark on the last planned set, replaying after delete and re-log)
updated: 2026-11-02
---
# Planned sets: celebrate the last planned set

Checkout: worktree2, branch `feature/adhoc-planned-sets`, uncommitted (your 121 + 123 work). A phone preview IS running on :3200 from this worktree; use another port and don't stop it. The wt2 DB has a temp SavedWorkout `preview-plan-123` for synthetic-bodybuilder and maybe a draft Dustin started from it: don't delete or change those.

## Do
The last five scenarios of `features/workout-logging/adhoc-planned-sets.feature` ("Plan complete"):
- When a logged set moves the exercise's working-set count from below the plan to exactly the plan, the Target line plays a short flash (theme success/primary token, ~600ms) and shows a check icon with "done".
- Only on that transition: not on mount, exercise change or reopen when already done; not for extra sets; replays if a delete drops below the plan and the user logs back up to it. A failed log that rolls back shouldn't leave the check showing.
- Already-done lines show the check without the flash.
- `prefers-reduced-motion`: the check, no flash.
- Keep it on the Target line (no toast, no overlay); keep `AdHocLoggerView.tsx` under 1000 lines (the transition logic can live in `PlanLine.tsx` or a small hook).

Tests in a new file (e.g. `__tests__/components/adhoc-plan-done-view.test.tsx`): transition fires once, not on mount, not on extra sets, replays after delete + re-log, reduced motion. Don't edit locked files. Screenshot the flash mid-animation and the done state at 390px light/dark into `initiatives/agent-tools/docs/assets/124/`; leave data as you found it.

## Done when
All tests pass; full suite and `npx tsc --noEmit` clean; Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created from Dustin's preview feedback; dispatched to implementer (wF:p2). Test-builder skipped on purpose (small UI addition; implementer writes the tests).
- 2026-11-02 CST: back; lead re-ran (tsc clean, 118 tests pass). Restarting preview.
- 2026-11-02 CST: Dustin checked the phone preview ("really nice. Perfect."). Accepted.
