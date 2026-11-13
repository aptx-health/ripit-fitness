Report: complete

## Verdict
Checks out, with one adjustment. All 29 Import tests and the 32 slice 1 tests pass. The app imports the fixture, shows a summary, and refuses a version 2 file. Commit `4d3a414c` (only my paths; no test files touched).

## Verified
- `swift test --package-path ios/RipitCore --skip Program` → `✔ Test run with 60 tests in 10 suites passed`. `--filter Import` → 29 passed.
- The full run is `103 tests, 48 issues`, all from the red Program suites (157), as expected.
- The simulator app build (`xcodegen` + `xcodebuild … generic/platform=iOS Simulator`) → exit 0.
- Screenshots on my sim `ripit-154-impl`, in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots160/` (phone-width copies in `small/`):
  - `1-import-action`: the empty history with "Import from ripit.fit"
  - `2-file-picker`: the iOS Files picker
  - `3-summary`: "2 programs, 3 workouts, 12 logged sets, 1 saved workout, 1 custom exercise"
  - `4-history-after-import`: shows "Squat + Press", the program session named after its workout
  - `6-refused`: version 2, with a plain reason
  - `7-history-unchanged`: after the refusal
  - `8-relaunch-after-plist`: the data survives a reinstall

## Not verified
- **`mise run ios-check` does not pass as a whole.** Its `swift test` step fails on the Program tests, so the build step never runs. I ran both steps by hand instead. This is the adjustment.
- I didn't time a large real export. The import runs off the main thread with an "Importing…" overlay, and checks each row with one `SELECT` before inserting.
- I didn't tap through the picker on a phone. The summary and refusal screens were driven with `-demoImport <path>`.

## Files changed
- `RipitCore/Import.swift`: `importExport` and the refusal sentences.
- `RipitCore/ExportFile.swift`: the v1 Codable model.
- `RipitCore/AppDatabase.swift`: `dbQueue` is now internal. `history()` names a program session after its workout and counts the exercises it logged against. `workout(_:)` includes the program workout's exercises.
- `App/HistoryView.swift`, `ImportResult.swift`, `WorkoutStore.swift`, `DebugHooks.swift`: the import action, the summary and refusal alerts, and debug arguments.
- `project.yml` + `App/Info.plist`: Files/Finder sharing for the app's folder, and the version keys.
- `README.md`: import steps.

## Decisions beyond the handoff
- **Re-import:** it never updates an existing row. Same file → no change; a later file → only new rows.
- **Exercise name matching:** checks every local row, not just the catalog (catalog first), so two unknown refs with one name can't clash.
- **Ignored on import:** `settings`, `balanceSettings` and `pinnedExercises` (no local tables).
- **Where the action lives:** under History, and in the empty state with a one-line hint.

## Needs a call
- `ios-check` is red until 157 lands. Should it skip `Program` meanwhile? I left `mise.toml` alone.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/Import.swift:75`: `run()`, which resolves exercises first, then programs, sessions and saved workouts.
- `ios/RipitCore/Sources/RipitCore/AppDatabase.swift`: the `history()` and `detail` changes, which 161 builds on.

## Cleanup for Dustin
- The scratchpad folders `shots/` and `shots160/`. Inside the sim app's container: `Documents/ripit-export-2026-11-07.json` and `ripit-export-v2.json`.
- The simulator `ripit-154-impl` (`6D438DC4-A1C3-4380-8C9A-7DAB6881E9C2`), still booted.
- `ios/build/` (git-ignored).
