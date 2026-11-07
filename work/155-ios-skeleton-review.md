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

## Hand back
A review packet with first line `Report: complete | needs decision | further handoff` and a clear verdict.

## Log
- 2026-11-07 CST: created (waiting on 154).
- 2026-11-07 CST: Dustin asked that the reviewer test the app hands-on after the build; section added.
