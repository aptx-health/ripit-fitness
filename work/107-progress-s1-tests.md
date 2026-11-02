---
id: 107
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (page C, streak from weekly target setting, unlink Learn; S1 plan "Yes, go")
updated: 2026-11-02
---
# Progress S1 (weekly report): tests

Checkout: worktree2, branch `feature/progress-report` (from dev). No phone preview is running, so a dev server is fine if you need one.

## Goal
Write the failing tests that `features/analytics/weekly-report.feature` will be judged by, before any build.

## Read
- `features/analytics/weekly-report.feature` (the contract)
- `initiatives/analytics/docs/discovery/README.md` (data inventory, the Learn touch list, risks) and the mockup `initiatives/analytics/docs/discovery/ideas/c-report.html` / `c-report-light.png` (S1 = Report card, week navigator, Last 8 weeks; NOT Records/Lifts or the trend note)

## Shape to test against (the implementer follows the same names)
- Pure functions in `lib/insights/progress.ts`:
  - weeks are Mon–Sun in an IANA timezone;
  - per-week workouts, working sets, time, cardio minutes and effort;
  - normal = mean of the 8 weeks before;
  - streak against a target.
  - DB loader `getWeeklyReport(db, userId, { weekStart, timeZone })`.
- API `GET /api/progress/week?start=YYYY-MM-DD&tz=<IANA>`, following the AGENTS.md conventions for auth, user scope, rate limit and errors.
- Setting `UserSettings.weeklyWorkoutTarget Int @default(3)` (1–14), edited in Settings, with a test-DB migration only.
- Nav: Progress (`/progress`) replaces Learn. `/learn` and `/learn/*` redirect to `/progress`. The primer's 4 `/learn` links are removed.

## Do
1. Unit tests for the pure maths: week bucketing across DST and Sunday-evening UTC, normal, % change, effort (RIR → RPE, coverage threshold), streak, and the duration fallback.
2. DB-level tests with testcontainers: archived and draft excluded, other users excluded, program week subtitle.
3. Component tests for the page and the setting, plus updated nav tests (`__tests__/components/nav-active-tab.test.tsx`, `__tests__/features/training-library/library.steps.ts:94`).
4. Lock new test files (`chmod a-w`) and run a break matrix (`break-matrix` skill).

## Done when
New tests fail on dev for the right reason. The break matrix is recorded in the packet.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 00:40 CDT: created; confirmed by Dustin; dispatched to test-builder (wF:p1).
- 2026-11-02 01:05 CDT: back; lead re-ran (185 red). Lead answered open points (see handback). Build 108 dispatched.
- 2026-11-02 CST: Dustin checked the phone preview ("Looks good"). Accepted.
