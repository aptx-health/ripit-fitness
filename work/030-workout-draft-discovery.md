---
id: 030
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-30 Dustin (pre-approved via /goal: no work-item sign-off needed for this slice)
updated: 2026-10-30
---
# Discovery: workout draft proposals for agents

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/agent-workout-draft` (fresh from dev a9d30fef). Read-only: change no files.

## Goal
Hermes (Dustin's coach agent) reports: "We cannot yet save a selected set of exercises into a current/draft blank workout. A create/update workout draft proposal would be the remaining app-side tool for agent-driven in-app composition." Find what the lead needs to spec:
- **Propose** a workout draft: an agent picks exercises (with planned sets, reps, and optionally weight/RIR/RPE) and proposes them; on approve, Dustin sees that workout in the app, ready to start or log. Create, and update of a draft the agent proposed earlier (or Dustin's current draft), if the app has such a thing.
- **Read** whatever the agent needs to target it (the current draft or blank workout, if any).
- Also, as a ride-along: MCP `readOnlyHint: true` annotations on every read tool in `lib/mcp/tools.ts`.

It uses the existing proposal flow (`lib/proposals/service.ts`): approve and reject in the Workbench, and revert where it makes sense. Follow how earlier kinds were built (`exercise_definition.*`, `program.create`, `anchors.update`, `balance_targets.update`).

## Do
1. Map how a blank / ad-hoc / draft workout works today, with `file:line`:
   - the models (`Workout`, `WorkoutCompletion`, `SavedWorkout`, exercises and prescribed sets) and which status means "draft" or "in progress";
   - how the app creates a blank workout and adds exercises (API routes, lib helpers, validators) and what the UI shows (the grayed-out workout selector in the action button, if related);
   - whether a draft must belong to a program or week, and what happens when a program is active vs not;
   - which helpers an approve could call inside a transaction (do they take a tx client?).
2. Propose the tool contracts: names, args, return shapes; the proposal kind(s) and payload; `before` snapshot and conflict rule for update; approve, reject and revert behaviour (what revert deletes or restores, and when it must refuse, e.g. once the workout is started or logged); how the admin detail page should show it.
3. List the read tools and confirm which should get `readOnlyHint: true` (and whether the MCP SDK version in use supports `annotations`).
4. Check the local dev DB read-only if useful (`fitcsv-postgres-wt2`, port 5435; start it and stop it after).
5. Dustin pre-approved this slice and doesn't want sign-off questions. Instead of questions, give at most 3 open choices, each with your recommendation and why; the lead will decide.

## Done when
The packet covers 1–5, labels each claim FACT, INFERENCE or NOT VERIFIED, and cites `file:line`.

## Don't touch
Any file. No staging or prod.

## Hand back
The discovery skill's scoping note. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-30 23:59 MDT: created under Dustin's /goal (no sign-off); dispatched to implementer (wF:p2).
- 2026-10-31 00:10 MDT: handback saved (needs decision). Lead decided (Dustin pre-approved, /goal):
  1. Land as SavedWorkout (rec).
  2. UI: the saved-workout detail dialog shows the planned sets. No weight field (SavedWorkout drops weight by design; agents put load guidance in notes). The ad-hoc logger showing planned sets goes to the roadmap: it's core logging UX and needs Dustin's review.
  3. Live in-progress draft: read only (`get_active_draft`), never written.
  Discovery accepted by the lead.
