---
id: 101
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# Focused review: the API changes in 100

Checkout: worktree2, branch `feature/logger-plan` (uncommitted). Code review only: **do not start a dev server or run a build** (Dustin's phone preview is serving this worktree's `.next`). Running vitest is fine.

## Read
`work/099-handback.md` finding 1–2, the diff of `app/api/workouts/[workoutId]/exercises/route.ts` (GET `?completionId=`) and `app/api/workouts/[workoutId]/exercises/reorder/route.ts`, and the new tests `__tests__/api/workout-exercises-one-offs.test.ts`. Then `work/100-handback.md`.

## Check
- Authorization: a user can never read or reorder another user's exercises or completions, or exercises from another workout; `completionId` must belong to the user and to this workout. Look for any way to pass someone else's id.
- Input validation, error codes, logging and rate limiting in line with the neighbouring routes.
- The GET without `completionId` behaves exactly as before.
- Tests cover the denial cases; suggest any missing one.
- Run the new API tests and the 097/100 logger tests.

## Hand back
Verdict, findings, Not verified. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to reviewer (wF:p3).
- 2026-11-01 MDT: approve; 1–3 + test gaps + '0 of 1 sets' wording sent as 102.
