---
id: 106
state: accepted
waiting_on:
executor: analytics-disco (new, wF)
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (purpose: progressing + consistency/effort; discovery + mockups first; remove Learning)
updated: 2026-11-01
---
# Analytics tab: discovery and mockups

Checkout: worktree1 (`~/projects/worktrees/ripit-fitness/worktree1`), detached at `origin/dev`. Read-only on code. Write only under `initiatives/analytics/docs/discovery/` in worktree1 (the lead moves it).

## Goal
Dustin wants an analytics tab to replace Learning. It should answer two questions:
1. **Am I progressing?** Strength trends per exercise (estimated 1RM, best sets), PRs, and volume over time.
2. **Consistency and effort.** Workouts per week, streaks, time trained, effort (RPE/RIR) trends, and deload signals.
Learning's content goes away.

## Do
1. **Inventory the data we already have**, with file:line for each:
   - `lib/aggregates/*` and `UserTrainingAggregates`
   - `lib/muscle-balance.ts`
   - `lib/insights/*`
   - the MCP read tools in `lib/mcp/tools.ts` (stall, fatigue, e1RM, export)
   - `lib/queries/exercise-history.ts`
   - workout completions, logged sets and cardio
   For each question above, say what can be computed now, what's missing, and how much each costs to compute (per request, or precomputed).
2. **Look at the current Learning tab** (`app/(app)/learn`, plus nav entries and links into it). List what removing it touches.
3. **Look at the app's style:** Training and Library use paper tabs and folder boxes (see `initiatives/ui-audit/spec.md`). Charts should fit that style in light and dark themes. Check what charting library, if any, is already installed.
4. **Make 2–3 page mockups** as static HTML in `initiatives/analytics/docs/discovery/ideas/`, with 390px screenshots of each (Chrome first, Playwright fallback), in the app's look. Each mockup should take a different stance, for example:
   - an overview dashboard;
   - per-exercise drill-down first;
   - a weekly report card.
   Recommend one.
5. Write `initiatives/analytics/docs/discovery/README.md`:
   - the inventory;
   - the gaps;
   - the mockups and your recommendation;
   - a rough slice plan (what ships first);
   - open questions for Dustin (at most 3).

## Don't
Change code. Start a dev server against shared data without saying so. Write to staging or prod.

## Hand back
Use the `discovery` skill. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 23:55 CDT: created; confirmed by Dustin; dispatched to new agent analytics-disco.
- 2026-11-02 00:20 CDT: back (needs decision); hub page analytics-106 published; 3 questions to Dustin.
- 2026-11-02 00:35 CDT: Dustin: C; weekly target setting for streaks; unlink Learn now. Accepted.
