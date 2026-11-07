---
id: 161
state: running
executor: programs-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal slices 1-3; lead runs the loops)
updated: 2026-11-07
waiting_on:
---
# iOS slice 3: programs

Checkout: `~/projects/worktrees/ripit-fitness/worktree5`, branch `feature/ios-programs`. It was cut from `feature/ios-skeleton`; the lead merges it back. Item 160 (import) is being built in parallel on `feature/ios-skeleton` in the lead worktree.

## Goal
Dustin can follow a strength program on the phone: build or edit it, see Up Next, log against the plan, finish weeks, and restart it.

## Read first
- `features/ios-app/programs.feature`, `work/157-handback.md` (including the amendment at the top: the rules, and that slice 1's logSet/workout/history must handle program exercises).
- `ios/RipitCore/Sources/RipitCore/Programs.swift` (the contract), the slice 1 app in `ios/App/`, and the web screens for reference: `/training` (Up Next), `/programs/[id]`, `/programs/[id]/edit`.

## Do
- Implement RipitCore so the locked Programs tests pass, with slice 1 still green. Import tests (another agent's target) may stay red here.
- App: a Training home with Up Next and the current week, a program list (activate, archive), program detail by week, a simple program builder/editor (weeks, workouts, exercises from the catalog, prescribed sets with free-text weight, superset grouping), and starting a program workout prefilled. Keep slice 1's ad-hoc flow working. Match the ripit theme and folder style.
- Keep RipitCore changes in new files where you can (`Programs*.swift`), to ease the merge with 160's `Import.swift`.

## Done when
- `swift test --package-path ios/RipitCore` passes everything except the Import suites. The simulator build passes.
- Simulator screenshots of each new screen, plus one full flow: start Up Next, log, finish, and Up Next advances.

## Don't touch
- Locked tests, the web app, `work/`, `STATE.md`, `initiatives/` (they live in the lead worktree anyway).

## Hand back
The `handoff-implementer` packet, first line `Report: ...`, sent to wX:p1. Use your own simulator. Don't run rm: list cleanup.

## Log
- 2026-11-07 CST: created and dispatched.
- 2026-11-07 12:22 MST: dispatched to programs-impl (running)
- 2026-11-07 CST: back 590d0570; lead fast-forwarded feature/ios-skeleton to it; full ios-check green, 112 tests. To review (165).
