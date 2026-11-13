Report: complete

# 200 handback: iOS slice 9a (bottom bar and quick actions) review

## Verdict
**Fix list: 2 fixes, then accept.** 9 of 10 scenarios pass by real taps. The bar, the chip, Quick Actions, per-tab state, History under Training, Programs under Library and the finish route all work and match the web. One part of scenario 1 fails: things scroll beneath the bar.

1. **The bar covers the end of every tab's list (blocking).** No tab's scroll content is inset for the bar, so the last ~58 pt of each list stays under it, even when scrolled to the end:
   - Training (with recent workouts): **Ad-hoc workout** can't be reached. Tapping it hits the bar instead.
   - Settings: the Version row is hidden. Progress: the bottom of the 8-week chart is cut off.
   - Library › a program: the last day is cut off.
   - At AX5 it covers whole buttons.

   This happens on iOS 27.2 and iOS 18.6 (`review9a-ios-list-end-under-bar.png`). 199's AX5 harness failure ("a tap landed on a folder tab that sat under the bar") is this bug, not the harness.
   **Cause:** `RipitApp.swift` attaches the bar with `.bottomBar` (a `safeAreaInset`) to the `TabView`. That inset doesn't reach the `NavigationStack`s inside the TabView's pages.
   **Fix:** give each tab's stack the bar's height as a bottom inset (or attach the bar per stack), so pushed screens get it too. Keep the keyboard rule.
2. **Text shows through the bar.** The fill is `Theme.muted.opacity(0.95)` with no blur. Rows under it, such as "AD-HOC WORKOUT", "PROGRAMS" and "VERSION", stay readable in the bar and in the home-indicator strip (`review9a-ios-see-through-crop.png`). The web's 95% fill has `backdrop-blur-sm`, so nothing is readable there. Make it opaque (simplest), or add a blur. This is cosmetic, but the scenario says "nothing scrolling beneath it".

## Check
- `mise run ios-check` → exit 0. 286 tests in 47 suites pass, then xcodegen and the simulator build succeed.

## First pass (unaided, kept as written)

### Scenarios by real taps
I used `ripit-review` (iPhone 17, iOS 27.2, reused) with a scratch XCUITest harness that taps the real controls. I made no repo edits. Seed: `-demoHistory -demoProgram -demoSaved`.

| Scenario | Result |
|---|---|
| Bar looks and reads like the web's | Order, labels, the raised chip and the accent active tab (gold underline in Ripit) all match the web at 390 px, in dark and light (`review9a-pairs-bar-light.png`). The fill reaches the screen edge. **Fail on "nothing scrolling beneath it":** fixes 1 and 2. |
| Each tab keeps its place | Library › Programs › Strength Base, then Progress and back: the program is still open. Then Edit, and a tap on Library pops to the root. Training › See all › a workout, then Settings and back: the workout is still open, and a tap on Training pops it. The Settings theme list pops the same way. Apple's tab bar never shows on a pushed screen, on iOS 27.2 or on iOS 18.6 (`iPhone 16` sim). **Pass** |
| History lives under Training | No History button. Training › Recent › See all opens HISTORY with the full list and **Import from ripit.fit**. The in-progress card shows on Training after a minimize. **Pass** |
| Programs live under Library | Library has Workouts (n) \| Programs, and Programs lists both programs with ACTIVE, the ⋯ menu and New program. Training's active program card opens Library › Program. **Pass** |
| Quick actions, no open workout | The card shows Continue ("Week 1 · Day 1 · Upper A"), Freestyle ("Log sets as you go") and My saved workouts ("1 saved"). After a reset, Continue reads "No active program", is disabled, and a tap does nothing. My saved workouts is hidden with 0 saved. A backdrop tap and ✕ both close it. **Pass** |
| Quick actions, open workout | Only "Upper A · In progress · tap to resume", the trash and the footer show. The first tap shows a red CONFIRM, which was gone 4.8 s later. Close and reopen: not armed. Two quick taps discard, and the chip goes back to "Quick actions". **Pass** |
| Start or resume | Continue opens UPPER A in the logger, Freestyle opens an empty one, and Resume reopens the open workout. My saved workouts, tapped while Library › Programs › Strength Base was open, lands on Library › Workouts at its root. **Pass** |
| Workout button shows an open workout | 6 chip frames, 0.35 s apart, differ with a draft (6.9k–9.2k pixels change) and are identical with E-ink on, with Reduce Motion on (set via `simctl defaults`), and with no draft. The accessibility label is "Resume draft workout: Upper A", "…: Bench day" for a started saved workout, and "…: Open Workout" for freestyle. **Pass** |
| Largest text, VoiceOver, keyboard | At AX5 the bar stays at 56 pt (y 782–838 at every size) and its labels stay small. The card caps its text and wraps the titles (`review9a-ios-ax5.png`). Each tab is a button, and only the current one has the selected trait. A keyboard in Edit Program's name field hides the bar, which comes back after Return. **Pass, with gaps:** I checked VoiceOver only through the accessibility tree; VoiceOver itself doesn't run in the simulator. The long-press viewer couldn't be captured (the press ends before the screenshot). |
| After finishing a workout | A finish started from Library, then Done, lands on Training. Save, then "Open Library › Workouts", lands on Library › Workouts (2). A swipe-down close lands on Training. **Pass** |

### Regressions
- **Start, log, finish:** Pinned **Start Bench day**, log 135 × 5, Finish, then Done. All work.
- **Repeat** from Recent opens BENCH DAY. **START WORKOUT** under Up next opens UPPER A.
- **Import:** `ripit-export-v1.json` → "Added 2 programs, 3 workouts, 12 sets, 1 saved workout, 1 custom exercise". The workouts show in History, and Strength Block is ACTIVE under Library › Programs. The archived Old Hypertrophy is correctly hidden.

### Side by side with the local web (390 px)
- **Bar:** same items, icons, sizes, active colour and gold underline. The web's chip has a heavier label and an inset highlight; the difference is small (`review9a-pairs-bar-light.png`).
- **Quick Actions:** same rows, subtitles and icons, the same success chip on Continue, the same red CONFIRM, and the same footer (`review9a-pairs-qa.png`, `review9a-pairs-qa-draft.png`). The web names a freestyle draft at creation, so its chip reads "Resume draft workout: Open Workout — November 10, 2026". The phone's reads "…: Open Workout".
- **Tabs:** Library › Programs on the web also has My programs | Browse, and shows "Week 3 of 4 · 4wk · 3x/wk" per row. The phone shows the name, ACTIVE and ⋯, as Training did before (199 decided against Browse). The web's Training has no in-progress card; the phone keeps it, as the spec asks (`review9a-pairs-tabs.png`).

### Code read
- **System bar:** `.toolbar(.hidden, for: .tabBar)` on each `NavigationStack`. It holds on pushed screens on iOS 18.6 and 27.2.
- **Per-tab state:** the paths live in `Shell`, outside the `.id(lookKey)` rebuild, so a theme change keeps them. `showSavedWorkouts`/`showPrograms` reset the Library path, which is right.
- **Safe area:** the cause of fix 1 is above. The bar's own fill reaching the edge is correct.
- **Keyboard:** `KeyboardState` hides the bar for any keyboard, including one in a sheet. That's harmless.
- **Discard:** `DiscardConfirm` resets when the card opens or closes and when the workout changes. The `TimelineView` redraws every 0.5 s only while the card is open.
- The pulse (`PhaseAnimator` with two 20 pt shadows) runs for as long as a draft is open. I didn't measure its cost.

## Questions (answered from the files, as in 191)
1. **Were list ends checked against the bar?** No. 199 checked that "the home-indicator strip is filled", and put its AX5 tap failure down to the harness. It is fix 1.
2. **Should Training's Programs and Ad-hoc workout buttons go?** This is 199's open question, and it's Dustin's call. Whatever he decides, fix 1 is needed: Ad-hoc workout is the button the bar hides.
3. **Is a named freestyle draft titled "Freestyle workout" in the card on purpose?** Yes, the web does the same (198 and 199 both raised it). I'd keep it.

## Revised review
I read `work/199-handback.md` after my first pass. Its "Not verified" list was the long-press viewer, Reduce Motion, iOS 26 and the AX5 tap failure.
- **Reduce Motion:** now walked; the pulse stops.
- **iOS 26:** not available here. I ran iOS 18.6 instead (runtimes: 18.6, 27.2).
- **AX5 failure:** fix 1.
- **Long-press viewer:** still unverified. Please check it by hand on a device.

Its decisions (the bar hides under the keyboard, the always-shown Pinned | Recent block, the gold underline, the AX1 cap on the card, no Browse) are sound and match what I saw. **The verdict stands: fix 1 and 2, then accept.** Once they're fixed, a re-check only needs the list-end shots on each tab and a pushed screen, at default size and AX5.

## Needs a call (not blocking)
- Training's Programs and Ad-hoc workout buttons (199's question 1).
- The freestyle draft name: the web says "Open Workout — November 10, 2026", the phone "Open Workout". Item 196 put the web's dated name out of scope; noting it only.

## Outside the item (not fixed)
- The same finished freestyle workout is "Open Workout" in Training › Recent but "Ad-hoc workout" in History and its detail (`review9a-ios-flows.png`, panels 7 and 8 vs `review9a-ios-pertab.png`). This predates 9a.
- On iOS 18.6, the scrolled TRAINING title runs into the status bar (`review9a-ios-list-end-under-bar.png`, panel 5). Predates 9a.
- One harness run stalled (XCUITest waited 60 s per step for the app to go idle) on a second freestyle workout after a finish. Re-running the same steps, with the pulse on and off, was fast every time, so I don't count it.

## Cleanup for Dustin
- Simulator `ripit-review` (`0BFD652D-…`) is shut down and kept. Its app data holds the imported fixture (the last run used `-resetState`).
- I also used the existing `iPhone 16` (iOS 18.6, `72E9430A-…`) for two runs. It's shut down, and its Ripit app data holds the seed.
- `ripit-review` had Reduce Motion set to on, then back to off.
- Docker `fitcsv-postgres-review155` was started, then stopped. `next dev` on 3955 is stopped. On the web, dmays had no draft when I started. I started one freestyle draft for the draft-state shots and discarded it through Quick Actions, so the data is as it was.
- Scratch, about 800 MB (harness, DerivedData `dd/`, shots, web scripts, logs): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/367c8767-bf01-4ad0-b374-2e7a6690bb24/scratchpad`. `pw/node_modules` is a symlink to an older scratch's copy.
- 10 images in `initiatives/ios-app/handoff/slice9-assets/` (git-ignored), all `review9a-*`:
  - `pairs-*`: the iOS-vs-web sheets
  - `ios-*`: iOS-only sheets, including the fix 1 and 2 evidence
- `ios/Ripit.xcodeproj` and `ios/build` were regenerated by `ios-check` (git-ignored). Nothing committed, nothing deleted.
