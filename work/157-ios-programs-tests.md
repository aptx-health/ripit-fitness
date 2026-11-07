---
id: 157
state: running
waiting_on:
executor: ios-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal slices 1-3; lead runs the loops)
updated: 2026-11-07
---
# iOS slice 3: tests for programs

## Goal
Failing Swift Testing tests for `features/ios-app/programs.feature`, built on slice 1's RipitCore (now implemented, commit bba91de3), so the implementer has a fixed target.

## Read first
- `features/ios-app/programs.feature`.
- `ios/RipitCore/Sources/RipitCore/{Schema,API,AppDatabase}.swift`: the current schema (programs tables already exist) and API.
- The web oracles: `lib/db/current-week.ts`, `week-navigation.ts`, `program-completion.ts`, `program-restart.ts`, `lib/workout/prefill.ts`, `lib/workouts/start-draft.ts`, `lib/training/` (Up Next). Record expected outputs from these rules, not from guesses.

## Do
- Add the API surface the tests need (stubs throwing notImplemented), and a new migration if the schema needs one (never edit v1/v2).
- One test file per scenario group. Prove that a scratch fake passes, that the stub fails, and that targeted breaks are caught (break-matrix, small batches).
- Keep slice 1's locked tests untouched and still passing. Lock the new ones.

## Done when
- `mise run ios-check` passes. Slice 1's 32 tests pass; the new tests fail only with notImplemented.
- The handback includes a scenario-to-test map, and notes where the web rules were ambiguous and which reading you chose.

## Escalate to Dustin when
- Never during this run. Make the call, and list it under Needs a call with your recommendation.

## Don't touch
- `ios/App/`, the web app, `work/`, `STATE.md`, `initiatives/`. Item 155 (review) is running on this branch: don't change slice 1 source files beyond adding API stubs.

## Hand back
The `handoff-test-builder` packet, first line `Report: ...`, sent to wX:p1. Don't run rm: list cleanup.

## Log
- 2026-11-07 CST: created (ready).
- 2026-11-07 12:05 MST: dispatched to ios-tests (running)
- 2026-11-07 CST: back 23209e8a (38 tests, 29/29 breaks). Lead calls: red check accepted until the build; restart archives completions like the web (cycle bump kept); renames follow the web; archiving the active program deactivates it. Spec updated; sent back to amend.
