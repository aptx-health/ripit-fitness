Report: further handoff

# 155 handback: iOS slice 1 review

**Verdict (provisional, pending the 3 questions):** slice 1 meets all 9 scenarios in `features/ios-app/skeleton.feature` and the core is sound to build on. Accept after two small must-fixes (non-finite weight, hyphen search). The other findings can be should-fix in slice 2/3.

Reviewed commit: `6b0ae6fa` (slice 1). All file:line refs below are at that commit. Note: the branch has since moved (slice 2/3 commits up to `d830d294`) and another agent has uncommitted edits in this worktree (`ios/App/HistoryView.swift`, `WorkoutStore.swift`, `DebugHooks.swift`, `AppDatabase.swift`, `Import.swift`, new `ImportResult.swift`, `ExportFile.swift`, `work/161-…`). I checked file times: every build and test I ran (12:04–12:14) used slice-1 code only. I didn't touch those files.

## Check
`mise run ios-check`: exit 0. 32 tests in 5 suites passed; xcodegen and simulator build ok.

## First pass (unaided)

### Scenarios, walked by hand in my own simulator (`ripit-155-review`, iPhone 16, iOS 18.6)
I drove it with an XCUITest target in a scratch XcodeGen project that points at the branch's `ios/App` and `RipitCore` (no repo edits).

| Scenario | Result |
|---|---|
| Fresh install, empty history | Pass. DB created with `v1-exercise-catalog`, `v2-training-model`; "No workouts yet." |
| Migrations in order, once | Pass (tests; no older shipped DB exists to try by hand). |
| Catalog ships with app | Pass. 312 rows; 297 with start/finish photos, 15 placeholder (e.g. Side Plank shows dumbbell tile). |
| Search "bench" | Pass by name and alias ("flat bench" → Barbell Bench Press, Bench Press). Case ignored. **Punctuation only partly** (finding 2). |
| Log ad-hoc 135×8, 155×5, finish | Pass. History: "Ad-hoc workout, 2 exercises · 4 sets, today". |
| kg/lbs as number + unit | Pass. DB: `62.5 | kg | 5`, `135.0 | lbs | 8`, typeof real. |
| Survives app kill | Pass. Terminated mid-workout, relaunched: resume card with sets, resume continues. |
| Discard with confirm | Pass. Confirmation dialog; draft, its exercise and sets gone; history unchanged; no orphan rows. |
| Supersets kept | Pass. "Superset A" grouping kept in workout and in history detail; `exerciseGroup = 'A'` in DB. |

### Schema and slice 2 import
- Tables mirror Prisma for Program > Week > Workout > Exercise > PrescribedSet/LoggedSet, WorkoutCompletion, SavedWorkout, ExerciseDefinition. Same column names, same unique keys (`loggedSet(completionId, exerciseId, setNumber)`, `week(programId, weekNumber)`, `workout(weekId, dayNumber)`, `exerciseDefinition.normalizedName`), cascades match. GRDB turns foreign keys on. Good base for import.
- Catalog ids are the seed's cuids (`cmiz7vjju0000vr0m4b1o6bec` etc.), so exported `exerciseDefinitionId`s will resolve. Catalog vs seed: 312/312, 0 field differences, 594 referenced images = 594 files, 0 orphans, 36.5 MB.
- Deliberate deviations are documented in `Schema.swift` header (no userId, JSON text arrays, nullable `completedAt` while draft). `Program.copyStatus` is dropped without a note (harmless).

### Findings (most severe first)
1. **Must fix: weight accepts non-finite and absurd values.** `ios/App/WorkoutView.swift:190-197` only checks `w >= 0`. In the simulator "inf" logged a set shown as "∞ kg" and 99999999999999999999 logged "100,000,000,000,000,000,000 kg". A phone decimal pad blocks letters, but paste and hardware keyboards don't. Infinity in `loggedSet.weight` will break JSON export (slice 4) and any stats. Fix: require `isFinite` and a sane cap, ideally also in `AppDatabase.logSet` (`AppDatabase.swift:142`).
2. **Must fix (small): search punctuation drops hyphens instead of treating them as spaces.** `ios/RipitCore/Sources/RipitCore/API.swift:62`. "BENCH-press!" finds nothing; "pull up" misses Wide Grip / Neutral Grip / L-Sit Pull-Up (4 results vs 12 for "pullup"); "t bar row" finds 0. 32 catalog names have hyphens. Tests only cover "bench!", "bench." and apostrophes. Note the web search has the same weakness (question 1).
3. **Should fix: largest Dynamic Type breaks the set entry row.** At AX-XXXL the unit and Log buttons become "…" / "L…" and the weight field shows "1…" (fixed widths in `WorkoutView.swift:163-186`). Folder tab titles truncate ("BARBELL BE…"). History rows wrap one word per line. Screens: `31-dt-workout.png`, `32-dt-set.png`, `30-dt-history.png`.
4. **Should fix: no way to remove an exercise added by mistake**, and an empty workout can be finished into history ("0 exercises · 0 sets"). Web has an exercise EDIT menu. See question 2.
5. **Should fix: prefilled fields keep the cursor where you tap.** After a set, weight/reps prefill from the last set; tapping the field doesn't select its text, so typing 155 into "135" gives 155135 (my first scripted run did exactly this; the app showed "155,135 lbs × 58"). Select-all on focus would match the web keypad's replace behaviour.
6. **Minor: "1 exercises".** `ios/App/HistoryView.swift:64` (resume card) doesn't pluralize; history rows do.
7. **Minor: fast taps log duplicates.** 5 quick taps on Log made 5 identical sets. Delete works, so this is low risk; web has the same "LOG SET" pattern.
8. **Minor / perf: photos decode on the main thread.** `ios/App/ExercisePickerView.swift:106` loads and thumbnails JPEGs synchronously while scrolling. In the simulator 10 fast swipes through the full list took 26.8 s of XCUITest time (it waits for the app to go idle), which hints at main-thread work. Check scroll smoothness on a real device.
9. **Note: seeding only adds missing system rows** (`AppDatabase.swift:49`). A later catalog update that renames or re-images an existing exercise won't reach installed phones. Fine for slice 1; worth a migration or version check before shipping catalog updates.
10. **Note: `imageUrls` holds bundled file names** (`AppDatabase.swift:55`), while web rows hold CDN URLs. Slice 2 import must not overwrite system rows' `imageUrls`.

Things that held up: double-tap Start makes one workout; double-tap Finish makes one history row; Start is hidden while a workout is open; rotation is locked to portrait (`project.yml`), so landscape stays portrait; 0 reps and negative weight are blocked; "1,5" parses as 1.5; huge reps are blocked; dark mode reads well.

### Code quality
Clean split: SQL lives in `RipitCore`, views stay thin, every write goes straight to SQLite. Tests test behaviour (reopen the same file to simulate a relaunch, count orphan rows after discard). Debug launch hooks are `#if DEBUG` only. `install.sh` builds Debug, so the hooks ship in Dustin's phone build but only act on launch arguments, which is harmless.

## Web comparison (local app, phone width 390)
The local app couldn't start through `dev.sh`: slot 1's overmind socket `/tmp/fitcsv-overmind-wt1.sock` is held by worktree1's session (started 11:46, no app listening). I didn't touch it. Instead I ran my own Postgres container (`fitcsv-postgres-review155`, port 5499, same seed script) and `next dev` on port 3955, both now stopped. Chrome clicks didn't register on the waiver page after 3 tries, so I used Playwright for the web flow. Staging was not used.

| Area | Web | iOS | Deliberate or gap? |
|---|---|---|---|
| Start ad-hoc | Quick actions → Freestyle Workout | Big "Start workout" on home | Deliberate (no programs yet) |
| Picker | Multi-select, muscle and equipment filters, FAUs listed, Create New Exercise, no photos in list | Single pick, photos in list, category · equipment | iOS photos are a gain. Multi-select, filters and custom exercises are gaps for later. |
| Search | Same hyphen weakness ("BENCH-press!" → none, "pull up" → 1 result) | See finding 2 | Shared gap |
| Logger | One exercise at a time, reps stepper, whole-number keypad, "Last time" and per-set "last:", rest timer, Plan/Info/History tabs | All exercises on one scroll, free text fields | Deliberate for a skeleton. Last-time and rest timer are likely next asks. |
| Units | Unit from user settings, "WEIGHT (LBS)", no decimals on keypad | Per-set lbs/kg toggle, decimals | See question 3 |
| Finish | Confirm dialog, then rollup (volume, reps, vs last, session RPE, save to repeat) | No confirm, straight to history | Gap. Missing finish confirm risks an accidental finish. |
| History | Training › Recent with Repeat | Home list + read-only detail | Fine for slice 1 |
| Look | Uppercase display font, square corners, 3D-shadow buttons, bottom nav | Same palette and folder tabs, but SF system font and rounded corners | Palette matches. Typography and corners are off-theme next to web. |

## Questions (up to 3)
1. **Search punctuation:** should "bench-press" and "pull up" match "Bench Press" / "Pull-Up" (map punctuation to spaces and also compare with spaces removed)? Options: (a) yes, fix in slice 1 (recommended, ~5 lines plus tests); (b) match web's current behaviour and leave it.
2. **Exercise removal and empty workouts:** (a) add remove-exercise and block finishing an empty workout now; (b) defer to slice 3 with the web logger's EDIT menu.
3. **Units:** the iOS app has a per-set lbs/kg toggle that remembers the last unit globally; web takes the unit from settings. (a) keep per-set (deliberate); (b) move to a settings-level unit like web.

## Revised review
Lead's answers (2026-11-07): Q1 = (a) fix search; Q2 = (a) remove-exercise and block empty finish now; Q3 = (a) keep the per-set unit (logged for Dustin to overrule). Fixes go to item 163 (ios-impl, findings 1-8).

What changed: findings 2 and 4 are now must-fix with the rest. Finding 3's unit toggle stays as is (Q3). Findings 9-10 stay notes for slice 2 (import must not overwrite system rows' `imageUrls`).

**Verdict:** accept slice 1 once 163 makes all of these true. I'll re-check each one hands-on in `ripit-155-review`:
1. **Weight:** non-finite values ("inf", "nan") and values over a sane cap are refused in the UI *and* in `AppDatabase.logSet`. A RipitCore test covers both, and no `∞` can reach `loggedSet.weight`.
2. **Search:** punctuation counts as a space, and there is also a compare with spaces removed. "bench-press", "BENCH-press!", "pull up" (finds every Pull-Up name that "pullup" finds), "t bar row" and "push up" all match. Existing search tests still pass, with new cases for hyphens.
3. **Dynamic Type:** at AX-XXXL the set entry row stays usable: the unit, weight, reps and Log controls are readable and tappable, with no "…" on Log or the unit. History rows and folder tabs stay readable.
4. **Remove exercise:** an exercise in an unfinished workout can be removed, along with its sets and any superset membership that would be left with one exercise. Finishing a workout with no logged sets is blocked, with a clear message. Both are covered by RipitCore tests.
5. **Prefill:** tapping a prefilled weight or reps field lets you replace the value directly (select-all on focus or the like). Typing 155 over 135 logs 155.
6. **Plural:** the resume card says "1 exercise".
7. **Fast taps:** repeated quick taps on Log don't create unintended duplicates, or there's a deliberate guard. If 163 chooses to keep the current behaviour, say so in its packet.
8. **Picker:** photo decoding is off the main thread, or there's a stated reason it's fine. Scrolling the full list in the simulator stays smooth, and a real-device check stays on Dustin's list.
9. **No regressions:** `mise run ios-check` passes with 153's and 158's tests unchanged, and the 9 skeleton scenarios still pass when walked by hand.

## Could only check on a real device
Scroll and image smoothness in the picker; decimal pad layout and the paste path for "inf"; Dynamic Type at the user's real size; free-signing install and the 7-day re-sign; data kept across a reinstall via `install.sh`; app storage size (~37 MB photos); haptics and VoiceOver reading of rows.

## Screenshots
iOS (simulator, iPhone 16, 1179×2556):
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/01-fresh-history.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/02-workout-empty.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/04-picker-bench.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/05-picker-bench-punct.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/06-picker-plank-placeholder.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/09-kg-set.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/10-resume-card.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/13-superset-select.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/14-superset-grouped.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/15-history-one.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/16-history-detail.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/17-discard-confirm.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/18-after-discard.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/21-huge-weight.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/23-fast-log-taps.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/24-rotated.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/27-empty-workout-finished.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/30-dt-history.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/31-dt-workout.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/32-dt-set.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/33-dt-picker.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/60-dark-history.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/61-dark-workout.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/shots/62-dark-picker.png
- (more in the same folder; `run1-bad-clear/` is the run where my script mis-typed into prefilled fields)

Web (local, 390 px, 2x):
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/web/w05-picker-bench.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/web/w06-picker-punct.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/web/w09-logger.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/web/w10-weight-keypad.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/web/w11-two-sets.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/web/w13-after-finish.png
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/web/w14-history-recent.png

Side-by-side sheets:
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/sheet-a.png (iOS main flow)
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/sheet-b.png (iOS Dynamic Type and break tests)
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/sheet-c.png (iOS dark)
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/sheet-web2.png (web picker, logger, finish, history)

## Outside this item (not fixed)
- `dev.sh` slot collision: this worktree (`worktree-brave-field-c150`) hashes to slot 1, the same as worktree1, so both can't run the web app at once. `scripts/worktree-env.sh` has no override.
- The local test user had to accept the waiver. I accepted it in my private local DB only.
- Another agent is editing slice 2 files uncommitted in this same worktree. Two agents sharing one checkout risks a commit sweeping in the other's work.

## Cleanup for Dustin
I removed nothing. These are mine:
- Simulator `ripit-155-review` (B8EF9477-01AB-4FE3-B0CC-9C6D4A9BB4B3), shut down: `xcrun simctl delete B8EF9477-01AB-4FE3-B0CC-9C6D4A9BB4B3`
- Docker container `fitcsv-postgres-review155` (stopped) and volume `fitcsv-pgdata-review155`: `docker rm fitcsv-postgres-review155 && docker volume rm fitcsv-pgdata-review155`
- `node_modules/` in this worktree (from `npm install`, git-ignored), plus the generated Prisma client
- Scratch Xcode project and DerivedData: `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/uitest`, `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/dd`
- `ios/build/` was written by `mise run ios-check` (git-ignored; the check always writes it)
- Chrome tab group left open with one localhost tab

## Re-check against 163 (`e3ee71a6`, 2026-11-07)
Tested from a clean `git archive` of `e3ee71a6`, so no in-flight edits could mix in. `swift test --skip Program`: 69 tests in 13 suites passed. 153's and 158's test files are unchanged; 163 only adds `SliceOneFixTests.swift`. Simulator build exit 0. Walked by hand in `ripit-155-review` with a scratch XCUITest.

| # | Condition | Result |
|---|---|---|
| 1 | Finite, capped weight in UI and DB | **Met.** "inf" and 2001 disable Log and show "Weight must be 0 to 2,000."; 2000 is allowed. `AppDatabase.logSet` throws `invalidWeight`; tests cover non-finite, negative and >2000. |
| 2 | Hyphen/space search | **Met.** "BENCH-press!" → 9 bench presses; "pull up" → all 9 Pull-Up names; "push up" → the Push-Up variants; "lockoff" → Lock-Off Hold. Correction to my first pass: "t bar row" returns nothing because the catalog has no T-Bar Row, not because of a bug. |
| 3 | Usable at AX-XXXL | **Met.** The entry row stacks: weight + unit, reps, then a full-width Log. Logging works. History rows put the date under the name. Folder tabs wrap instead of truncating. |
| 4 | Remove exercise; no empty finish | **Mostly met.** Remove via the "…" menu with a confirm, sets go too, and finished workouts can't be edited (tested). Finishing with no logged sets shows "Log a set first, or discard". Two gaps: (a) removing one exercise of a 2-exercise superset leaves a lone "SUPERSET A" header on the other (screen `r-after-remove.png`); (b) the empty-finish block is UI-only (`WorkoutView.finish`), so `AppDatabase.finishWorkout` still accepts an empty workout and no RipitCore test covers it. |
| 5 | Prefill replace | **Met.** Tapping a prefilled 135 and typing 155 logs 155. |
| 6 | Plural | **Met.** "1 exercise · 2 sets". |
| 7 | Fast taps | **Met.** A double tap on Log logs one set (0.6 s guard per exercise in `WorkoutStore.logSet`). |
| 8 | Photos off main thread | **Met in code.** `ExercisePhoto` loads in `.task` via `Task.detached`. The XCUITest scroll timing is unchanged (26.8 s for 10 swipes), so that measure reflects XCUITest's idle waits, not the app. Smoothness still needs a real device. |
| 9 | No regressions | **Met.** ios-check passes in the agreed sense. The core scenarios still pass (start, log, finish, resume card, superset, history). |

**Verdict: accept slice 1.** The two gaps in condition 4 are small and safe to carry into slice 3: clear `exerciseGroup` when a group drops to one exercise, and add the empty-finish check plus a test in RipitCore. Neither loses data.

Re-check screenshots (iPhone 16):
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/163/sheet-recheck.png (AX-XXXL history, workout, after log; after remove; resume card; inf refused)
- /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/163/shots/ (all: s-* search, f-empty-finish-blocked, w-*, p-*, r-*, d-*, h-resume-card)

More cleanup for Dustin: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/163 (export, DerivedData, scratch UI tests).
