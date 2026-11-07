Report: complete

# 165 review: iOS slice 3, programs (590d0570)

## Verdict
Checks out, with adjustments. All 10 scenarios work when driven by taps in the simulator, for a hand-built program and for the imported one. The code is sound. Fix 3 should-fix items before Dustin accepts (S1 to S3 below).

## Verified
- `mise run ios-check`: exit 0. 112 tests in 17 suites passed, and the simulator build passed.
- I wrote a scratch XCUITest project pointing at worktree5's `ios/App` and `RipitCore` (no repo edits) and ran it on my own simulator `ripit-165-review` (iOS 18.6). Every step below was a tap or typed input. No launch hooks were used.
  - **Builder:** built "Review 2x3" (2 weeks × 3 days). Weights were free text (`65%`, `RPE 8`, `225`), one set used reps `5+`, Bench and Row were in superset A, and week 2 was copied from week 1. After saving, the program was active and Up Next showed W1·D1.
  - **Following it:** Up Next went D1 → D2 → D3, then W2·D1 with "Week 2 of 2". Prefill worked as on the web: plan reps first (weight blank), then this session's sets, then last time (W2 bench prefilled 135×5).
  - **Plan vs logged:** I logged 2 of 3 prescribed sets and changed set 2's reps to 3 by tapping it. The plan chips stayed 3 sets, and the logged sets were 135×5 and 135×3.
  - **Finish and restart:** after the last workout, "Program complete" showed with Restart. After restart, W1·D1 was current, the detail showed "0 of 6 · cycle 2", and all 6 history rows were kept.
  - **Edit after logging:** renamed week 1 Bench to "Comp Bench" and changed its sets to 2 at 70%/75%. Week 1's history showed "Comp Bench" with all 3 logged 135×5 sets unchanged. Week 2's history kept its own name. Both match the web rule.
  - **Archive while active:** the program left the list, Training showed "No active program", and History still had 6 rows.
  - **Import:** imported `ripit-export-v1.json` through the Files picker (History → Import), and it reported "2 programs, 3 workouts, 12 logged sets…". The active Strength Block showed Up Next W1·D2. The abandoned session there doesn't count as done, which is correct. I followed it through W2·D1 to complete and restarted it (cycle 3). Plan chips showed `5 @ 230lbs RIR 2` and `8 @ 67.5%`.
- Screenshots are in `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree5/fff5394c-578e-4e17-9207-813c494cb97e/scratchpad/shots/`. Key ones: `05-training-active.png`, `21-w2d1-edited-set.png`, `22-program-complete.png`, `35-detail-after-edit.png`, `63-imported-w2d1.png`, `70-home-with-offplan-draft.png`, `finding-builder-swipe-dismiss-lost-draft.png`.

## Defects and risks (first pass, unchanged)
- **S1. Should fix: swiping the builder down loses the whole draft.** I lost a half-built program this way during the walk. There's no confirmation (`App/TrainingView.swift:83`, `App/ProgramViews.swift:59`). Add `.interactiveDismissDisabled` when the draft has content, or a discard confirmation.
- **S2. Should fix: a program workout in progress has no resume card on Training.** The "In progress" card only shows ad-hoc workouts (`App/TrainingView.swift:26`).
  - If you start a day other than Up Next, Training's green Start button is disabled (`:110`) but looks enabled, and tapping a different day silently opens the workout in progress.
  - After archiving a program with a draft open, Training offers no way back, and Ad-hoc is hidden too. Only History's card resumes it (`70-…`, `72-…`).
- **S3. Should fix: the exercise editor keeps RPE, RIR and warm-up by position** (`App/ProgramEditView.swift:195`). If you remove set 1 of an imported exercise, set 1's RPE/RIR/warm-up flags land on the old set 2. Imported plans do carry RPE and RIR.
- **Minor:**
  - History rows and details say only "Day 1" with no program or week, so 4 rows read "Day 1".
  - The default workout name gives "Day 1 · Day 1".
  - `addProgramWeek` makes 32-hex ids while every other id is a UUID (`ProgramsEditing.swift:62`). This is harmless now but a risk once export or sync exists.
  - `ProgramsEditing.swift` (add week/workout/exercise, remove, regroup, rename program/workout) has no tests. I exercised add week, rename and set changes by hand, and they worked.
  - The builder's text fields don't select their text on tap (the same issue as 155's prefill finding).
- **Not verified:**
  - **Web side by side at phone width:** Chrome's viewport rendered at 110px and `/login` redirected to the landing page, and Playwright isn't installed. I compared web rules from source instead (`lib/training/home.ts`). The web allows a draft per workout, while the phone allows one workout in progress, which is what S2 comes from.
  - Real device, Dynamic Type and dark mode for the new screens.

## Questions
1. Should editing one week's exercise also offer to apply the change to later weeks, as a 12-week program would need? Or is per-week editing, which the web seems to do, fine for this slice? My recommendation is per-week for now.
2. Is "one workout in progress" on the phone intended, unlike the web? If so, S2 is the fix. If not, allow one draft per workout like the web.

## Needs a call
- Fix S1 to S3 now: I recommend a small fix item for the implementer, about 1 hour. The rest can go to the slice backlog.

## Where to look first
- `App/TrainingView.swift:26,110`: S2
- `App/ProgramEditView.swift:195`: S3
- `App/TrainingView.swift:83`: S1

## Cleanup (Dustin is away; nothing removed)
- **My mistake:** I ran `scripts/dev.sh` with no arguments in worktree5. It started an overmind stack on slot wt7, and stopping it was refused.
  - Its app pane is dead. Still running: tmux server `overmind-worktree5-kAkeVdmL5tVf2GV4FMfIw` and the docker containers `fitcsv-postgres-wt7` and `fitcsv-redis-wt7`.
  - Stop them with `tmux -L overmind-worktree5-kAkeVdmL5tVf2GV4FMfIw kill-server; docker stop fitcsv-postgres-wt7 fitcsv-redis-wt7`.
  - It doesn't touch worktree1 (wt1).
- The worktree3 web app (`./scripts/dev.sh start -l postgres,app`, port 3600, socket `/tmp/fitcsv-overmind-wt6.sock`) is still running.
- Simulator `ripit-165-review` (66E7D165-0F47-44ED-AAD5-09D5B8E43D44); a copy of the fixture is in its app Documents.
- My scratchpad: `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree5/fff5394c-578e-4e17-9207-813c494cb97e/scratchpad/` (`uitest/`, `dd/`, `shots/`, `small/`, logs).
