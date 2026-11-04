# 126 handback (implementer, 2026-11-02)
Report: complete. `lib/insights/lift-history.ts` (pure fns + `getLiftHistory`, 3 parallel queries; `weeksInRange`/`rangeFirstWeek`), `GET /api/progress/lift/[id]` (`progressLiftLimiter` 30/60s, T9 in RATE_LIMITING, 400 bad tz, 404, `pinned`), page + `LiftView` in Suspense, `LiftChart.tsx` hand SVG. Progress rows link with `?week=`; ProgressView honours a real Monday ≤ this week; Suspense on /progress. Small moves: `isMonday` into progress.ts, `browserTimeZone` into format.ts, optional `href` on Row/LiftRow, "Try again" reloads the same week.
Decisions: null-safe useSearchParams (3 older test files don't mock navigation); own 48px tablist instead of PaperTabs; weighted rep records skip weight-0 sets; top-set change from 0 is null; "No records yet…" and "No sessions in this range" empty states.
Checks: 152 locked pass; suite 3877 pass / 4 skip; tsc, Biome, eslint clean; `npm run build` ok. Screenshots `initiatives/analytics/docs/assets/126/` (14). Data restored (counts match); :3201 and wt2 DB stopped.
Not checked: real device feel, mockup match.
Lead (2026-11-02): re-ran Progress/insights tests (652 pass) and tsc clean.
