---
id: 126
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (lift page spec "Yes, go")
updated: 2026-11-02
---
# Per-lift page: build

Checkout: worktree2, branch `feature/lift-page` (from dev at 3d6edef2). No phone preview is running.

## Goal
Make the tests pass and every scenario in `features/analytics/lift-page.feature` true.

## Read
- `features/analytics/lift-page.feature` and the mockup `initiatives/analytics/docs/discovery/ideas/b-exercise.html` (+ `b-exercise-light.png`)
- `work/125-handback.md` (shapes and rules; the lead accepted all five choices; follow them)
- Locked tests: `__tests__/lib/insights/lift-history.test.ts`, `__tests__/lib/insights/lift-history-loader.test.ts`, `__tests__/api/progress-lift.test.ts`, `__tests__/components/progress-lift-links-view.test.tsx`, `__tests__/components/lift-page-view.test.tsx`, `__tests__/app/progress-lift-page.test.tsx` (their headers list the full contract)
- Reuse: `lib/insights/progress-records.ts` (Epley, MAX_PR_REPS, unit conversion), `lib/insights/progress.ts` (timezone weeks, history query), `lib/insights/pinned-lifts.ts` (resolvePins), `components/features/progress/*` (rows, format, WeeklySetsChart style), `app/api/progress/*/route.ts` (route pattern, limiter)

## Do
- `lib/insights/lift-history.ts`, the loader, `GET /api/progress/lift/[id]` with a new limiter (30/60s) and its `docs/RATE_LIMITING.md` row, the page `app/(app)/progress/lift/[id]/page.tsx` and a client `LiftView`, hand-written SVG charts (no chart library), Progress rows as links with `?week=`, Progress honouring `?week=` (Suspense boundary for useSearchParams).
- Match the app's folder/paper-tab style (see the S2/S3 Progress components); one `doom-title` per screen; 48px targets.
- Screenshots at 390px, light and dark, into `initiatives/analytics/docs/assets/126/`: e1RM tab, Top set tab, Volume tab, records + sessions, a bodyweight lift, "No sessions yet". Use a seed user (e.g. `bodybuilder@synthetic.test`); leave data as you found it.

## Done when
New and existing tests pass; full suite and `npx tsc --noEmit` clean; `npm run build` succeeds; Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; dispatched to implementer (wF:p2).
- 2026-11-02 CST: back; lead re-ran (652 Progress/insights tests pass, tsc clean). Review 127 dispatched.
- 2026-11-03 CST: Dustin approved on the phone preview ("I also approve of the fix and the change"). Accepted.
