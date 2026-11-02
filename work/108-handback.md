Report: complete (implementer, wF:p2, 2026-11-02)

- New: `lib/insights/progress.ts` (pure helpers, `getWeeklyReport`, `isValidTimeZone`; 3 queries in Promise.all, a 4th only for long streaks), `app/api/progress/week/route.ts`, `app/(app)/progress/page.tsx`, `components/features/progress/{ProgressView,WeeklySetsChart,format}`.
- Migration `prisma/migrations/20261102050748_weekly_workout_target/migration.sql` (additive column, default 3); applied to the wt2 local DB only.
- Settings PUT validates 1–14; WorkoutsBlock number input with debounced save. Nav: Progress replaces Learn. `next.config.ts` redirects /learn and /learn/:path* (307). Primer links removed. New `progressReadLimiter` (60/60s), doc row in RATE_LIMITING.md.
- Screenshots: `initiatives/analytics/docs/assets/108/`.
- Choices: program week from the latest active-program workout; effort change neutral colour; "–" when there's no history; chart as per-column SVG with role=img.
- Outside: dead Learn routes/components behind the redirect; ADDING_LEARN_ARTICLES.md and AGENTS.md docs index still mention Learn; worktree2 doppler needs --project fitcsv.
- Implementer: full suite 3243 pass. Lead re-ran the 9 files: 304 pass; tsc ok.

110 fixes (2026-11-02): normal over weeks since first workout (`normalWeeks`; 0 → "–"); streak > 8 weeks via one grouped `$queryRaw` (stops at first miss); future `start` → 400; "This wk" label. 24 new tests. Lead re-ran 10 files: 207 pass; tsc ok.
