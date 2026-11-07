---
id: 170
state: ready
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
---
# iOS slice 3: fixes after review 165

Branch `feature/ios-skeleton`, lead worktree (slices 1-4, 144 tests green). Size: small; write your own tests in new files.

## Read
`work/165-handback.md`: Defects S1-S3 and the Minor list, with file:line references (the line numbers are from worktree5's 590d0570; the code has moved a little since).

## Lead answers
- Q1: editing stays per week for this slice.
- Q2: the phone keeps one workout in progress (deliberate; simpler than the web's draft per workout). Make that clear in the UI.

## Do
1. S1: the builder and editor can't be swiped away with unsaved content (`.interactiveDismissDisabled` plus a discard confirmation on Cancel).
2. S2: Training shows a resume card for any workout in progress, program or ad-hoc. Starting a different workout while one is open asks "Resume <name>" or "Discard it and start <new>". It never opens the other one silently, and no button looks enabled while it does nothing. After archiving a program with a draft open, the draft can still be resumed or discarded from Training.
3. S3: the exercise editor keeps RPE, RIR and warm-up with their set when a set is removed (keyed by set id, not by position).
4. Minor: history rows and details read "<Program> · W<n> · <Day name>", with no "Day 1 · Day 1" default; `addProgramWeek` uses UUIDs like everything else; builder text fields select all on focus.
5. Tests for `ProgramsEditing.swift`: add week (copy), add workout, add exercise, remove (refused with logged sets), regroup, rename.

## Done when
`mise run ios-check` passes, with locked tests unchanged. Simulator screenshots for S1, S2 and the history rows.

## Hand back
The `handoff-implementer` packet, first line `Report: ...`, sent to wX:p1. Commit your paths only. Don't run rm.

## Log
- 2026-11-07 CST: created after review 165.
