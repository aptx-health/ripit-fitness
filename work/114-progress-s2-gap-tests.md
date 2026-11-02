---
id: 114
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (S2 plan "Yes, go"); lead decisions recorded in work/111-handback.md
updated: 2026-11-02
---
# Progress S2: tests for the lead's decisions

Checkout: worktree2, branch `feature/progress-records`. The build (112) is in place, so these tests should pass now; prove each one fails with its rule broken.

## Goal
Pin three decisions that no test covers yet (see `work/111-handback.md`, "Unpinned, decided for the build", and the two lead scenarios at the end of `features/analytics/weekly-records.feature`):
1. The open current week is never the light week (`computeTrendNote(..., { openWeek })`, and through `getWeeklyReport` for the current week).
2. When several rep PRs qualify for one exercise in a week, the one with the largest % gain is shown.
3. Records order: e1RM PRs first, then by name.
Also: a first ever set at a rep count is not a rep PR, if not already pinned.

## Do
New file `__tests__/lib/insights/progress-records-decisions.test.ts`; don't edit locked files. Lock it and run a small break matrix (one break per rule).

## Hand back
Use `handoff-test-builder`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or source code. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; dispatched to test-builder (wF:p1), in parallel with review 113.
- 2026-11-02 CST: back; lead re-ran (23 pass, locked).
- 2026-11-02 CST: Dustin checked the phone preview ("Looks great"). Accepted.
