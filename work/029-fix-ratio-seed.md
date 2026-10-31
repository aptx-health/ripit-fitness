---
id: 029
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-30 Dustin (review Q1 = seed from Settings)
updated: 2026-10-30
---
# Fix: seed ratioTargets when anchor approve creates the profile (green)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`.

## Goal
Make the 028 tests pass. In `swapAnchors` (`lib/proposals/balance.ts` ~117), seed a created profile's `ratioTargets` like `getOrCreateUserTrainingProfile` does, reading settings inside the same transaction. Defect 1 in `work/027-handback.md`.

## Done when
`npm run test:run -- agent-tools` passes; tsc and biome clean.

## Don't touch
Tests, `features/**`, the spec, the schema. Revert behaviour stays as is (the created row stays).

## Hand back
The handoff-implementer packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-30 21:00 MDT: created; waits on 028.
- 2026-10-30 21:20 MDT: 028 in review; dispatched to implementer (wF:p2). Reference from 028: the tests compare with the real getOrCreateUserTrainingProfile.
- 2026-10-30 21:40 MDT: handback saved. Lead re-ran agent-tools 564/564, tsc clean. State review. No second reviewer pass: one-branch fix checked against the real getOrCreate as the test oracle.
- 2026-10-30 22:30 MDT: accepted by Dustin after the phone review (buttons fixed).
