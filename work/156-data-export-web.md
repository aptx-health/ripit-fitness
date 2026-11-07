---
id: 156
state: running
waiting_on:
executor: export-web
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal: new web JSON export; lead runs review and fix loops)
updated: 2026-11-07
---
# Web: "Download my data" JSON export (ripit-export v1)

Checkout: `~/projects/worktrees/ripit-fitness/worktree3`, new branch `feature/data-export` from `origin/dev`. Size: small. Write the tests yourself (test first), then the code.

## Goal
A signed-in user downloads all their training data as one JSON file. The iOS app (slice 2) imports it. It also suits "bring your own agent".

## Read first
- `features/ios-app/import.feature` in the lead worktree (`/Users/dustin/.herdr/worktrees/ripit-fitness/worktree-brave-field-c150`). Copy it into your branch as `features/data-export.feature`, keeping only the first four scenarios (the web side).
- `AGENTS.md` (API conventions, testing, perf-check), `prisma/schema.prisma`, `lib/insights/export.ts` (the existing row export: reuse its style and scoping), `docs/PRISMA_SELECT_PATTERN.md`.

## Do
1. **The format first.** Write `docs/RIPIT_EXPORT_FORMAT.md` for `{ format: "ripit-export", version: 1, exportedAt, ... }`. It covers user settings, custom ExerciseDefinitions, programs nested to PrescribedSets (with exerciseGroup), WorkoutCompletions with Exercises/LoggedSets (program-linked by workoutId, ad-hoc with their one-off exercises), SavedWorkouts, PinnedExercise, and balance settings. Use Prisma field names and ids as they are, and ISO dates. Reference system exercises by id plus name.
2. Commit a realistic fixture, `docs/fixtures/ripit-export-v1.json`, built by your code from a test DB. It needs one active program with a superset, plus an archived one, finished, abandoned and ad-hoc workouts, kg and lbs sets, one saved workout and one custom exercise. Then **ping the lead right away** (`herdr agent prompt wX:p1 "156 format ready: <commit>"`), because iOS import tests are built from it. Keep working after the ping.
3. `GET /api/me/export` (session auth, rate limited, logged, try/catch; a fixed number of queries, not per row) and a "Download my data" row in Settings that matches the folder style.
4. Tests in vitest (DB-level for the builder, plus scoping to the user), covering the four web scenarios.

## Done when
- `npm run test:run -- export` and the full suite pass. `doppler run --project fitcsv --config dev_personal -- npm run type-check` and `npm run lint:all` are clean.
- `npm run perf:scan -- --changed origin/dev` is clean, and there is a query-count assertion (same count for 1 and 10 workouts).
- A phone-width screenshot of the Settings row.

## Decide alone
- The JSON shape details (be faithful to the schema), and the row wording and placement in Settings.

## Don't touch
- The lead worktree, `ios/`, `work/`, `STATE.md`, `initiatives/`. Don't push, open a PR or merge; the lead does that.

## Hand back
The `handoff-implementer` packet with the first line `Report: ...`, sent to the lead with `herdr agent prompt wX:p1`.

## Log
- 2026-11-07 CST: created (ready).
- 2026-11-07 12:01 MST: dispatched to export-web (running)
