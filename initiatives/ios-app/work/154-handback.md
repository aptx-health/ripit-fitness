Report: complete

## Verdict
Checks out. All 32 locked RipitCore tests pass, the app builds for the simulator, and each screen was screenshotted on my own simulator. Commit `bba91de3` on `feature/ios-skeleton`.

## Verified
- `mise run ios-check` → `✔ Test run with 32 tests in 5 suites passed`, then xcodegen and the simulator build. Exit 0. 153's tests are unchanged and still read-only.
- Image license: free-exercise-db is The Unlicense (public domain). Checked via the GitHub license API and recorded in `ios/README.md`.
- Catalog: 312 exercises, and 594 photos for 297 of them (36.5 MB, under the 60 MB limit). Committed.
- Screenshots (iPhone 16 sim `ripit-154-impl`, dark mode unless noted), in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots/`:
  `1-empty-history`, `2-history-resume`, `3-workout` (superset + kg set), `4-picker-bench` (start/finish photos), `5-picker-placeholder` ("band": placeholders), `6-detail`, `7-discard` (confirm), `8-workout-light`, `9-history-light`.

## Not verified
- I did not tap through the start → add → log → finish flow. The screens were set up with debug launch arguments (`App/DebugHooks.swift`). The logic behind those steps is covered by the core tests.
- `scripts/ios/install.sh` was not run (not unattended, as the item says). Only its syntax was checked. The `devicectl` JSON field names in it are unproven.
- No phone-side perf check. Thumbnails are downsampled and cached, and the full catalog list was not profiled.

## Scenario → test map
All 9 scenarios are covered by 153's tests, unchanged (see `work/153-handback.md`): all pass. These UI parts were checked by screenshot only: the empty-history text (1), the photos and placeholder (4, 5), and the discard confirmation (7).

## Files changed
- `ios/RipitCore/Sources/RipitCore/Schema.swift`: 2 migrations (`v1-exercise-catalog`, `v2-training-model`) covering all 9 core tables.
- `.../AppDatabase.swift`, `Catalog.swift`, `API.swift`: the bodies behind the API (the shapes are unchanged), plus catalog loading.
- `ios/App/*`: SwiftUI screens, the ripit theme, folder blocks, debug launch args.
- `ios/project.yml`, `mise.toml`, `scripts/ios/build-catalog.ts`, `scripts/ios/install.sh`, `ios/README.md` (install steps).

## Decisions beyond the handoff
- Ad-hoc workouts are stored like the web: a `workoutCompletion` (isAdHoc, `draft` then `completed`) plus one-off `exercise` rows. `completedAt` is NULL while a workout is a draft. There are no `userId` columns.
- Added `AppDatabase.deleteSet(_:)` (public API, untested by 153), so a set logged by mistake can be removed.
- Superset groups are letters A, B, … Search puts name matches first, then alias-only matches. An empty query lists every exercise.
- The weight unit defaults to the last unit logged, and per exercise to that exercise's last set.

## Needs a call
- None.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/Schema.swift:16`: the schema slice 2 imports into.
- `ios/RipitCore/Sources/RipitCore/AppDatabase.swift:39`: open, migrate, seed the catalog.
- `ios/App/WorkoutView.swift`: set entry and the superset selection.

## Cleanup for Dustin
- Simulator `ripit-154-impl` (`6D438DC4-A1C3-4380-8C9A-7DAB6881E9C2`) is still booted: `xcrun simctl shutdown` then `delete` it when done.
- The scratchpad `shots/` folder (the `small-*` copies and the screenshots) and `ios/build/` (git-ignored build output, ~hundreds of MB).
