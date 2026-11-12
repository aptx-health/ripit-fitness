Report: complete

## Verdict
Checks out. Commit `60623a5c` (my paths only). `mise run ios-check` → `✔ Test run with 144 tests in 24 suites passed`, then xcodegen and the simulator build, exit 0. All 16 locked Progress tests pass against the web goldens on the first run, and every other locked test is unchanged.

## Verified
- Goldens: the weekly report (6 weeks across 3 histories), records, lifts, trend, pins, the 7 lift pages and their 4 chart ranges all match the web field by field. Pin tests cover order, no duplicates, surviving relaunch, unpin, save, and imported pins.
- Screenshots (the `basic` golden's history imported, plus 3 workouts logged with `-demoHistory`), in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots168/small/`:
  - `1-progress`: week switcher; report card (5 of 3 Done, +107% sets, time, effort, an 11-week streak); records with PR chips
  - `2-lift-page`: Barbell Back Squat, 3M e1RM chart with the PR point highlighted, the change and best-e1RM line, rep records with New chips

## Not verified
- My screenshots don't reach the lower blocks (pinned lifts, lifts, Last 8 weeks bar chart and trend note), because I can't scroll the simulator from the command line. The data behind them is golden-tested.
- No light mode or AX-size pass on these screens.
- Wording follows the web's `format.ts`, `rows.tsx` and `RecordsLifts.tsx` by reading, without a side-by-side check against the web.

## How it works
- `RipitCore/ProgressMath.swift`: a straight port of `progress.ts`, `progress-records.ts` and `lift-history.ts`, plus `lastSets` from `pinned-lifts.ts`. `buildWeeklyReport` composes them the way `scripts/ios/progress-goldens.ts` does.
- `Progress.swift`: the bodies now read every completed, un-archived set (definition names, oldest first, then exercise order and set number) and call the maths. Shapes are unchanged.
- **Migration `v5-pinned-exercise`:** one row per lift, holding its position, with a maximum of 12 pins.
- **Pin import:** `pinnedExercises` in a file becomes the pins only when the phone has none, so a re-import never brings back a lift unpinned on the phone.
- **App:**
  - **Progress tab:** the week switcher, Report card, Records, Pinned lifts (with a Pin button that opens the exercise picker), Lifts, and Last 8 weeks (a Swift Charts bar chart plus the trend note).
  - **Lift page:** a 3M/6M/1Y/All picker over a line chart (e1RM, or reps for bodyweight), the change since the range start and the best e1RM, rep records, sessions, and a pin toggle.
  - **Settings sheet:** unit (lbs/kg, default lbs) and weekly target (default 3), both in `@AppStorage`.

## Decisions beyond the handoff
- Unit and target live in `@AppStorage` (166's call: they're parameters). Weeks use the device's time zone.
- The streak counts back over all weeks from the first workout, as the goldens do. That's equivalent to the web's `olderStreakWeeks` query.
- The lift page lists the newest 20 sessions.

## Needs a call
- None.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/ProgressMath.swift`: `buildWeeklyReport` and `chartSeries`.
- `ios/App/ProgressTabView.swift`: the `Words` enum, which holds the web wording.

## Cleanup for Dustin
- The scratchpad `shots168/` folder. Inside the sim app's container: `Documents/progress-basic.json`.
- The simulator `ripit-154-impl` is still booted.
