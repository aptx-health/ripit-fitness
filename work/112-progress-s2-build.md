---
id: 112
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (S2 plan "Yes, go"; light week ≤ 60% of normal sets; Flat = 3rd session below best)
updated: 2026-11-02
---
# Progress S2 (records, lifts, trend note): build

Checkout: worktree2, branch `feature/progress-records`. No phone preview is running.

## Goal
Make the S2 tests pass and every scenario in `features/analytics/weekly-records.feature` true.

## Read
- `features/analytics/weekly-records.feature`
- `work/111-handback.md` (pinned shapes, and the lead's decisions on the unpinned gaps; follow them)
- Locked tests: `__tests__/lib/insights/progress-records.test.ts`, `__tests__/lib/insights/progress-records-report.test.ts`, `__tests__/api/progress-week-records.test.ts`, `__tests__/components/progress-records-view.test.tsx` (headers hold the full shapes), plus all S1 progress tests
- Mockup `initiatives/analytics/docs/discovery/ideas/c-report.html` and `c-report-light.png`
- S1 code: `lib/insights/progress.ts`, `app/api/progress/week/route.ts`, `components/features/progress/*`

## Do
- `lib/insights/progress-records.ts` with the pure functions; extend `getWeeklyReport` with a bounded number of queries (no per-exercise N+1).
- UI in `components/features/progress/` (new component files; keep files under 1000 lines), wording in the UI only.
- New `WeeklyReport` fields are required. If the locked S1 `progress-view-fixes.test.tsx` then fails tsc, say so in the packet; don't edit it (the lead will).
- Screenshots at 390px, light and dark, into `initiatives/analytics/docs/assets/112/`.

## Done when
All S2 and S1 progress tests pass, the full suite and `npx tsc --noEmit` are clean, and Biome is clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; dispatched to implementer (wF:p2).
- 2026-11-02 CST: back; lead amended S1 fixture (progress-view-fixes) and re-ran: tsc clean, 331 progress tests pass. Review 113 and gap tests 114 dispatched.
- 2026-11-02 CST: Dustin checked the phone preview ("Looks great"). Accepted.
