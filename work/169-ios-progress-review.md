---
id: 169
state: running
executor: ios-review
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal stretch: slice 4)
updated: 2026-11-07
waiting_on:
---
# iOS slice 4 review: Progress

## Goal
An independent verdict on commits 10828474..60623a5c (`feature/ios-skeleton`): does Progress meet `features/ios-app/progress.feature`, are its numbers the web's, and does it read well on a phone?

## Read first
`features/ios-app/progress.feature`, `work/166-ios-progress-tests.md`, `work/168-ios-progress-build.md`. Don't read `work/168-handback.md` before your first pass.

## Do
Follow the operating agreement's Review section. `mise run ios-check` must pass. Work in a detached worktree (`git -C ~/projects/worktrees/ripit-fitness/worktree6 checkout --detach 60623a5c`) so others' edits don't mix in.
Hands-on in your simulator: import the fixture, log a few workouts with kg and lbs, beat a record, and pin and unpin lifts across a relaunch. Scroll every block (pinned lifts, lifts, Last 8 weeks, trend note), open lift pages and switch chart ranges. Check light, dark and AX sizes.
Compare with the web `/progress` and `/progress/lift/[id]` at phone width (local app with seeded data; layout and wording, not identical numbers). Check that the goldens script really calls the web's functions, not a copy.

## Hand back
A review packet with first line `Report: ...` and a verdict, sent to wX:p1. Report only. Don't run rm.

## Log
- 2026-11-07 CST: created.
- 2026-11-07 13:01 MST: dispatched to ios-review (running)
- 2026-11-07 CST: verdict: meets all 6 scenarios, numbers match the goldens hands-on; should-fixes go to 172. Lead: Top set/Volume and programWeek deferred.
