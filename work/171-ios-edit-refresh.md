---
id: 171
state: ready
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
---
# iOS: Edit program screen goes stale after a save

Branch `feature/ios-skeleton`, lead worktree. Size: tiny.

## Read
The end of `work/165-handback.md` ("New should-fix"), and `ios/App/ProgramEditView.swift:17`.

## Do
After saving an exercise, the Edit program screen re-reads the program from the database, and the next sheet opens with fresh data (hold an id, not a stale `ProgramExercise`). A second save must never bring back removed sets. Add a core test if part of it lives in RipitCore. Otherwise, take a before/after screenshot of the reviewer's flow: remove the warm-up, Save, reopen, Save again.

## Done when
`mise run ios-check` passes, and the flow is shown fixed by screenshot.

## Hand back
A short packet, first line `Report: ...`, sent to wX:p1. Commit your paths only. Don't run rm.

## Log
- 2026-11-07 CST: created from the 165 re-check.
