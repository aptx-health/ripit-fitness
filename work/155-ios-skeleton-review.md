---
id: 155
state: waiting
waiting_on: 154
executor: ios-review
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 1 plan, this worktree, bundle id fit.ripit.ios)
updated: 2026-11-07
---
# iOS slice 1: review

## Goal
An independent verdict: does slice 1 meet `features/ios-app/skeleton.feature`, and is it sound Swift that later slices can build on?

## Read first
- `features/ios-app/skeleton.feature`, `initiatives/ios-app/scoping.md`, `work/154-ios-skeleton-build.md`.
- The diff of `ios/`, `scripts/ios/`, `mise.toml` on the slice branch. Do not read `work/154-handback.md` before your first pass.

## Do
Follow the review section of the V3 operating agreement: run `mise run ios-check`, then an unaided first pass, then up to 3 questions, then the revised verdict. Pay attention to the schema and migrations (they must carry slice 2's import), data loss on resume/discard, and that the bundled catalog matches the seed.

## Test it hands-on (Dustin asked for this, 2026-11-07)
Reading the code is not enough. In your own simulator (not one another agent uses), build and run the app and walk every scenario in `skeleton.feature` by hand:
- A fresh install shows empty history. Search "bench" and check that photos and the no-image placeholder show.
- Log an ad-hoc workout with a kg and a lbs set, finish it, and check history.
- Kill the app mid-workout and relaunch it, then resume. Discard with confirm.
- Make a superset.
- Try to break it: empty sets, a huge weight, a second workout while one is open, fast taps, rotation, Dynamic Type at its largest size.
Take a screenshot of each screen at iPhone size and note anything slow, ugly or off-theme next to the ripit web styling. List what you could only check on a real device.

Compare against the current web app, side by side at phone width (Dustin asked, 2026-11-07). Use the same flows: start an ad-hoc workout, search exercises, log sets, finish, history. Note where the iOS app looks or behaves differently, and say whether each difference seems deliberate or a gap.
- Staging: https://staging.ripit.fit (deployed from `dev`). Only read and log test workouts there. If you need a login, ask Dustin.
- Or locally: `DOPPLER_PROJECT=fitcsv DOPPLER_CONFIG=dev_personal ./scripts/dev.sh start -l postgres,app` in this worktree (`AGENTS.md` lists the first-run steps). Log in as dmays@test.com / password.
- Drive it with Chrome (claude-in-chrome) or Playwright (`webapp-testing`, `docs/PLAYWRIGHT_RECIPES.md`).

## Hand back
A review packet with first line `Report: complete | needs decision | further handoff` and a clear verdict.

## Log
- 2026-11-07 CST: created (waiting on 154).
- 2026-11-07 CST: Dustin asked that the reviewer test the app hands-on after the build; section added.
- 2026-11-07 CST: Dustin asked the reviewer to compare against the web app (staging or local); section added.
