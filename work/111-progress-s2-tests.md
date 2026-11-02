---
id: 111
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (S2 plan "Yes, go"; light week = sets ≤ 60% of normal; Flat = 3rd session in a row below best e1RM; exercise page B later)
updated: 2026-11-02
---
# Progress S2 (records, lifts, trend note): tests

Checkout: worktree2, branch `feature/progress-records` (from dev, which has S1 merged as #1030). No phone preview is running, so a dev server is fine if you need one.

## Goal
Write the failing tests that `features/analytics/weekly-records.feature` will be judged by, before any build.

## Read
- `features/analytics/weekly-records.feature` (the contract)
- S1 code you are extending: `lib/insights/progress.ts`, `app/api/progress/week/route.ts`, `components/features/progress/ProgressView.tsx`, and the S1 tests in `__tests__/lib/insights/`, `__tests__/api/progress-week*.test.ts`, `__tests__/components/progress-view*.test.tsx` (S1 tests are locked; don't edit them)
- Mockup: `initiatives/analytics/docs/discovery/ideas/c-report.html` (Records / Lifts folder, trend note under Last 8 weeks) and `c-report-light.png`
- Existing maths to reuse: `lib/stats/exercise-history-derivation.ts` (Epley e1RM, bodyweight excluded), `lib/insights/stall.ts`

## Shape to test against (the implementer follows the same names)
- Pure functions in `lib/insights/progress-records.ts`:
  - `computeWeekRecords(history, weekStart, weekEnd)` → per exercise, at most one record: `{ exerciseDefinitionId, name, kind: 'e1rm' | 'rep', weight, reps, e1rm, previous }`. e1RM wins over a rep PR. Rep PRs only at 1–12 reps; bodyweight compares reps. An exercise's first ever session is never a record. Only history before the week counts as "previous".
  - `computeWeekLifts(history, weekStart, weekEnd)` → per exercise done in the week: best set, e1RM, previous session e1RM, best-ever e1RM, `sessionsBelowBest` (consecutive sessions ending this week below the best before them); sorted by working sets desc. `flat` = `sessionsBelowBest >= 3`.
  - `computeTrendNote(weeks, normalWeeks)` over S1's 8 weekly summaries → `{ effortRisingWeeks, effortFrom, effortTo, lastLightWeeksAgo }`; effort rising needs ≥3 weeks and ≥50% RPE coverage; light = working sets ≤ 60% of normal (0 counts); null when fewer than 3 weeks since first workout.
- `getWeeklyReport` (or a sibling loader it calls) adds `records`, `lifts`, `trend` to the `GET /api/progress/week` response; raw numbers only, the wording lives in the UI.
- UI: a Records / Lifts paper-tab folder (Records tab shows the count) under the report card, and the trend note under the Last 8 weeks chart, with the strings in the feature.

## Do
1. Unit tests for the pure maths: e1RM vs rep PR precedence, ties (equal is not a PR), 1–12 rep window, bodyweight, first session, unit mix (kg/lb, display in the user's unit), warmups excluded, past-week isolation, Flat at 2 vs 3, rising effort at 2 vs 3+ weeks, coverage threshold, light-week 60% boundary.
2. DB-level tests with testcontainers on the loader: archived and draft excluded, other users excluded, query count bounded (no per-exercise N+1).
3. Component tests for the folder, empty Records state, Flat chip and trend note strings.
4. Lock new test files (`chmod a-w`) and run a break matrix (`break-matrix` skill), in small batches.

## Done when
New tests fail on dev for the right reason. The break matrix is recorded in the packet.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; confirmed by Dustin; dispatched to test-builder (wF:p1).
- 2026-11-02 CST: 111 back; lead re-ran (144 red). Decisions in 111-handback.md; feature e1RM fixed to Epley 312, 2 scenarios added (open week never light; rep PR needs earlier set at that count).
- 2026-11-02 CST: Dustin checked the phone preview ("Looks great"). Accepted.
