---
id: 164
state: running
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
waiting_on:
---
# iOS slice 2: import fixes after review 162

Branch `feature/ios-skeleton` in the lead worktree. It now includes slice 3 (merged at 590d0570), and the full `mise run ios-check` is green with 112 tests. Size: small; write your own tests in new files.

## Read
`work/162-handback.md` (findings with file:line, and `later.json` as the reviewer described it).

## Do (lead answers to review 162)
1. **A later export brings the phone up to date.** For rows that already exist and came from a file, update their scalar columns from the file (status, completedAt, names, isArchived/isActive under the active-program rule, prescribed fields). Rows created on the phone are never touched. Track where each row came from (e.g. an `origin` column via a new migration; never edit old migrations). Update the README.
2. **Imported drafts:** a web draft is resumable only when the phone has no draft and the draft started within the last 24 hours. Otherwise store it as abandoned. Also, `inProgressWorkout()` must never offer an archived draft (risk from 161: restart archives an open draft).
3. **The summary counts what changed:** "Added 12 workouts, 140 sets; updated 2; 3 already up to date".
4. **A program session's detail shows only exercises with logged sets.**
Findings 4 and 6 are left as they are.

## Done when
`mise run ios-check` passes with 112 locked tests unchanged, plus your new tests: a later file updates a status and a name, a phone-created row is untouched, a stale draft becomes abandoned, an archived draft is not offered, and the summary counts are right.

## Don't touch
Locked tests, `work/`, `STATE.md`, `initiatives/`. Commit your paths only.

## Hand back
The `handoff-implementer` packet, first line `Report: ...`, sent to wX:p1. Don't run rm.

## Log
- 2026-11-07 CST: created after review 162 (lead answers: Q1 a, Q2 a with 24 h, Q3 a, plus finding 5 and 161's archived-draft risk).
- 2026-11-07 12:35 MST: dispatched to ios-impl (running)
