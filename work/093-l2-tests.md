---
id: 093
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L2 tests: one bottom bar

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/logger-bottom-bar` (stacked on L1). Write tests only; no app code.

## Read
`initiatives/ui-audit/spec.md` → "L2" and the 090 carry-overs; `features/ui-audit/logger-bottom-bar.feature`; `components/workout-logging/ExerciseActionsFooter.tsx`, `FollowAlongFooter.tsx`, `SetLoggingForm.tsx`, `DrawerContextBanner.tsx`, `ExerciseLoggingModal.tsx`, `components/adhoc/AdHocLoggerView.tsx`; your 088 harness for the loggers.

## Do
Failing tests for every scenario against a `LoggerBottomBar` (pin path and props at the top; suggested `components/workout-logging/LoggerBottomBar.tsx` with left/main/right slots or explicit props) and against the three loggers: the second line "8 reps × 135 lbs" (and sensible text for timed/bodyweight sets; pin what you choose), the bar staying after the last planned set with "+ Extra set" and "Next exercise"/"Finish", the "7 of 7 done" banner, disabled Previous announced as disabled, follow-along and freestyle-empty variants, 48px targets for the 090 carry-overs. Keep existing logger tests passing. Break matrix in small batches; lock the files.

## Hand back
Packet with test paths, the pinned interface, scenario → test map. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to test-builder (wF:p1).
- 2026-11-01 MDT: back; lead re-ran (red). Accepted, including the edit to the 088 follow-along tests.
