---
id: 045
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Build: TL4 Pinned workouts

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/pinned-workouts`, stacked on TL3 (#1008). Don't commit.

## Goal
Build TL4 so its tests pass. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL4 Pinned workouts");
- the behaviour, `features/training-library/pinned-workouts.feature`;
- the tests and seams, `work/044-handback.md`;
- the test files, which are locked: `pinned-workouts.steps.ts`, `pinned-workouts-view.test.tsx`, and the updated `training-home-view.test.tsx` and `training-home.steps.ts`.

## Do
1. **Schema:**
   - Add `pinnedAt DateTime?` and `@@index([userId, pinnedAt(sort: Desc)])` to `SavedWorkout`.
   - Create the migration locally with `npx prisma@6.19.0 migrate dev --name saved_workout_pinned_at` against the worktree2 dev DB (`fitcsv-postgres-wt2`).
   - Never run `migrate deploy`, and never point at staging or prod. Pass any Doppler `--config` explicitly.
   - Make sure the test harness template picks the migration up.
2. **Build the seams as named.** Lead decision: another user's id on PATCH returns 404, not 403 (a deliberate change).
3. **Page glue:** pass `pinned` through on `/training`, and make sure `/library?type=workouts` shows the toggles.
4. **Self-check visually:**
   - Take phone-width screenshots: Training with the Pinned section, My Workouts with pinned and unpinned rows, and the detail dialog's toggle.
   - Use Chrome if it's connected, otherwise Playwright.
   - Save them in `initiatives/training-library/docs/assets/045/`.
   - Pinning on the wt2 dev DB is fine. Leave the data as you found it (unpin), with no real side effects. Stop the server and DB afterwards.
5. **Run the check:**
   - all training-library, nav and saved-workout tests;
   - the agent-tools saved-workout proposal tests, which guard the conflict and revert rules;
   - the full suite;
   - `npx tsc --noEmit`;
   - biome on the changed files.

## Done when
- The TL4 tests are green, and so are TL1–TL3.
- The full suite passes and tsc is clean.
- The migration file exists.
- The screenshots exist.

## Don't touch
- The test files.
- `work/`, `STATE.md`, status files.
- Staging and prod.

## Hand back
The `handoff-implementer` packet, with the migration name. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: handback saved. Lead re-ran: 2036 passed, tsc clean; screenshot looks right. Spec updated for the migration method. Review 046 dispatched.
- 2026-10-31 MDT: review 046 fixes sent: page-wide session lock, per-row pin guard, GET/DELETE 404, stale comment.
- 2026-10-31 MDT: retry in (4 fixes). Lead re-ran: full suite green, tsc clean. Preview up; waiting on Dustin.
- 2026-10-31 MDT: Dustin: "Looks great" on the phone preview. Accepted.
