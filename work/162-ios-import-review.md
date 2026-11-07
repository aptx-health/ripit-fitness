---
id: 162
state: accepted
waiting_on:
executor: ios-review
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
---
# iOS slice 2 review: importing a ripit-export file

## Goal
An independent verdict on commit `4d3a414c` (branch `feature/ios-skeleton`): does it meet the phone scenarios in `features/ios-app/import.feature`, and is it safe with real data (no partial imports, no duplicates, nothing lost)?

## Read first
- `features/ios-app/import.feature`, `work/160-ios-import-build.md` with its Log, `work/158-ios-import-tests.md` Log (the lead's calls). Don't read `work/160-handback.md` before your first pass.
- The format: `git show feature/data-export:docs/RIPIT_EXPORT_FORMAT.md`.

## Do
Follow the operating agreement's Review section. `swift test --package-path ios/RipitCore --skip Program` must pass (Program suites are red by design until slice 3 merges).
Hands-on in your simulator:
- Import the fixture, then import it again.
- Import a hand-made larger file (e.g. 300 workouts, 5k sets, generated from the fixture), and time it.
- Try a corrupt file, a v2 file, and a non-JSON file.
- Kill the app mid-import and relaunch.
Compare the imported history against what the web shows for the same data (local web app: `/api/me/export` from `worktree3` branch `feature/data-export`, or the fixture's content).

## Hand back
A review packet with first line `Report: ...` and a verdict, sent to wX:p1. Report only. Don't run rm.

## Log
- 2026-11-07 CST: created (waiting on 155; reuses ios-review, who didn't build the import).
- 2026-11-07 CST: run in ~/projects/worktrees/ripit-fitness/worktree6 (detached at 4d3a414c) so ios-impl's 163 edits don't mix in.
- 2026-11-07 12:27 MST: dispatched to ios-review (running)
- 2026-11-07 CST: verdict needs decision; lead answers Q1 a (update rows that came from a file), Q2 a (24 h, else abandoned), Q3 a; fixes in 164. Import of 300 workouts / 5k sets took 1.3 s on the simulator.
- 2026-11-07 CST: 164 re-check says accept; lead accepts slice 2 under 4h autonomy (should-fix follows in 167).
