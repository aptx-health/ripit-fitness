---
id: 024
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-30 Dustin (slice 4 plan form)
updated: 2026-10-30
---
# Discovery: anchors and FAU targets for agents (read + propose)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/agent-balance` (fresh from dev). Read-only: change no files.

## Goal
Find out what the lead needs to spec slice 4. Agents should be able to:
- **Read** Dustin's anchors (anchor pattern → exercises; `targetMovements`, `lib/exercises/anchor-patterns`, `lib/recommendations/anchor-staleness.ts`).
- **Read** his FAU (functional anatomical unit) targets and balance settings (`UserMuscleBalanceSettings`).
- **Read** per-FAU volume against target over a window, as **raw numbers only**, no labels like neglected/over (`lib/fau-volume.ts`, `lib/muscle-balance.ts`, `lib/aggregates`, `lib/recommendations/fau-*`).
- **Propose** changes to anchors.
- **Propose** changes to FAU **targets only**. Calc settings (lookbackDays, includeSecondary, secondaryWeight, excludeWarmups) stay out of scope.

Proposals use the existing proposal flow (`lib/proposals/service.ts`): approve in the Workbench, with revert.

## Do
1. Map the data model and the existing math, with `file:line`:
   - where anchors and targets live, and their JSON shapes and validation;
   - the defaults when no row exists;
   - how Settings writes them today (API routes and validators to reuse);
   - how per-FAU volume is computed (primary vs secondary weighting, which sets count, the window);
   - which of these an MCP tool can call as is.
2. List the valid FAU keys and anchor patterns, and where they're defined.
3. Propose the tool contracts, with names, args and return shapes:
   - the read tools;
   - `propose_anchor_update` and `propose_target_update`: payload, `before` snapshot, conflict rule (like exercise updates' `updatedAt` check), approve and revert behaviour;
   - how the admin detail page should show the diff.
   Keep reads to one query each where you can.
4. Check what the local dev DB has, read-only. Start `fitcsv-postgres-wt1` if you need it and stop it after.
5. At most 3 questions only Dustin can answer, each with a recommendation.

## Done when
The packet covers 1–5, labels each claim FACT, INFERENCE or NOT VERIFIED, and cites `file:line`.

## Don't touch
Any file. No staging or prod.

## Hand back
The discovery skill's scoping note. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-30: created after the slice 4 plan form; dispatched to implementer (wF:p2).
- 2026-10-30: handback (needs decision) saved. Lead checked: worktree2 unchanged. 3 questions go to Dustin together with the slice 4 scenarios.
- 2026-10-30: Dustin answered: Settings targets for agents, and the drift fix comes next as its own item; get_fau_volume defaults to lookbackDays, max 365; anchors aren't checked against movementPattern. Scenarios (15) accepted. Discovery accepted by the lead (item allows it).
- 2026-10-30 22:30 MDT: accepted by Dustin after the phone review (buttons fixed).
