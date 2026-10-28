---
id: 016
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-27 Dustin (slice 3 plan form)
updated: 2026-10-27
---
# Discovery: training insight signals (stall + fatigue)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2` (branch `feature/agent-insights`). Work there, not in worktree1. Read-only: change no files.

## Goal
Find out what the lead needs to write the spec for two new read-only MCP tools that return **signals, not advice** (numbers and flags; the agent writes the coaching words):
- **Stall:** per exercise, is the best-set e1RM (estimated one-rep max) flat or falling over the last N sessions? Example the agent should be able to say: "You seem to have stalled on preacher curls."
- **Fatigue:** effort distribution per week (RPE/RIR on working sets, session RPE) and its trend. Example: "You've done RPE 10 on most exercises this week. Are you considering a deload?"

## Do
1. Map existing math we should reuse rather than duplicate. Start with `lib/stats/exercise-history-derivation.ts` (`e1rmTrend`, `bestSetE1RM`), `lib/stats/exercise-performance.ts`, `lib/aggregates/` (`GoalTrend 'stalled'`, `computeAggregates`), and `lib/recommendations/`. Say what each computes, its inputs, and whether an MCP tool can call it as is.
2. Check the data that's actually there: how often `rpe`, `rir` and `sessionRpe` are filled, warmup flags, kg vs lbs, ad-hoc vs program workouts, and how exercises map to a definition across sessions (by `exerciseDefinitionId`?). Use the local dev DB if it has data. If not, say so; don't touch staging or prod.
3. Propose tool contracts for both: names, args (with defaults such as window, minimum sessions), and return shapes. Give thresholds with your reasons, for example what counts as "flat", and how many sessions are needed before a verdict, so there's no false alarm on thin data.
4. List open questions only Dustin can answer (at most 3), each with your recommendation.

## Done when
The packet answers 1–4, cites `file:line` for each reuse claim, and labels each claim FACT, INFERENCE or NOT VERIFIED.

## Don't touch
Any file. No migrations, no seeding, and no calls to staging or prod.

## Hand back
The discovery skill's scoping note as the packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-27: created after the slice 3 plan form; dispatched to implementer (wF:p2) with the V3 brief.
- 2026-10-27: handback (complete) saved as work/016-handback.md. Lead checked: worktree2 unchanged; the local wt1 Postgres was started for read-only queries and stopped again. Contracts adopted into the spec; the 3 questions go to Dustin with the scenarios.
- 2026-10-27: accepted by Dustin ("Accepted"; answers 1A, 2B, 3A, carried into item 020).
