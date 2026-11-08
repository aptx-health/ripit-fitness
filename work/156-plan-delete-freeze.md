---
id: 156
state: review
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-08 Dustin (bug report: deleting an exercise from the Workout plan sheet freezes the app until a hard refresh; the exercise isn't deleted; deleting from the logger's edit button works)
updated: 2026-11-08
---
# Bug: delete from the Workout plan sheet freezes the logger

Checkout: worktree2, branch `fix/plan-delete-freeze` (from origin/dev, which is what prod runs). Size: small. No test-builder.

## Report (Dustin, 2026-11-08, on prod)
In a workout, open the Workout plan sheet, tap delete on an exercise → the app freezes (taps do nothing) and needs a hard refresh. After resuming, the exercise is still there. Deleting the same way from the logger's edit button (quick actions → delete) works.

## Leads (not verified)
- Program logger: `components/ExerciseLoggingModal.tsx` `handlePlanDelete` (~L473) closes the plan sheet (`setPlanEditorOpen(false)`) and opens `DeleteExerciseWizard` (Radix `WizardDialog`) in the same render. The plan sheet is `components/workout-logging/WorkoutPlanEditor.tsx` (its own overlay, Escape listener). Suspects: Radix leaving `pointer-events: none` on body, a focus trap or scroll lock from the sheet fighting the dialog, or the dialog rendering behind an overlay. The edit-button path opens the same wizard without the sheet.
- Freestyle logger: `components/adhoc/AdHocLoggerView.tsx` `handlePlanDelete` (~L477) skips the wizard and calls `handleDeleteExercise` directly. Check it too.

## Do
1. Reproduce in a real browser at phone width (dev stack or a production build) in both the program logger and the freestyle logger. Say which one(s) freeze and why (the root cause, with evidence).
2. Write a failing regression test first, then fix the cause (not a timeout hack). Keep the edit-button path working.
3. Check the plan sheet's Swap and Add the same way, since they use the same hand-off.

## Done when
The regression test fails before the fix and passes after; full `npx vitest run` passes; `npx tsc --noEmit` clean; a browser check shows delete from the plan sheet works in both loggers and the exercise is gone after resuming.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet to the lead with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-08 CST: created from Dustin's bug report; dispatched to implementer (wE:p7).
- 2026-11-08 CST: Dustin: the freeze was in a freestyle session; implementer told.
- 2026-11-08 CST: back complete. Root cause: LoggerConfirm (z-60) opened behind the plan sheet (z-90) while modal; fix z-95. Lead re-ran the regression test (2/2) and tsc; screenshots checked. PR into dev.
