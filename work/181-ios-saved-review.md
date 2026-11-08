---
id: 181
state: waiting
waiting_on: 180
executor: parity-disco
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 6 as written, autonomous, no rating)
updated: 2026-11-07
---
# iOS slice 6: finish summary and saved workouts, review

## Goal
An independent verdict: does slice 6 meet `features/ios-app/saved-workouts.feature`, does it match the web, and is the code sound?

## Read first
- The spec, `work/179-handback.md` (hands-on list), and the diff of `ios/` since the slice 5 acceptance commit `a0e345c9`. Don't read `work/180-handback.md` before your first pass.

## Do
- Same method as 176: run `ios-check`, do an unaided first pass, ask up to 3 questions, then give a revised verdict.
- Walk every scenario by real taps in your simulator, including imported saved workouts from the v1 fixture.
- Check the largest text size, and dark mode.
- Compare with the local web at phone width: the rollup after Finish, Library › Workouts, and Training's Pinned/Recent. Do the same flows on both and note any differences.
- Screenshots go in `initiatives/ios-app/handoff/slice6-assets/`.

## Don't touch
- No code edits. `work/`, `STATE.md`, `status.md`, the roadmap. Staging is read only. Don't `rm`.

## Hand back
A review packet with first line `Report: …` and a clear verdict.

## Log
- 2026-11-07: created (waiting on 180).
