---
id: 026
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-30 Dustin
updated: 2026-10-30
---
# Build anchors and balance targets (green)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`.

## Goal
Make the 025 tests pass, building spec "Anchors and balance targets":
- the 3 read tools and 2 proposal tools;
- kinds `anchors.update` and `balance_targets.update` in `lib/proposals/service.ts` (approve, conflict, revert);
- pure logic in `lib/insights/balance.ts`;
- the admin proposal detail page shows the FieldDiff rows, with anchor ids resolved to exercise names in one query.

Reuse the validators and normalizers named in `work/024-handback.md`. The write helpers may need to accept a transaction client.

## Contract details the tests fix
The spec is silent on these; the tests encode them (see `work/025-handback.md`, Assumptions 1-7): `before` and `inverse` are keyed by touched key only; `get_anchors` keeps stored id order; approving anchors with no profile row creates one (`ratioTargets: {}`); calc keys in a target change are refused, named by that key; `lastLoggedDaysAgo` is whole 24h periods (floor); revert leaves a settings row created by approve in place.

The admin detail page has no tests. The reviewer and Dustin's phone preview check it.

## Done when
- `npm run test:run` passes in full. `tsc` and biome are clean.
- No read tool writes.
- The admin page builds (`npm run build`).

## Don't touch
Test files, `features/**`, the spec, the schema. `UserTrainingProfile.ratioTargets` is a separate item.

## Hand back
The handoff-implementer packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-30: created; waits on 025.
- 2026-10-30 20:05 MDT: 025 in review; dispatched to implementer (wF:p2).
- 2026-10-30 20:50 MDT: packet received (held in lead scratchpad until 027's first pass, then saved as `026-handback.md`). Lead re-ran: agent-tools 7 files 558/558, tsc clean, steps file still read-only. Implementer reports full suite green when load-failed files are re-run alone, and build exit 0. State review.
- 2026-10-30 22:30 MDT: accepted by Dustin after the phone review (buttons fixed).
