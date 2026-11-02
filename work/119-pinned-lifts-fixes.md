---
id: 119
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 lead (review fixes inside the confirmed S3 scope; the search scoping is a privacy fix to a pre-existing bug, lead's call, reported to Dustin)
updated: 2026-11-02
---
# Progress S3: fixes from review 118

Checkout: worktree2, branch `feature/pinned-lifts`, uncommitted (your 117 build). No phone preview is running.

## Do
1. **Scope exercise search** (`app/api/exercises/search/route.ts`): return only system exercises and the signed-in user's own custom exercises. It's a pre-existing leak of other users' custom exercise names, and it affects `ExerciseSearchInterface` too, which is fine: nobody should see others' custom exercises. Then the pins editor can add the user's own exercises too. Use `getCurrentUser()` if the route doesn't already; keep its rate limit and error handling.
2. **Concurrent saves** (`savePins`): two overlapping PUTs must not 500. Serialize per user (e.g. a per-user advisory lock in the transaction, or lock the settings row) so the last save wins.
3. **Editor**: Cancel/Save at 48px; header in the folder's coach (amber) tone, not `bg-primary`; one focus ring on the search field; hide or theme the native search clear button.
4. **Pin limit message** next to the tapped row, not at the bottom of the list.
5. **Seed cleanup**: `scripts/seed-synthetic-users.ts` cleanup also deletes the user's `PinnedExercise` rows.

Tests in new files (e.g. `__tests__/api/exercise-search-scope.test.ts`, `__tests__/lib/insights/pinned-lifts-fixes.test.ts`, a view test if needed); don't edit locked files. If a locked test blocks a fix, stop and report it. Refresh the editor screenshots into `initiatives/analytics/docs/assets/119/`; leave data as you found it.

## Done when
All progress tests and the new ones pass; the full suite and `npx tsc --noEmit` are clean; Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; dispatched to implementer (wF:p2). Test-builder skipped on purpose (small fixes; implementer writes the tests).
- 2026-11-02 CST: back; lead re-ran (tsc clean, 524 tests pass).
- 2026-11-02 CST: Dustin checked the phone preview ("Looks great"). Accepted.
