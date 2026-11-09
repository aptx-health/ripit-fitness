---
id: 157
state: running
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-09 Dustin (editor: quick sheet + link to full; confirm with impact + unsaved-changes prompt; both loggers, editor and admin roles)
updated: 2026-11-09
---
# Admin: edit the exercise definition from the logger's Edit menu

Checkout: worktree2, branch `feature/logger-admin-edit` (from origin/dev). Size: small. No test-builder.
Spec: `features/workout-logging/admin-exercise-edit.feature`. Report screenshot: `initiatives/ui-audit/docs/assets/157/report.png`.

## Report (Dustin, 2026-11-09, high priority)
"As an admin, when I hit the edit button in the logger, I should see an option to edit the exercise definition itself. And then that should present me with an exercise editor modal with appropriate confirmation steps."

## What the lead found (verified by reading, not run)
- Program logger `components/ExerciseLoggingModal.tsx` already has a `Quick Edit (Admin)` menu item (~L773) gated on an `isEditorRole` prop and a `QuickEditExerciseSheet` (~L891). **No caller passes `isEditorRole`**, so it never shows.
- Freestyle logger `components/adhoc/AdHocLoggerView.tsx` (~L870) has no such item.
- `components/features/exercise-definition/QuickEditExerciseSheet.tsx` saves straight to `PATCH /api/admin/exercise-definitions/[id]` with no confirm; it links to `ExerciseDefinitionEditorModal` (full editor). Role helper: `isEditorRole` in `lib/auth/roles.ts` / `lib/admin/auth.ts` (same check the admin area uses).
- Mind the layers: the logger's dialogs and sheets go up to z-90/95 (work 156). The editor and confirms must sit above them.

## Do
1. Pass the role from the server pages that render both loggers (no client-side role fetch if the page already has the user).
2. Add the item to both loggers, labelled "Edit exercise definition (Admin)".
3. Add the impact confirm before save (every user; usage count from the admin GET if it returns one, otherwise add it) and the unsaved-changes prompt, in both the quick sheet and the full editor. Reuse `LoggerConfirm` or the existing confirm pattern.
4. After saving, the logger shows the new name and keeps the user's place and entered values.
5. Component tests for the scenarios; check in a real browser at phone width, with screenshots in `initiatives/ui-audit/docs/assets/157/`.

## Done when
Every scenario in the .feature is covered by a test; full `npx vitest run` passes; `npx tsc --noEmit` clean; phone-width screenshots of the menu item, editor, confirm and the logger after save, in both loggers.

## Don't
Change the admin exercise API's permissions or data shape beyond adding a usage count if missing. No migrations.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet to the lead with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-09 CST: created from Dustin's report; plan confirmed; dispatched to implementer (wE:p7).
