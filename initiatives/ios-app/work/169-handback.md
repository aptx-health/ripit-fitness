Report: needs decision

# 169 handback: iOS slice 4 review (Progress)

**Verdict (provisional, pending 3 questions):** `10828474..60623a5c` meets all six scenarios in `features/ios-app/progress.feature`. The numbers are the web's: every value I could check by hand matched the goldens, including mixed units and all four chart ranges. Pins survive a relaunch, and it reads well on a phone in light and dark. No must-fix. Two small should-fixes: one-decimal rounding differs from the web, and report-card labels break mid-word at AX sizes. The open questions are about web features the phone doesn't have yet.

Worked in `~/projects/worktrees/ripit-fitness/worktree6` (detached at `60623a5c`). Fresh simulator `ripit-169-review` (5BFA4E68-231A-44F0-AC3D-7DC8606941DA, iPhone 16, iOS 18.6). I didn't read `work/168-handback.md`.

## Check
`mise run ios-check`: **144 tests in 24 suites passed**, then xcodegen and the simulator build, exit 0. The locked tests are unchanged since `10828474` (`git diff 10828474 60623a5c -- ios/RipitCore/Tests` is empty).

## Do the goldens call the web's functions?
**Yes, for the maths.** `scripts/ios/progress-goldens.ts` imports the real `summarizeWeeks`, `computeNormal`, `computeStreak`, `weekStartFor`, `weekBounds`, `addWeeks` (`lib/insights/progress.ts`), `computeWeekRecords`, `computeWeekLifts`, `computeTrendNote` (`progress-records.ts`), and `computeLiftSessions`, `computeRepRecords`, `weeklySets`, `chartSeries` (`lift-history.ts`). None of them is copied.

**The composition is a hand copy.** `getWeeklyReport`, `loadPinned`/`lastSets` and `getLiftHistory` need Postgres, so the script repeats their wiring (`weeklyReport`, `lastSet`, `liftPage`; the header says so). I compared that wiring with the source:
- **Records and lifts:** the web feeds the 9-week window plus `earlierBestSets`; the script feeds the full history. Same result, because the earlier bests are a subset that keeps every best the functions read.
- **Streak:** the web pads older weeks only when the window is all hits (`olderStreakWeeks`); the script counts every week since the first. Same streak.
- **Pinned last set:** same order as the SQL (latest `completedAt`, then `completionId`, e1RM, lbs, reps), same 12-rep cap, same warm-up and archived filters.
- **Not covered:** `programWeek` ("Week 2 of Dev 4-Week Strength") and cardio. The phone has no cardio, and see question 2 for `programWeek`.

**Risk:** if the web's composition changes, the goldens won't notice (finding 4).

## Hands-on (simulator, scratch XCUITest harness, no repo edits)
| Check | Result |
|---|---|
| Import `basic` (golden history; its "this week" is the real current week) | Previous week (Oct 26) matches the golden exactly: 3 workouts, 7 sets, 3h 0m, RPE 8.0 (17% at 9+), streak 10. Records: squat 310×3 e1RM 341 (was 336), bench 207.5×5 e1RM 242 (was 239). Lifts and pinned match too. |
| Log a workout with lbs and kg and beat records | Bench 230 lbs×5 and squat 140 kg×5. This week becomes 3 of 3 (DONE), 11 sets (+52%, normal 7), streak 11. Squat shows **308.6×5 · e1RM 360 lb (was 341)**: 140 kg converted at 2.20462. Bench 230×5 · e1RM 268 (was 242). Row and OHP rep PR still match the golden. |
| Pin / unpin / relaunch | Pinned bench from its lift page and unpinned deadlift from its page. After a relaunch the list is squat, pull-up, bench (`pinnedExercise` positions 0/2/3). The imported pins (squat, deadlift, pull-up) arrived from the file. |
| Display unit kg (settings sheet) | Every weight converts: 140×5 · e1RM 163 kg (was 155), 104.3×5 · e1RM 122 kg. |
| Import `mixed-units` (kg display, 14 months, dark mode) | Bench lift page ranges match `chartSeries`: 3M +10.5 kg (+9.4%), 6M +14.5 kg (+13.4%), 1Y +18.5 kg (+17.8%), All +22.5 kg (+22.5%), best e1RM 123 (122.5). Records 1 rep 116×1, 5 reps 105×5 NEW, 8 reps 86.6×8. Pull-up (bodyweight) shows a Reps chart and "Most reps 17". Trend "Your last light week was 3 weeks ago" matches `lastLightWeeksAgo: 3`. |
| Scroll every block | Report card, Records, Pinned lifts, Lifts, Last 8 weeks (bar chart plus trend note): all render, light and dark. |
| AX-XXXL | Everything stays readable and tappable. Card labels break mid-word: "WORK OUTS", "WORKI NG SETS", "Over-head Press" (finding 2). |
| Large history (3,000 workouts / 49,500 sets) | Progress tab 1.95 s, previous week 1.69 s, lift page 1.65 s, All range 0.58 s, including XCUITest overhead. The reports run synchronously on the main thread (`ProgressTabView.load`, `LiftPageView.load`), so expect roughly 1 s of hitch at that size on a Mac. A real history is far smaller. |

## Web comparison (local app at 390 px, seeded test user)
The local web app ran on my own Postgres (port 5499), driven by Playwright. Layout and wording only:

| Area | Web | iOS | Deliberate or gap |
|---|---|---|---|
| Week header | "WEEK OF NOV 2" plus "Week 2 of Dev 4-Week Strength" | "This week", no program line | Gap: `programWeek` isn't built (question 2) |
| Records and lifts | One folder with tabs, "RECORDS 12 / LIFTS", and a pin icon on every lift row | Separate Records, Pinned lifts and Lifts blocks; pin from the lift page or the Pin button | Deliberate; reads fine on a phone |
| Pinned lifts | Inside the Lifts tab ("Pin lifts to track them here", EDIT TRACKED LIFTS) | Its own block | Deliberate |
| Last 8 weeks | Bars plus an RPE row per week | Bars plus the trend note | Small gap |
| Lift page | Metric tabs E1RM / TOP SET / VOLUME; tiles for best e1RM, range change and sessions; chart with an all-time PR line and a top-set dashed line | e1RM chart only (Reps for bodyweight), a one-sentence summary, Records, Sessions | Gap (question 1) |
| Wording | "e1RM 233 lb (was 228)", "PR", "REP PR", "best 10-rep set" | Same | Matches |
| Look | Display font, square corners, 3D buttons | Ripit palette, folder tabs, SF font | Same theme gap noted in 155 |

## Findings (most severe first)
1. **Should fix: one-decimal rounding differs from the web.** `ProgressTabView.swift:192` (normal workouts), `:222` (effort change) and `:396` (`Words.rpe`) use `.number.precision(.fractionLength(1))`, which rounds half to even. The web's `toFixed(1)` rounds half up. Seen in the simulator: normal 3.25 shows **"3.2"** where the web shows "3.3"; 8.25 → 8.2 vs 8.3. `Int(x.rounded())` also differs on negative halves (Swift −14.5 → −15, JS `Math.round` → −14), which affects signed changes such as the e1RM change on lift rows. Fix: one helper that rounds half up, `(x * 10 + 0.5).rounded(.down) / 10`, used everywhere.
2. **Should fix: AX sizes break labels mid-word.** `CardRow` (`ProgressTabView.swift:249-268`) puts the label and the aside in one `HStack`, so at AX-XXXL "WORKOUTS" wraps as "WORK OUTS" and "WORKING SETS" as "WORKI NG SETS". Stack the aside under the value at accessibility sizes, as 163 did for the logger.
3. **Minor: Progress doesn't refresh while it's on screen.** Reports reload in `onAppear` only. When I imported with Progress already showing (the `-demoImport` hook), it stayed empty until I left the tab. In normal use you import from History and log from Training, so switching tabs refreshes it.
4. **Minor: the goldens can drift from the web.** The composition in `progress-goldens.ts` is a copy (above). A small web-side test that runs the real `getWeeklyReport` and `getLiftHistory` on the golden histories in the test Postgres, and diffs against the JSON, would catch drift.
5. **Minor: the import result alert lives on History only.** After the app gained a Training tab, an import started any other way (only the debug hook today) shows no result.

## Questions (up to 3)
1. **Lift page metrics:** the web has E1RM / Top set / Volume tabs and stat tiles. (a) Add Top set and Volume now: `chartSeries` already returns the top-set and reps changes, so the data is there. (b) Defer, since e1RM meets the spec.
2. **Program week line:** the phone has programs now. (a) Add `programWeek` ("Week 2 of …") to the report, with a golden; (b) defer.
3. **Fix 1 and 2 now or in the next slice?** (a) A quick follow-up item now (recommended; both are small); (b) fold them into the next slice.

## Revised review
Pending answers. If all three are (b), the verdict is accept as is.

## Could only check on a real device
Main-thread timing for a large history on the phone; Swift Charts scrolling and smoothness; how the pin icon reads at real text sizes; time-zone edge cases away from America/Denver (the goldens use Denver, and the app uses the device zone).

## Screenshots
- Sheets: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169/sheet-progress.png (Progress after records, light), /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169/sheet-lift.png (bench lift page, 4 ranges plus sessions), /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169/sheet-dark.png (mixed units, kg, dark, bench All, pull-up), /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169/sheet-ax.png (AX-XXXL, settings, kg), /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169/sheet-web-vs-ios.png (web Progress | iOS Progress | web lift | iOS lift)
- All iOS shots: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169/shots/ (b-*, c-lift-*, d-*, e-relaunch-*, f-ax-*, g-*, h-prev-week-*, m-*, p-huge-*). Ignore `run1-noimport/`: that run's import file was missing.
- Web shots: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169/web/

## Cleanup for Dustin
Nothing removed.
- Simulator `ripit-169-review`: `xcrun simctl delete 5BFA4E68-231A-44F0-AC3D-7DC8606941DA`. The earlier `ripit-155-review` and `ripit-162-review` are still listed in their packets.
- Docker container `fitcsv-postgres-review155` (stopped again) and volume `fitcsv-pgdata-review155`. The local test user now has an extra freestyle workout from 155.
- `ios/Ripit.xcodeproj` regenerated in worktree6 (git-ignored); worktree6 is left detached at `60623a5c`.
- Scratch: /private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/169 (harness, DerivedData, import files, shots).
