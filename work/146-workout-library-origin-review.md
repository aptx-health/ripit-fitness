---
id: 146
state: accepted
waiting_on:
executor: coach-review
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin ("yes" to start slice 3)
updated: 2026-11-07
---
# Workout library slice 3: review

Checkout: worktree2 (~/projects/worktrees/ripit-fitness/worktree2), branch `feature/workout-library-origin`, uncommitted; stacked on `feature/workout-library-order` (#1040), so diff against that branch (`git diff origin/feature/workout-library-order` plus untracked files). Read-only except your report and screenshots.

## First pass: before reading any handback
Read only `features/workout-library/origin-new-archive.feature`, `initiatives/workout-library/docs/141-discovery.md` and the code. Focus on:
- Migration: columns + backfill SQL match the schema; applies cleanly to a scratch DB built from dev's schema with existing saved workouts and applied/rejected proposals (only applied creates become agent); `migrate diff` empty.
- Archive / Undo / Restore / Dismiss rules in `app/api/workouts/saved/[id]/route.ts`: scoping, validation (the client-carried `undo` payload can't set arbitrary pinnedAt/dismissedAt on another row or to odd values), rate limit, logging.
- Every SavedWorkout reader that should skip archived (grep `savedWorkout.find`), MCP list, the proposals revert path.
- UI at 390px in light, dark, E-INK: New group, row menu, Undo toast, Show archived; 48px targets; matches slice 1 styling. Data: bodybuilder@synthetic.test in the wt2 DB already has preview rows.
- `perf-check` skill: perf:scan and perf:tap on a production build for Library → Workouts and the archive tap.

## Second pass
Then read `work/144-handback.md` and `work/145-handback.md` and check their claims and "Not verified".

## Hand back
Findings ranked by severity with file:line and a failure scenario; verdict (ship / fix first); screenshots in `initiatives/workout-library/docs/assets/146/`. First line `Report: complete | needs decision | further handoff`. Don't edit code, `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; dispatched to coach-review (wE:pB), working in worktree2.
- 2026-11-07 CST: back: fix first (one line); fixes 147.
- 2026-11-07 CST: Dustin on the phone preview: "Works fine approve". Accepted.
