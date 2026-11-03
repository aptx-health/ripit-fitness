# 111 handback (test-builder, 2026-11-02)
Report: complete. 4 new locked files: progress-records.test.ts (72), progress-records-report.test.ts (28), progress-week-records.test.ts (8), progress-records-view.test.tsx (39). S1 progress-view.test.tsx "no records/lifts/trend" test changed to "no trend note when null" (contradicted S2). Lead re-ran: 144 red, 39 pass. Break matrix 96/96 killed (scratch clone). Pinned shapes are in the test file headers; unit is a 4th arg to the pure fns; payload has no `flat` (UI: sessionsBelowBest >= 3); computeTrendNote(weeks, normalWeeks).

Lead answers:
1. Feature numbers were not Epley: feature fixed to e1RM 312. Tests use real Epley.
2. "Rose N weeks running" = weeks in the run (8.0, 8.2, 8.5, 8.7 = 4). Accepted.
3. Null at 0–1 normal weeks, note at 3+; 2 left open. Accepted (implementer: null below 3).
4. New WeeklyReport fields stay required; if the locked S1 progress-view-fixes.test.tsx fixture fails tsc, the lead amends it.
5. library.feature:9 was fixed and merged in S1 (#1030). Closed.
Unpinned, decided for the build: rep PR needs an earlier set at the same rep count; if several rep PRs, show the one with the largest % gain; records order e1RM PRs first then name; Lifts empty text "No lifts this week"; tab choice need not survive week change; the open current week is never "light" (lastLightWeeksAgo counts completed weeks only; 0 = the shown past week was light → "This was a light week.").
