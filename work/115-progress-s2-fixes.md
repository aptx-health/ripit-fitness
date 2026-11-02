---
id: 115
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (cap e1RM PRs at 12 reps; fix both review findings now)
updated: 2026-11-02
---
# Progress S2: fixes from review 113

Checkout: worktree2, branch `feature/progress-records`, uncommitted (your 112 build plus tests). No phone preview is running.

## Do
1. **e1RM PRs at 12 reps or fewer** (Dustin's rule). Only sets of 1–12 reps can be an e1RM PR, and only those count toward the "previous" best e1RM for records. Lifts is unchanged (it still lists high-rep exercises with their numbers). New scenario at the end of `features/analytics/weekly-records.feature`.
2. **Bound the history query** (`lib/insights/progress.ts:320`, review finding 1). Rows returned must scale with sessions or exercises, not with every past set: e.g. aggregate in SQL per exercise and session (best e1RM, heaviest weight per rep count at ≤12 reps, max bodyweight reps). Keep the query count flat in exercise count, and keep the pure functions' behaviour and the locked tests green.
3. **Light-week wording** (`components/features/progress/ProgressView.tsx:150`, finding 3): when the search covered fewer than 8 weeks, don't claim "in the last 8 weeks"; say "No light week since you started." (or the actual count, "in the last N weeks").

Add tests for 1–3 in a new file `__tests__/lib/insights/progress-records-fixes.test.ts` (and a view test if needed); don't edit locked files. If a locked test blocks item 1 or 2, stop and report it.

## Done when
All progress tests (S1, S2, 114 decisions, yours) pass, the full suite and `npx tsc --noEmit` are clean, Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; dispatched to implementer (wF:p2). Test-builder skipped on purpose (small fixes; implementer writes the tests, as in 110).
- 2026-11-02 CST: back; lead re-ran (tsc clean, 372 progress tests pass).
- 2026-11-02 CST: Dustin checked the phone preview ("Looks great"). Accepted.
