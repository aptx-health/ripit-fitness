---
id: 125
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (tap any lift row; full mockup with 3 chart tabs; records + sessions; spec "Yes, go")
updated: 2026-11-02
---
# Per-lift page: tests

Checkout: worktree2, branch `feature/lift-page` (from dev at 3d6edef2, which has S1–S3 and planned sets). No phone preview is running.

## Goal
Write the failing tests that `features/analytics/lift-page.feature` will be judged by, before any build.

## Read
- `features/analytics/lift-page.feature` (the contract) and the mockup `initiatives/analytics/docs/discovery/ideas/b-exercise.html`
- S2/S3 code to reuse, not copy: `lib/insights/progress-records.ts` (Epley, `MAX_PR_REPS`, `LBS_PER_KG`, unit handling, rep-PR rules), `lib/insights/progress.ts` (week bounds in the user's timezone, history query), `lib/insights/pinned-lifts.ts` (`loadPinned`), `components/features/progress/{rows,LiftsPanel,ProgressView,WeeklySetsChart,format}.tsx`
- `app/api/progress/week/route.ts` and `app/api/progress/pins/route.ts` (route pattern, limiter, logging); `app/api/exercises/search/route.ts` (system + own exercises scoping)

## Shape to test against (the implementer follows the same names)
- Pure `lib/insights/lift-history.ts`:
  - `computeLiftSessions(history, unit)` → one entry per session, newest first: date, working sets, best e1RM (null for bodyweight or >12 reps), top set (heaviest weight, its reps), average RPE (null if no set was rated).
  - `computeRepRecords(history, unit, weekStart)` → heaviest set per rep count 1–12, with date and `isNew` (set in the given week); bodyweight → most reps.
  - `chartSeries(sessions, range, now)` → points for `3M | 6M | 1Y | All`; 1Y and All give one point per local week (that week's best); also the change tile numbers (first, last, percent; null with one point) and the all-time PR point.
  - `weeklySets(history, range, now, timezone)` → working sets per local week, weeks with none as 0.
- Loader `getLiftHistory(userId, exerciseDefinitionId)` → `{ name, weightUnit, isBodyweight, sessions, records, weeklySets }` or null when the exercise is missing or another user's private exercise. One query for the sets (no N+1).
- `GET /api/progress/lift/[id]`: 401 signed out, 404 not found, rate limited (new limiter, 30/60s, added to `docs/RATE_LIMITING.md`), raw numbers.
- Page `app/(app)/progress/lift/[id]/page.tsx` with a client view; Progress tab reads `?week=YYYY-MM-DD` so the back link returns to the same week; lift rows link to `/progress/lift/<id>?week=<weekStart>`.

## Do
1. Unit tests for the pure functions (mixed units, warmups excluded, archived/incomplete excluded, >12-rep sets have no e1RM, bodyweight, ties, one-session range, weekly bucketing across a DST change).
2. DB tests for the loader and the route (scoping, 404 for another user's private exercise, empty history).
3. Component tests: rows link with the week, Progress honours `?week=`, chart tabs (Reps tab replaces e1RM and no Top set tab for bodyweight), range default 6M, records "New" chip, sessions "Show more", pinned chips, "No sessions yet", "Lift not found".
4. Lock new files (`chmod a-w`) and run a break matrix in small batches.

## Done when
New tests fail on this branch for the right reason; existing Progress tests still pass; break matrix recorded.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; confirmed by Dustin; dispatched to test-builder (wF:p1).
- 2026-11-02 CST: back; lead re-ran (150 red, 2 guards pass). Five naming/rule choices accepted (125-handback.md). Build 126 dispatched.
- 2026-11-03 CST: Dustin approved on the phone preview ("I also approve of the fix and the change"). Accepted.
