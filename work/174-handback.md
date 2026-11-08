Report: needs decision

## Verdict
Checks out, with one call needed. The tests and stubs are in place and the web's goldens are recorded. The tests pass against a correct fake and catch 32 of 32 single-rule breaks. The open call: the web seems to mishandle half-step RPE (see Needs a call).

## Verified
- `mise run ios-check` → 178 tests, 46 issues, **all 46 are `notImplemented`**. All earlier tests pass. The check stops at the test step, as the handoff expects.
- I ran the app-build step on its own (`xcodegen` + `xcodebuild ... -quiet build`) → exit 0, so the API changes don't break `ios/App`.
- I ran `npx tsx scripts/ios/logging-help-goldens.ts` twice → the output is byte-identical both times.
- Scratch fake (a copy of the package outside the repo, with fake bodies) → all 23 new tests pass.
- Break matrix: one rule broken per variant, running only the tests aimed at that rule → **32 of 32 caught**, by group:
  - presets: 2
  - clocks and their text: 5
  - rest timer: 5
  - last time: 9
  - history: 8
  - effort and warm-up saving: 3

  "Prefer RPE over RIR" got through on the first run. I changed the golden so the two give different text, and now it is caught.
- Changed one golden value → only that case failed. Restored it.

## Not verified
- UI scenarios, for the reviewer's hands-on walk:
  - **Exercise info** (photos, instructions, muscles and equipment)
  - **Exercise notes** (shown, and no section when there are none)
  - **Finish asks first** (Cancel keeps the workout open)
  - The timers actually ticking on screen, and continuing after locking the phone for 2 minutes
  - The "Last time" line being tappable
  - Warm-ups collapsed in History
- The clock text values ("0:00", "1:02:03") are written by hand from the web code (`hooks/useRestTimer.ts`, `hooks/useWorkoutTimer.ts`). They live inside React hooks and weren't run.
- The relative date on the web's line ("3 days ago") isn't tested.

## Assumptions and decisions beyond the handoff
- **No migration needed.** `loggedSet.createdAt` already exists. The new `logSet(…, at:)` writes it, and the rest timer reads it.
- **Small API changes:**
  - `SetDetail` gains `rpe`, `rir` and `isWarmup`, defaulted. The implementer must read them in `AppDatabase.detail`.
  - `Prefill` is now `Codable`.
- History shows 4 workouts, like the web (`HISTORY_SESSION_LIMIT = 4`). The web's trend arrow and e1RM header are left out because the spec doesn't mention them.

## Needs a call
- **Half-step RPE (6.5, 7.5…).** The web shows these presets, but `LoggedSet.rpe` is an `Int`:
  - The program logger sends a float (`components/ExerciseLoggingModal.tsx:328`). It looks like Prisma would reject that; I haven't run it.
  - The ad-hoc logger truncates 7.5 to 7 (`components/adhoc/AdHocLoggerView.tsx:496`).

  The contract stores `rpe: Int?` (`LoggingHelp.swift:155`), and the tests use whole numbers only. **My recommendation:** for now the phone offers whole RPE values only, and the web bug gets its own item.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/LoggingHelp.swift`: the header lists every rule.
- `scripts/ios/logging-help-goldens.ts`: comments on each case in `WORKOUTS`.

## How to run
- `mise run ios-check` → right now it should show exactly 46 `notImplemented` issues. Once implemented, it should pass everything and then build the app.
- `npx tsx scripts/ios/logging-help-goldens.ts` regenerates the golden.

## Cases
| Targets | Tests | Why |
|---|---|---|
| Presets | 2 | Lists, labels ("5+") |
| Clocks and their text | 4 (13 cases) | Floor vs round, clamp at 0, padding, hours |
| Rest timer | 6 | Latest set, per exercise, this workout only, relaunch, delete to 0 |
| Last time | 3 + 12 golden | Excludes unfinished, includes archived, line format, tap fill, intensity off |
| History | 6 golden | Limit 4, order, no rep cap, kg, warm-ups, PR rules, ties, bodyweight |
| Effort and warm-ups | 5 | Save and read back, Progress effort, planned default, records |

There was no case cap; this is about 3 cases per rule.

## Feared bugs
- Reusing Progress's e1RM (12-rep cap) → `hist_e1rm_cap12`
- The timer counting from the wrong set (first set, another exercise, an earlier workout) → `timer_*`
- Counting the open workout as "last time" → `last_includes_draft`
- Swift printing "185.0" → `summary_number`

## Coverage of the reference
No coverage tool was run on the web functions. The golden reaches every branch in `formatLastSessionSummary` and `sessionE1RMs`/`allTimePRSessionIndex` except a weight unit other than lbs/kg.

## Quirks for a human to mark
These copy the web. Is each one intended or accidental?
- A single set reads "200 lbs × 5 × 1".
- A workout mixing units shows the raw numbers with the first set's unit: "100–225 kg × 5".
- Archived workouts count for "last time" and History.
- The web has no way to mark a logged set as a warm-up; the spec asks the phone for one.
- The web's rest timer restarts at 0 on a page reload; the phone's survives a relaunch, as the spec says.
- After deleting the newest set (others remaining), the web's timer keeps its start time; the phone's goes back to the previous set's time. No test covers this.

## Locked
The two test files and `history.json` are set to 444. To unlock: `chmod 644 <file>`.

## Cleanup
Scratch files, not removed (they're in the session scratchpad, not the repo): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/44afb9af-41a6-40d7-89a7-85bb6d797219/scratchpad/` (`fakepkg/`, `logs/`, `*.log`, `run1.json`, `breaks.tsv`, `run.sh`). Nothing is committed.
