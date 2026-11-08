Report: needs decision

## Verdict
Checks out, with two calls needed. The stubs and tests are in place. The expected values come from running the web's own code (routes, rollup, grouping, Training, and the rendered summary modal) against the Postgres test database. The tests pass against a correct fake and catch 57 of 57 single-rule breaks. Both open calls are web behavior the tests currently copy (see Needs a call).

## Verified
- `mise run ios-check` → 205 tests, 48 issues, **all 48 are `notImplemented`**. All earlier tests pass. The check stops at the test step, as expected. 2 of the 48 read "expected notFound, got .notImplemented"; that is the stub too.
- Ran the app-build step on its own (`xcodegen` + `xcodebuild ... -quiet build`) → exit 0. The `ExerciseDetail.planned` addition doesn't break `ios/App`.
- Ran the golden generator twice → byte-identical output (same sha both times).
- Against the scratch fake, all 24 new tests pass (37 cases with the parameterized ones). One new test passes against the stubs: "The golden loads", which checks only the fixture.
- Break matrix. One rule broken per variant, and each variant runs only the tests aimed at it, after one full baseline run. **57 of 57 killed**:
  - summary numbers: 12
  - summary text: 10
  - suggested name: 2
  - saving: 8
  - groups: 5
  - manage: 5
  - start: 5
  - repeat: 6
  - Training: 4

  Two breaks got through on the first run: "last time includes archived workouts" and "Training's recent includes archived workouts". I added data to the golden for each (an archived curl that would be the last time, and a recent archived workout), and now both are caught.
- Changed one golden value ("-2% vs last" → "-3%") → only that case failed, with a readable diff. Restored it.
- `biome check` is clean on the two new scripts.

## Not verified
- UI scenarios, for the reviewer's hands-on walk:
  - **Summary sheet appears after Finish** and closes; Save shows only for an ad-hoc workout (none on a program workout, none on the minimal summary).
  - **Save sheet**: the name is pre-filled and editable, notes are optional, and the fields stop at 100 and 2000 characters. After saving, the sheet shows "Saved to your workouts" and links to Library › Workouts.
  - **Library › Workouts**: sections in order New, Pinned, Recent, then **Older folded closed** and **Show archived closed**. Dismiss is on New rows.
  - **Delete asks first**; Cancel keeps it.
  - **Start while a workout is open**: asks Resume or Discard; Discard then starts the saved workout.
  - **Training**: Pinned has a one-tap Start; Recent shows Repeat only where `canRepeat` is true; Repeat opens the logger ready to log.
  - The logger shows the planned sets of a started or repeated workout ("3-5" reps, warm-ups marked).
- The web modal was rendered in jsdom, not a browser. The generator reads its text through CSS classes, so a modal restyle could break the generator (not the Swift tests).
- No coverage tool: `@vitest/coverage-v8` isn't installed. By reading the code, the golden reaches every branch of `computeWorkoutRollup`, `groupSavedWorkouts`, the trend logic and `formatDuration`. Not reached: the volume ≥ 10,000 path is tested only for the total, never for one exercise's volume.
- Not covered (no phone equivalent, or out of the feature): Undo after archive, agent/coach sender labels on New rows, `updatedAt` rules (pin-only and archive leave it unchanged), and the session effort chips on the summary.

## Assumptions and decisions beyond the handoff
- **No migration needed.** `savedWorkout`, `workoutCompletion.savedWorkoutId` and one-off `prescribedSet` rows already exist.
- **Small API change:** `ExerciseDetail` gains `planned: [ProgramSetDetail]` (defaulted), so the logger can show a started workout's plan. The implementer must fill it in `AppDatabase.detail`.
- **Summary row order:** the web reads logged sets with no `ORDER BY`, so its order is whatever Postgres returns (logging order in practice). The contract says: in the order each exercise's first working set was logged.
- **Rename only renames.** The web's rename dialog sends just the name; notes are set when saving.
- "Open" means a non-archived draft, as `inProgressWorkout()` reads it. Start and repeat throw `SavedWorkoutError.workoutOpen(id)` instead of opening a second workout.

## Needs a call
- **Volume adds kg as if it were lbs.** `lib/stats/workout-rollup.ts` sums `weight × reps` with the raw number and the modal labels it "Volume (lbs)". 5 × 100 kg + 5 × 225 lbs shows as "1,625 lbs" (c-upper's squat). Progress (slice 4) converts kg × 2.20462, so on the phone the two screens would disagree for kg users. The tests copy the web.
  - **My recommendation:** keep parity now, and fix the web and phone together in a separate item. If you'd rather the phone convert now, the golden has to be hand-edited, because the web can't produce those values.
- **Bodyweight "vs last" compares today's total reps with last time's top set.** Today 12 + 10 against last time's 8, 8, 7 shows "+14 reps vs last" (`WorkoutRollupModal.tsx` uses `ex.reps` against `previousTopSet.reps`). It looks like a bug; the tests copy it. My recommendation is the same: keep parity, and fix the web later.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/SavedWorkouts.swift`: the header lists every rule.
- `scripts/ios/saved-workouts.goldens.ts`: the comments in `COMPLETIONS` and `SAVED` say what each case is for.

## How to run
- `mise run ios-check` → right now it should show exactly 48 `notImplemented` issues. Once implemented, it should pass everything and then build the app.
- Regenerate the golden (Docker running; with Colima, export the variables from `docs/TESTING.md` first):
  `npx vitest run --config scripts/ios/vitest.goldens.config.ts`
  The config is separate, so `npm run test:run` doesn't pick up the generator.

## Cases
| Targets | Tests | Why |
|---|---|---|
| Summary numbers | 10 golden + 3 | Warm-ups, order, kg, last time (archived, program, warm-up-only), top set, duration, counts, minimal |
| Summary text | 8 golden + 1 | Tiles, "1,001", "10.2k", "156.3", "5m 03s", "45s", trend words, Save |
| Suggested name | 3 golden | Local date late at night, another month |
| Saving | 10 golden cases + 4 | Trim, blank notes, length limits (emoji), twice, program, stored JSON keys, relaunch |
| Groups | 1 golden (18 rows) | Every group, the 30-day edge, pin vs New, archived vs pin, sort |
| Manage | 16 golden steps + 2 | Pin twice, unpin, archive, restore, dismiss, rename, delete twice, relaunch |
| Start | 3 golden + 2 | Rich plan, archived (restored), New one, open workout refused |
| Repeat | 5 golden + 2 | Logging order, program session, warm-ups only, nothing logged, archived |
| Training | 1 golden + 2 | 5 pins, 3 recent, archived out, "Open Workout", `canRepeat`, duration 0 |

There was no case cap; this is about 3 cases per rule.

## Feared bugs
- JS rounding against Swift's: -2.5% → "-2%" (`t_pct_round_away`), 1000.5 → "1,001" (`t_volume_banker`), 156.25 → "156.3" (`t_top_banker`)
- Converting kg, which the web doesn't (`r_kg_converted`)
- The suggested name using the UTC date (`n_utc`)
- Counting name length in characters rather than UTF-16 units (`s_count_chars`)
- Saving renumbering set numbers (the web keeps gaps) or dropping unlogged exercises (`s_renumber`, `s_drop_empty`); repeat doing the opposite (`rp_no_renumber`)
- Restore re-pinning or sending a dismissed workout back to New (`m_restore_no_dismiss`, `g_dismissed_new`)

## Coverage of the reference
No coverage tool was available (see Not verified).

## Quirks for a human to mark
These copy the web. Is each one intended or accidental?
- If last time's workout had only warm-ups for a lift, there's no trend, even when an older workout had real sets (c-upper's bench).
- Saving keeps set-number gaps ("setNumber": 4 after 2), while repeat renumbers 1…n.
- Saving keeps exercises with no logged sets; repeat leaves them out.
- The save route accepts a minimal workout; only the Save button hides it.
- "#8" is the lifetime count now, not as of that workout.
- A workout that is both pinned and archived (possible in imported data) shows only under archived, and not on Training.
- The summary shows a stored duration of 0 as "0s" (only when not minimal); Training hides it.
- Restoring a session workout also sets `dismissedAt`, which only matters for agent and coach workouts.

## Locked
The two test files and `saved.json` are set to 444. To unlock: `chmod 644 <file>`.

## Cleanup
Scratch files, not removed (in the session scratchpad, not the repo): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/44afb9af-41a6-40d7-89a7-85bb6d797219/scratchpad/` (`fake179/`, `logs179/`, `breaks179.tsv`, `run179.sh`, `matrix179.txt`, `red179.log`, `base179.log`, `check179.log`). The app build regenerated `ios/Ripit.xcodeproj` and `ios/build`, as `ios-check` does. Nothing is committed.

New and changed files: `ios/RipitCore/Sources/RipitCore/SavedWorkouts.swift`, `API.swift` (`ExerciseDetail.planned`), `Tests/RipitCoreTests/SavedWorkoutsGoldenTests.swift`, `SavedWorkoutsTests.swift`, `Tests/Fixtures/saved-workouts/saved.json`, `scripts/ios/saved-workouts.goldens.ts`, `scripts/ios/vitest.goldens.config.ts`.
