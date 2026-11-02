---
id: 097
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L3 tests: paper tabs and the plan sheet

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/logger-plan` (stacked on L2). Write tests only; no app code.

## Read
`initiatives/ui-audit/spec.md` → "L3"; `features/ui-audit/logger-plan.feature`; `components/workout-logging/ExerciseDisplayTabs.tsx`, `WorkoutPlanEditor.tsx`, `WorkoutPlanEditorRow.tsx`, `ExerciseLoggingHeader.tsx`, `ExerciseLoggingModal.tsx`, `components/adhoc/AdHocLoggerView.tsx`; `components/ui/PaperTabs.tsx`, `PaperTabTitle.tsx`, `components/QuickActionSheet.tsx` (sheet pattern); your 088/093 harnesses; existing plan editor tests (`rg -l WorkoutPlanEditor __tests__`).

## Do
Failing tests for every scenario. Pin component names, props and accessible names at the top (e.g. the sheet as a dialog named "Workout plan", rows with a status and "2 of 4 sets", the `NOW` chip, the "Reorder" toggle, "Plan 2/6" opener, tab count chips with labels). Keep reorder/jump/swap/delete/add behaviour pinned to what it does today. Keep existing tests passing (edit only your own earlier files if you must, and say so). Break matrix in small batches; lock the files.

## Hand back
Packet with test paths, the pinned interface, scenario → test map. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to test-builder (wF:p1).
- 2026-11-01 MDT: back; lead re-ran (red). Accepted with the pinned choices.
