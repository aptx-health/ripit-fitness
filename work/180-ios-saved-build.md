---
id: 180
state: waiting
waiting_on: 179
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 6 as written, autonomous, no rating)
updated: 2026-11-07
---
# iOS slice 6: finish summary and saved workouts, build

## Goal
Make 179's tests pass and build the screens, so every scenario in `features/ios-app/saved-workouts.feature` works on the phone.

## Read first
- `features/ios-app/saved-workouts.feature`, `work/179-handback.md` (contract and hands-on list).
- Parity screenshots `initiatives/ios-app/handoff/parity-assets/web-saved*.png`, `web-library.png`, `web-training.png`.
- Web: the oracle files listed in the spec header.

## Do
- Implement the `RipitCore` stubs, then the UI in `ios/App/`:
  - the summary sheet after Finish (it replaces going straight back to Training), with Save for ad-hoc workouts
  - a **Library** tab with Workouts (groups, folds, row actions, detail and Start)
  - Pinned and Recent with Repeat on Training
- Follow the slice 5 lesson: check every new screen at the largest text size before handing back.
- Run it in your own simulator and screenshot each new screen.

## Done when
- `mise run ios-check` exits 0, with all of 179's tests passing and none removed or weakened.
- Every scenario works when you try it by hand in your simulator.

## Decide alone
- Layout details, and where Library sits in the tab bar (Training · Library · History · Progress is fine).

## Escalate to Dustin when
- A scenario can't be met as written.

## Don't touch
- 179's tests (if one is wrong, say so in the packet). `work/`, `STATE.md`, `status.md`, the roadmap.
- Don't `rm`; list temp files under Cleanup for Dustin.

## Hand back
The implementer packet, with screenshots.

## Log
- 2026-11-07: created (waiting on 179).
