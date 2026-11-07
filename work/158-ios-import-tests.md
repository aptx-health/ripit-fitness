---
id: 158
state: ready
waiting_on:
executor: import-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal slices 1-3; lead runs the loops)
updated: 2026-11-07
---
# iOS slice 2: tests for importing a ripit-export file

## Goal
Failing Swift Testing tests for the phone-side scenarios in `features/ios-app/import.feature` (from "Import a file on the phone" to the end).

## Read first
- `features/ios-app/import.feature`.
- The format: `git -C ~/projects/worktrees/ripit-fitness/worktree3 show 575a5d05:docs/RIPIT_EXPORT_FORMAT.md` and `...:docs/fixtures/ripit-export-v1.json` (branch feature/data-export). Copy the fixture into the test resources here; note the source commit in a comment.
- `ios/RipitCore/Sources/RipitCore/{Schema,API,AppDatabase}.swift`: the local schema (commit bba91de3).

## Do
- Add an import API stub (e.g. `importExport(data:) throws -> ImportSummary`) and test against the fixture plus small hand-made variants: a duplicate import, wrong format, corrupt JSON, version 2, and an unknown exercise id.
- Assert DB state: counts per table, an active program kept, plan vs logged sets apart, weight number + unit, idempotency (stable ids), and nothing changed after a refused file.
- Prove it the usual way (fake passes, stub fails, breaks caught). Lock the new tests.

## Done when
- `mise run ios-check` passes the existing tests; the new tests fail only with notImplemented.

## Escalate to Dustin when
- Never during this run; list calls with recommendations.

## Don't touch
- Other agents work on this branch at the same time (ios-tests on programs tests, ios-review). Commit only your own paths, explicitly. No edits to existing tests or `ios/App/`. Not `work/`, `STATE.md`, `initiatives/`.

## Hand back
The `handoff-test-builder` packet, first line `Report: ...`, sent to wX:p1. Don't run rm: list cleanup.

## Log
- 2026-11-07 CST: created (ready); fixture from 575a5d05.
