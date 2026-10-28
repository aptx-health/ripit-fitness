---
id: 022
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-27 Dustin
updated: 2026-10-27
---
# Review: insight rule changes and the training data export

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`. The changes since your 019 review are in the working tree. The 019 state is in `work/019-handback.md`, so you can compare against it.

## Goal
An independent review of 020 and 021 against `features/agent-tools/training-export.feature`, the 2 new scenarios in `training-insights.feature`, and the spec sections "Training insights" (shared rules) and "Training data export". Weight these: auth and user scoping on the new HTTP route, CSV escaping and formula injection, paging correctness (no gaps or repeats), range bounds, the memory and size of a 3-year CSV, and rate limiting.

## Done when
A verdict (ship / ship with fixes / don't ship), with defects ranked, each with `file:line` and a concrete failing case.

## Don't touch
Any file.

## Hand back
The review packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-27: created; waits on 021.
- 2026-10-27: dispatched to reviewer (wF:p3) without the 021 handback.
- 2026-10-27: handback (ship, 4 low defects) saved. Lead's call: fix 2 (wider formula guard) and 4 (empty until) now in 023; record 1 (streaming) and 3 (separate export rate limit) in the roadmap.
- 2026-10-27: accepted by Dustin ("Ok I accept").
