---
id: 046
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Review: TL4 Pinned workouts

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/pinned-workouts`, stacked on TL3, TL2 and TL1. The change is uncommitted: `git status`, `git diff` and the new files. Change no files except your own screenshots.

## Goal
Judge whether TL4 meets its contract, is good code, and looks right in the app. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL4 Pinned workouts");
- the behaviour, `features/training-library/pinned-workouts.feature`;
- the decisions, `docs/decisions.md`;
- the tests: `pinned-workouts.steps.ts`, `pinned-workouts-view.test.tsx`, and the TL2 files TL4 updated (`training-home-view.test.tsx`, `training-home.steps.ts`).

Don't read `work/045-handback.md` until your first-pass verdict is written.

## Focus
- **Migration** `prisma/migrations/20261031200017_saved_workout_pinned_at`:
  - It matches `schema.prisma`, is additive, and is safe on a populated table.
  - It was made with `db execute` + `migrate resolve`, not `migrate dev`. Check that it would pass CI's Check Migrations, e.g. with `prisma migrate diff --from-migrations ... --to-schema-datamodel ...` against a shadow DB.
- **PATCH:**
  - authz (another user's id is now a 404, deliberately);
  - validation before any DB read;
  - pinning again keeps `pinnedAt`;
  - the pin-only `updatedAt` restore: is it correct, and is it needed? Check how saved-workout proposal conflict and revert decide;
  - rename plus pin.
  - GET and DELETE on the same route still return 403 for another user's id. Recommend whether they should match.
- **Optimistic toggle:** the revert on failure, double taps, and the dialog/row sync.
- **`useSessionStart` shared by Start and Repeat:** has Repeat's behaviour changed?
- **The loader's 4th query:** is it per-user, does it use the index, and is it capped at 5?
- **Visual check (Dustin's rule):**
  - Take phone-width (390px) screenshots with Claude in Chrome, or Playwright if Chrome isn't connected; say which you used.
  - Cover: Training with pins (the section order, See all, Start), My Workouts with pinned and unpinned rows (the toggle and marker), and the detail dialog's toggle.
  - Compare them with neighbouring screens and sections (Recent's Repeat rows, Library rows) for consistency.
  - Save the screenshots to `initiatives/training-library/docs/assets/046/`.
  - Use the dev server in worktree2 (`BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL=http://localhost:3200`) and the DB `fitcsv-postgres-wt2` (it has the new column).
  - Pinning on dev data is fine if you unpin afterwards. Don't start sessions unless you clean them up. Stop the server and DB.

## Done when
- A verdict: ship / ship with notes / fix first.
- Findings ranked by severity, each with a `file:line` or a screenshot and a concrete failure.
- You re-ran the training-library and nav tests and tsc.

## Hand back
First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: ship with notes; all 4 findings sent to the implementer as 045 fixes. Accepted.
