---
id: 102
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L3: API hardening from review 101

Checkout: worktree2, branch `feature/logger-plan`. Read `work/101-handback.md`. **Don't start a dev server or run a build**: Dustin's phone preview serves this worktree's `.next`. Vitest is fine.

## Do
1. GET `exercises?completionId=` and `exercises/[order]`: the completion must belong to this workout and this user (`workoutCompletion: { id, workoutId, userId }`).
2. Stable order: `orderBy: [{ order: 'asc' }, { id: 'asc' }]` in GET, `[order]` and reorder's response; and add-during-logging counts existing one-offs when setting `order`.
3. Reorder: take the `completionId` (the sheet knows it) and accept one-offs only from that session; reorder's response includes them.
4. Row sub-line: "0 of 1 set" (singular when planned is 1).
5. Add the test gaps 101 lists to `__tests__/api/workout-exercises-one-offs.test.ts`.

## Done when
Suite, tsc, eslint/biome on touched files pass.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 101; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; lead re-ran API tests. Waiting on Dustin's preview verdict for L3.
- 2026-11-01 20:45 CDT: accepted (Dustin, L3 preview: "Looks great").
