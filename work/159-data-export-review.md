---
id: 159
state: running
executor: web-review
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
waiting_on:
---
# Review: web "Download my data" export

## Goal
An independent verdict on branch `feature/data-export` in `~/projects/worktrees/ripit-fitness/worktree3` (diff vs `origin/dev`): does it meet `features/data-export.feature`, and is it sound and safe (user scoping, auth, rate limit, no secrets or other users' rows, query count)?

## Read first
- The work item `work/156-data-export-web.md` in the lead worktree (`/Users/dustin/.herdr/worktrees/ripit-fitness/worktree-brave-field-c150`). Don't read `work/156-handback.md` before your first pass.
- `AGENTS.md` (conventions, perf-check), `docs/RIPIT_EXPORT_FORMAT.md`.

## Do
Follow the Review section of `~/.claude/skills/project-structure-v3/references/operating-agreement.md`. Run the tests (export Colima vars from `docs/TESTING.md`), and drive the Settings row at phone width against the local app (`DOPPLER_PROJECT=fitcsv DOPPLER_CONFIG=dev_personal ./scripts/dev.sh start -l postgres,app`, dmays@test.com / password). Check that the downloaded file matches the format doc, and that nothing private beyond the user's own training data leaks (e.g. tokens, auth rows, other users' data). Pre-existing lint errors on dev are known; ignore them.

## Hand back
A review packet with first line `Report: ...` and a clear verdict, sent to wX:p1. Report only; no code edits. Don't run rm: list cleanup.

## Log
- 2026-11-07 CST: created (ready).
- 2026-11-07 12:17 MST: dispatched to web-review (running)
