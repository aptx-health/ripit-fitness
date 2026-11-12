Report: complete

# 205 handback: iOS slice 9b (one-exercise logger) review

## Verdict
**Fix list: 1 fix that matters, 2 smaller ones, then accept.** All 12 scenarios pass by real taps, in a program workout and a freestyle one, in RIPIT dark and light and at AX5. Bar look B works in all 13 themes, and nothing moves with Reduce Motion or E-ink on. The program is never changed by a reorder, swap or delete.

1. **A reordered freestyle workout saves in its old order (data).** I reordered a freestyle workout to Squat, Bench, Row, finished it and saved it. The saved workout reads Bench, Row, Squat, and **Start this workout** would use that order (`review9b-ios-saved-order.png`).
   - **Cause:** `moveExercise` writes only `sessionExercise.position`. `saveWorkout` (`SavedWorkoutsStore.swift:37-38`) still reads `exercise."order"`.
   - **Fix:** in `moveExercise`, also rewrite `"order"` for the workout's own rows (`workoutCompletionId = ?`). The alternative is to make the save path read today's order. Add a store test: reorder, finish, save, and check the saved order.
2. **After the planned sets, the form stays on screen (parity).** The web swaps the form for "✓ ALL PLANNED SETS LOGGED", and its header reads "4 OF 4 DONE". The phone keeps the reps and weight form and says "SET 4" (`review9b-pairs-logger.png`, panels 3 and 4). The bar is right on both. The spec only names the bar, so this is parity polish, not a scenario failure.
3. **At AX5 the bar's labels are cut off.** They read "+ EXTRA…" and "NEXT EXERC…" (`review9b-ios-ax5.png`, panel 2). The bar still works. Cap the bar's text size the way the header does, or let the labels wrap.

## Check
- `mise run ios-check`: exit 0. 347 tests in 59 suites pass, and the app builds.

## First pass (unaided, kept as written)

### Scenarios by real taps
I used `ripit-review` (iPhone 17, iOS 27.2, reused) with a scratch XCUITest harness that taps the real controls. I made no repo edits. Seeds: `-demoProgram` (Upper A; `-demoDone 2` gives Full Body with superset A) and `-demoHistory`.

| Scenario | Result |
|---|---|
| One exercise at a time | The header shows PLAN n/N, the clock, FINISH and ✕. Below it are LOG / INFO / HISTORY n, and NOTES appears only when there are notes. **Pass** |
| The bottom bar | It shows ‹ · LOG SET "5 reps × 140 lbs" · ›. ‹ is off on the first exercise and › is off on the last. A disabled button keeps its outline. The bar fills the home strip. **Pass** |
| Swipe | Left and right swipes of 160 pt go next and previous, and so do `swipeLeft`/`swipeRight`. A 30 pt swipe, a 45° swipe (both directions) and a vertical swipe do nothing. With a keypad open, a 160 pt swipe does nothing. **Pass.** A short drag that starts on a readout opens its keypad (204 notes this too). |
| Log a set | The logger stays on the exercise and keeps the weight. Reps change from last time's 8 to the plan's 5. RESTING starts inline. **Pass.** I couldn't feel the haptic in the simulator. |
| After the planned sets | After 3 working sets the bar shows + EXTRA SET and NEXT EXERCISE. Extra set brings LOG SET back with NEXT. A warm-up doesn't count: after it the header still says SET 1 OF 3. In Full Body, header FINISH hides on the last exercise once its sets are done. **Pass** (fix 2 is the form). |
| Keypads | Tapping the weight readout opens the pad and hides the bar. 1, 3, 2, ., 5 gives 132.5. Done keeps it. Pressing 9 then Cancel brings back 132.5, so the first key replaces the value. The reps stepper's + gives 13, and its readout pad gives 12. The effort grid opens from RIR. **Pass** |
| Freestyle, no exercises | The header reads PLAN 0/0, the panel says "Add an exercise to start logging sets", and the bar offers only ADD EXERCISE. **Pass** |
| Plan list | Rows show the number, NOW, "1 of 2 sets · 140 lbs", a tick when done and "Superset A". Tapping row 3 jumps to it. **Pass** |
| Reorder, swap, delete, add (program) | Dragging Squat to the top while on Row keeps Row on screen, and its number changes from 2/3 to 3/3. Swapping Row for Deadlift puts it in the same place, with the plan's 2 × 10 and the badge. Deleting Deadlift (the current exercise), with its confirm, lands on Bench, the one before it. Adding Curl appends it and opens it. After the finish, Library › Strength Base › Day 3 is still Bench, Row, Squat with A, A. **Pass** (`review9b-ios-program-plan.png`) |
| Supersets in order | Previous from 3 goes to 2 (Row, SUPERSET A). Next and previous follow list order. **Pass** |
| Exit | With nothing logged the workout is gone, in a program and in freestyle. With a set logged it offers Discard workout / Keep as draft. Keep closes the logger, the chip says "Resume draft workout: Upper A" and Resume reopens it. Discard clears it. **Pass** |
| Slices 5–8 and AX5 | Warm-up, effort (RIR grid), Last time and Use, Info, History (with PR and e1RM), the rest stopwatch, the finish summary, the picker (add and swap) and Save workout all work. At AX5 the header drops "PLAN", the panel scrolls, and the keypads fit. **Pass, with fix 3.** |

Freestyle, all on one workout: I added 3 exercises in one picker trip, logged 100 × 3 and grouped 1 and 2 (badge on both). I moved Squat to the top, the current exercise stayed, and I ungrouped Bench (badges gone from both). Then I finished and saved it, which is where fix 1 shows.

### Regressions
- **Import:** `ripit-export-v1.json` gives "Added 2 programs, 3 workouts, 12 sets, 1 saved workout, 1 custom exercise". History and Strength Block (ACTIVE) show, the same as in 9a.
- **Start, log, finish, summary, Save, Open Library › Workouts:** all work.

### Bottom bar look B
- **13 themes × dark and light, plus the E-ink display setting:** each shows the lit accent-muted block with its 3 pt accent top edge and dims the other tabs. E-ink keeps its bold underlined label (`review9b-ios-bar-themes.png`).
- **Motion:** I recorded the simulator at 60 fps. With motion on, the marker slides and the page nudges for about 0.45 s per tab change. With E-ink display on, or with Reduce Motion on (`simctl defaults`), it jumps in one frame (`review9b-ios-bar-motion.png`). I set Reduce Motion back to off.

### Side by side with the local web (390 px, light)
- **Logger and bar:** same header, tabs, Last time, stepper, readouts, LOG SET with its second line, and + EXTRA SET / NEXT EXERCISE. The phone's ‹ is outlined; the web's ‹ was hidden behind the Next.js dev badge. Fix 2 is the one real gap (`review9b-pairs-logger.png`).
- **Keypads:** same keys and CLR row. The phone adds "." as Dustin asked. The web's weight and reps pads also show a "Recording weight" / "Counting reps" tip card; the phone's don't (`review9b-pairs-keypads.png`).
- **Effort:** the web's RIR picker is a single-column list ending in CANCEL / SKIP RIR. The phone's is a 2-column grid ending in CANCEL / NONE (the slice 5 grid).
- **Plan list:** same rows, NOW, counts, menus and REORDER / ADD EXERCISE. The web is a bottom sheet with ☐☐☐ set boxes; the phone is a full sheet without the boxes (`review9b-pairs-plan.png`).
- **Sets list:** the web shows "last: 8 × 135 lbs" under each planned row; the phone doesn't.

### Code read
- **State model:** all of it lives in `WorkoutView`'s `@State`: `currentId`, the forms per exercise, `extraSets`, `pad` and the plan and picker targets. The bar and header are pure functions of RipitCore's `LoggerRules`. Two effects:
  - Closing the logger loses the forms. On Resume, the reps come back as the session's last set (8), not the plan's next (5).
  - `extraSets` and `restClosed` are keyed by exercise id, so a program swap leaves stale keys under the old id. This is harmless.
- **Does an edit change the program?** No, by design and in the taps:
  - Reorder writes `sessionExercise`.
  - Swap makes a one-off copy with the plan's sets, moves today's sets onto it and hides the program row today.
  - Delete removes today's sets and hides the row.
  - None of the three edits `exercise` rows that have a `workoutId`.
- **Other readers:**
  - *History list count:* it reads the one-offs plus the exercises with logged sets, so hidden rows don't count (their sets are gone).
  - *History detail:* it reads today's order and skips hidden rows.
  - *Progress and the rollup/summary:* they join `loggedSet` to `exercise` to the definition, so moved sets count under the swapped exercise.
  - *Last time / prefill:* `prefill` needs a program row, so a swapped copy falls back to its plan. That is fine.
  - *Repeat:* it orders by the first logged set. That is fine.
  - *Saved workout:* wrong after a freestyle reorder (fix 1).
  - *Export:* the phone has none yet; import only.

## Revised review (after reading `204-handback.md`)
- **"Other readers … the numbers hold":** true for counts, sets and Progress. It misses the one reader that depends on order, `saveWorkout`. That is fix 1.
- **204's "Not verified" list, now walked:**
  - *Reduce Motion and E-ink:* no motion with either (video).
  - *Motion:* the marker slides and the page nudges (video).
  - *Program reorder, swap and delete:* all tapped in a program, and the program is unchanged.
- **Still not walked:**
  - *Haptics:* the simulator has none.
  - *Notes tab:* the seed has no notes.
  - *Custom-exercise create and edit:* not run.
  - *VoiceOver:* checked through labels only.
- **204's open risks:**
  - *The lone superset badge:* confirmed. After deleting Deadlift (swapped from Row), Bench alone still shows "Superset A", in the logger and in the history detail. See Needs a call.
  - *The AX5 panel height:* usable; the panel scrolls (`review9b-ios-ax5.png`).
  - *Readout taps:* confirmed as described.
- **204's decisions:** the header on `secondary` matches `ExerciseLoggingHeader.tsx`. Closing the plan sheet before the picker opens, the 350 ms swap wait and the window-level pan all behaved in every run. Exit with nothing logged leaves without asking, where the web asks first; see Needs a call.
- **The verdict stands:** fix 1, then 2 and 3, then accept. A re-check needs only:
  - fix 1's save order, by tap and test;
  - the after-planned panel next to the web's;
  - the bar at AX5.

## Needs a call (not blocking)
1. **Dimmed tab labels are low contrast.** Look B dims the inactive tabs to 60%. The best label pixel against the bar measures:
   - dracula light 1.5:1, dracula dark 1.95:1;
   - forest light 1.96:1, catppuccin light 2.15:1;
   - github 2.34 to 2.36:1, clyde 2.36 to 2.43:1.

   For text, WCAG's floor is 4.5:1, or 3:1 for large text. The options are to keep Dustin's pick, dim less (around 80%), or dim the icon only.
2. **A lone "Superset A" stays in a program workout** after deleting or swapping its partner. Ungrouping is freestyle only. Either end the group for today, or accept it.
3. **Exit with nothing logged doesn't ask** (203's item 7). The web asks first (CANCEL / DISCARD / SAVE AS DRAFT).
4. **Web extras the phone lacks:** the keypad tip cards, the single-column RIR list with SKIP, the ☐ set boxes in the plan list, and "last:" under each planned set. These are probably for a later slice.

## On Dustin's phone notes (`205-dustin-notes.md`, for merging into the fix item)
These are facts from the 390 px web shots, for the lead:
- Note 2 (Weight and RIR not lined up): on the phone, the RIR box sits about 9 pt higher than the Weight box (`review9b-pairs-logger.png`, panel 1). The web puts both on one row with matching labels.
- Note 3 (the form pushed to the top): the web is also top-aligned.
- Note 4 (DONE is green): the web's keypad DONE is green (success) too, in RIPIT light. Accent would depart from the web.

## Outside the item (not fixed)
- **Wrong Info text:** Barbell Bench Press's Info tab shows decline-bench instructions ("Secure your legs at the end of the decline bench…"). This is catalog data.
- **History count:** a history row counts an added exercise with no sets ("2 exercises · 1 set"), but the detail shows only one exercise. This predates 9b.
- **Empty freestyle label:** VoiceOver reads "Plan, exercise 1 of 0" (`WorkoutView.swift:159`). The screen shows 0/0.
- **Elements behind the logger:** XCUITest still lists the Training screen's buttons under the logger's full-screen cover. Please check by hand with VoiceOver on a device that focus can't reach them.

## Cleanup for Dustin
- **Simulator:** `ripit-review` (`0BFD652D-…`) is shut down and kept. Its app data holds the imported fixture. Reduce Motion was set on, then back to off. Don't run `handoff/sims.sh` if you want to keep it: that script deletes every `ripit-*` simulator.
- **Docker and the web:** `fitcsv-postgres-review155` was started, then stopped. `next dev` on 3955 is stopped.
- **Web data:** dmays had no draft when I started. I started Upper Body, logged 4 sets and discarded it through Exit › Discard. Quick Actions shows Continue again, so the data is as it was.
- **Scratch:** about 940 MB at `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3672bbc3-9750-4385-9718-8efe4ccd8c2c/scratchpad`. It holds the harness `uitest/`, DerivedData `dd/`, `shots/`, `vid/` (3 recordings and their frames), `web/`, `pw/` and the logs. `pw/node_modules` is a symlink to an older scratch's copy.
- **Images:** 11 in `initiatives/ios-app/handoff/slice9-assets/` (git-ignored), all `review9b-*`:
  - `pairs-*`: iOS beside the web;
  - `ios-*`: iOS only, including the evidence for fixes 1 and 3.
- **Generated files:** `ios/Ripit.xcodeproj` and `ios/build` were regenerated by `ios-check` (git-ignored).
- Nothing committed, nothing deleted.
