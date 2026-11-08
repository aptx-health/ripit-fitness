---
id: 177
state: running
waiting_on:
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 5 autonomy covers review fixes)
updated: 2026-11-07
---
# iOS slice 5: fixes after review 176

## Goal
Close review 176's must-fix items and the small ones the lead picked, so slice 5 can be accepted.

## Read first
- `work/176-handback.md`: the review, with file and line pointers.

## Do
1. **Largest text size:** the logger's exercise header (name, rest timer chip, ⓘ, ···) and History's `SessionCard` header must read cleanly at the largest accessibility size. Stack them at accessibility sizes, as `entryRow` already does. Screenshot the result at default and at the largest size.
2. **Planned effort survives a scale switch:** switching RPE↔RIR re-applies the planned value for the new scale (if any) instead of clearing it.
3. **Long-press "Mark as warm-up":** remove the `.contextMenu`. Edit + Warm-up covers it (lead's call).
4. **Logging a warm-up set saves no effort,** and the effort picked for the next working set is kept.
5. **VoiceOver:** the set row's label includes "warm-up" and the effort (e.g. "RPE 9").
6. **One test for `ExerciseInfo.swift`** pinning `muscleName` against the web's `FAU_DISPLAY_NAMES`, plus the empty-JSON fallback.

## Done when
- `mise run ios-check` exits 0. 174's locked tests are unchanged.
- Each fix is checked in your simulator, with screenshots.

## Not in this item (backlog)
- Editing effort on a logged set (with Settings, slice 7). Relative date and per-set "last:" hints. "First time logging this" text.

## Don't touch
- `work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The implementer packet.

## Log
- 2026-11-07: created from review 176 (lead answered Q1 remove, Q2 yes, Q3 later).
- 2026-11-07 19:53 MST: dispatched to ios-impl (running)
