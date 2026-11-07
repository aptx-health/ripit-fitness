---
id: 168
state: review
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal stretch: slice 4)
updated: 2026-11-07
waiting_on:
---
# iOS slice 4 (stretch): Progress

Branch `feature/ios-skeleton`, lead worktree.

## Goal
A Progress tab on the phone with the same numbers as the web: this week's report, records, trend note, pinned lifts, and a per-lift page with a chart.

## Read first
- `features/ios-app/progress.feature`, `work/166-handback.md` (the API contract, goldens, and calls: unit and target are parameters, no default anchor pins).
- The web screens for look and feel: `app/(app)/progress/`, `/progress/lift/[id]`.

## Do
- Implement the Progress API so the locked tests pass. Add a new migration for pinned lifts (`v5-…` or whatever comes next) and import `pinnedExercises` from the file.
- App: a Progress tab (week report, records, trend, pinned lifts with pin/unpin), and a per-lift page with Swift Charts (3M/6M/1Y/All) and rep records. Add a small display-unit setting (lbs/kg), defaulting to lbs, and a weekly workout target (default 3) for the report.
- Folder style and ripit theme, as before.

## Done when
`mise run ios-check` passes with every locked test unchanged. Simulator screenshots of Progress and a lift page, using imported fixture data plus some logged sets.

## Hand back
The `handoff-implementer` packet, first line `Report: ...`, sent to wX:p1. Commit your paths only. Don't run rm.

## Log
- 2026-11-07 CST: created and dispatched.
- 2026-11-07 12:55 MST: dispatched to ios-impl (running)
- 2026-11-07 CST: back 60623a5c; lead re-ran: 144 pass + sim build. To review (169).
