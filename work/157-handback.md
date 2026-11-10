# 157 handback (implementer wE:p7, 2026-11-09) — Report: needs decision

Verdict: checks out with adjustments. Both loggers show "Edit exercise definition (Admin)" to editor/admin; quick editor with "Save for everyone?" (usage count) and "Discard changes?"; full editor has both; logger keeps place and values and shows the new name.

Needs a call (answered by Dustin 2026-11-09):
1. New name only lasts the session: logger shows the per-workout `Exercise.name` copy. → Rename matching copies (all users' rows still carrying the old name) in the same save; confirm says so.
2. 42/313 local definitions have instructions >1000 chars (max ~1,700), so saves 422. → Raise the limit to 4000.

Verified (implementer): `__tests__/components/admin-exercise-edit.test.tsx` 22 pass; failure check (2 breaks → 2 fails each); full suite 4476 pass; tsc, Biome, ESLint clean; perf:scan clean; Playwright 390px screenshots in `initiatives/ui-audit/docs/assets/157/` (program-0..8, freestyle-0..5).
Not verified: perf:tap on a prod build; real-phone tap-through.

Files: new `components/workout-logging/useAdminDefinitionEdit.tsx`, `components/features/exercise-definition/DefinitionEditConfirms.tsx` (layers: sheet 96, editor 97/98, confirms 99); edited QuickEditExerciseSheet (name field, confirms, error text), ExerciseDefinitionEditorModal (`confirmForEveryone`, `zIndex`), LoggerConfirm (`zIndex`), useProgressiveExercises (`applyDefinition`), ExerciseLoggingModal, AdHocLoggerView, adhoc page, lib/api/adhoc-workout.ts.

Beyond the handoff: program logger already had the role (Library page passes it) — the lead's "never passed" read was wrong; item relabelled. Full editor was z-81 under the quick sheet (hidden) — fixed. Admin table quick sheet confirms too. Program logger no longer calls onRefresh after save.
Risks: quick-sheet edits are lost if you then open the full editor; usage counts Exercise rows ("workouts"); AdHocLoggerView 1004 lines.
Cleanup: QA freestyle draft cmw9wiacd0074vr3t3bql29yh in the wt2 DB.

## Round 2 (2026-11-09) — Report: complete
Rename: new `lib/exercises/update-definition.ts` updates the definition and renames matching `Exercise` rows (exact old name) in one transaction; admin PATCH uses it and logs `renamedExercises`. Limit 4000 (`MAX_INSTRUCTIONS_LENGTH` exported, editors use it). Confirm adds "Workouts still named X are renamed too" when the name changed. Tests: `__tests__/api/admin-definition-rename.test.ts` (5), validator 4000/4001, admin-exercise-edit now 28. Suite 4488 pass, tsc clean. Open: user-facing `/api/exercise-definitions/[id]` PATCH does not rename rows (out of scope). Draft cmw84lcev0044vr3tnzv046g0 (2026-11-08) not the implementer's, left.
