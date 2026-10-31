---
id: 032
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (pre-approved via /goal)
updated: 2026-10-31
---
# Build saved workout proposals (green)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`.

## Goal
Make the 031 tests pass, building spec "Saved workouts":
- read tools `list_saved_workouts`, `get_saved_workout`, `get_active_draft`, and propose tools `propose_workout_create`, `propose_workout_update` in `lib/mcp/tools.ts`;
- `annotations` on every tool in `tools/list` (reads `readOnlyHint: true`);
- kinds `saved_workout.create` and `saved_workout.update` in `lib/proposals/service.ts` (approve, conflict, revert), with logic in `lib/proposals/saved-workout.ts`. Reuse the prescribed-set schema from `lib/proposals/program.ts` where it fits (export it);
- the admin proposal detail page: create shows the exercise list, update shows a FieldDiff per touched field (spec "Admin detail page");
- `SavedWorkoutDetailDialog` shows each exercise's sets in the same format.

## Details the tests fix
See `work/031-handback.md` (Assumptions). `field` is the full argument path (spec), so don't reuse the leaf-only `issueField`. The create summary uses `(1 exercise)` for one. Check that the HTTP `tools/list` passes `annotations` through, not only `listTools()`.

## Done when
- `npm run test:run` passes in full. `tsc` and biome are clean. `npm run build` passes.
- No read tool writes.
- UI: drive the real flow and take screenshots at 390px of the admin create and update proposal pages and the saved-workout detail dialog (AGENTS.md "UI changes"; `webapp-testing` skill). Blank `DISCORD_PROPOSALS_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` and `BARK_URL` when seeding. Use the worktree2 dev DB (`fitcsv-postgres-wt2`, port 5435); stop it after. Save screenshots under `initiatives/agent-tools/docs/assets/032/`.

## Don't touch
Test files, `features/**`, the spec, the schema. The ad-hoc logger (showing planned sets there is a separate roadmap item). Never write a `WorkoutCompletion`.

## Hand back
The handoff-implementer packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-31 00:20 MDT: created; waits on 031.
- 2026-10-31 00:55 MDT: 031 in review; dispatched to implementer (wF:p2).
- 2026-10-31 01:30 MDT: packet saved (`032-handback.md`): 200/200, full suite green, build passes, screenshots taken. Lead: RPE becomes integer (option a); tests change first (031 retry), then the implementer makes the schema int again. Q2-Q4 accepted as is.
- 2026-10-31 01:45 MDT: follow-up dispatched: make rpe an integer (2 red tests).
- 2026-10-31 01:55 MDT: follow-up done. Lead re-ran agent-tools 766/766, tsc clean. State review. Handback held outside work/ until 033's first pass.
- 2026-10-31 02:15 MDT: 033 verdict ship. Accepted by the lead under Dustin's /goal pre-approval; Dustin can still review the PR.
