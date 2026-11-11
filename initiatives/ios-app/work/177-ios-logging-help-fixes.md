---
id: 177
state: accepted
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
- 2026-11-07: handed back complete; lead re-ran ios-check (exit 0, 181 pass); committed. First packet kept as `177-handback-1.md`.

## Follow-up (2026-11-07, lead)
7. **Logged set rows at the largest text size:** `SetRow` (logger) and `HistorySetRow` (history) wrap "135 lbs" one digit per line. Stack weight × reps above the tags at accessibility sizes, so the numbers never break. Screenshot both at default and at the largest size. Then hand back again to `work/177-handback.md` and ping the lead.
- 2026-11-07: follow-up 7 handed back complete (`177-handback-2.md`); lead re-ran ios-check (exit 0, 181); committed.

## Follow-up 2 (2026-11-07, lead)
8. **Largest text size sweep, once:** fix `LastTimeLine` (stack label and date; "Use" under the summary). Then walk **every** screen the logger reaches (logger rows, Last time, effort menu, Warm-up toggle, Info/Notes/History sheet, Finish alert, finished-workout detail) at the largest size and fix anything that breaks mid-word, so the re-check doesn't find another. Screenshot each. Hand back to `work/177-handback.md` and ping the lead.
- 2026-11-07: follow-up 2 handed back complete (`177-handback-3.md`; agent slipped one `rm` of its own scratch shots). Lead re-ran ios-check (exit 0, 181); committed. Re-check in 178.
- 2026-11-07: accepted after re-check 178.
