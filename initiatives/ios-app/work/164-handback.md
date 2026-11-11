Report: complete

## Verdict
Checks out, with two adjustments where the item clashed with locked tests (see Needs a call). Commit `3279a885` (my paths only). `mise run ios-check` → `✔ Test run with 124 tests in 21 suites passed`, then xcodegen and the simulator build, exit 0. That is the 112 locked tests, unchanged, plus 12 new.

## Verified
- New tests are in `Tests/RipitCoreTests/ImportUpdateTests.swift`:
  - a later file updates a status and a name, and adds its new set
  - a phone-created row is untouched, even when a file names its id
  - a phone edit to a row the web didn't change survives re-import (an archived session, as after a program restart)
  - a stale draft becomes abandoned with its sets kept; a recent draft is resumable; a second draft loses to the phone's own draft; an archived draft is never offered
  - report counts across first / repeat / later imports: added 2·3·12·1·1, then 6 already up to date, then 1 set added, 2 updated, 4 up to date
  - addendum: a superset of one loses its group on remove, a superset of three keeps it, and empty finishes (below)
- Can fail: with the hash check disabled, the phone-edit test and the report test fail (5 issues). I restored it.
- Screenshots in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots164/small/`:
  - `1-first-import`: "Added 2 programs, 3 workouts, 12 sets, 1 saved workout, 1 custom exercise…"
  - `2-same-file-again`: "Nothing new to add; 6 already up to date…"

## How it works
- **New migration `v4-import-hash`** adds `importHash` to the 9 import tables. NULL means the row was created on the phone and is never touched. Otherwise it holds a hash of the file's values at the last import.
- **On a later import,** a row is updated only when the file's values differ from that hash. So "the web changed it" wins, and phone edits to rows the web left alone stay.
- **`savedWorkout` already had an `origin` column** (session/agent/coach), so I didn't add a second "origin".
- **Exercise definitions are insert-only.** Renaming one could clash on the unique normalized name.
- **New API `importReport(data:) -> ImportReport`** with added, updated and unchanged counts. `importExport` still returns the locked `ImportSummary`.
- **What "updated" and "unchanged" count:** top-level programs, workouts and saved workouts. A program counts as updated if anything under it changed.

## Needs a call
1. **24-hour draft rule:** measured from the export time, not from now. The draft must have started or logged a set within 24 h before `exportedAt`. The locked `draftResumable` test has a draft 24 h 4 min before the fixture's export, with its last set 23 h 59 min before it. It runs on the real clock, so a "now"-based rule fails it from today on. The catch: an old export imported much later can still bring in a resumable draft.
2. **Finding 5 (only exercises with logged sets):** done in the History detail screen, not in `workout(_:)`. The locked slice 3 test `supersetInHistory` expects a finished program session's `workout(_:)` to list an exercise with no sets.
3. **Addendum (6), empty finish:** `finishWorkout` throws `RipitCoreError.emptyWorkout` only when the workout has no sets **and** no exercises (its own or the program workout's). This keeps the locked `twoSupersetsDistinct` passing. The UI still blocks any finish with no sets.

## Not verified
- I didn't try a later export through the app by hand. The core tests cover it.
- Rows imported before v4 have a NULL hash, so a later export treats them as phone rows. That's harmless unless Dustin has already imported once on the phone. If he has, a re-import won't update them.

## Outside this item
- If slice 3 (programs-impl) adds its own `v4-…` migration on `feature/ios-programs`, the next merge needs the identifiers ordered by hand.

## Cleanup for Dustin
- The scratchpad `shots164/` folder.
- The simulator `ripit-154-impl` is still booted.
