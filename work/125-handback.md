# 125 handback (test-builder, 2026-11-02)
Report: needs decision. 6 locked files, 152 tests: `__tests__/lib/insights/lift-history.test.ts` (57 pure), `lift-history-loader.test.ts` (20 DB), `__tests__/api/progress-lift.test.ts` (18 DB, incl. RATE_LIMITING row), `__tests__/components/progress-lift-links-view.test.tsx` (9), `__tests__/components/lift-page-view.test.tsx` (46), `__tests__/app/progress-lift-page.test.tsx` (2). 150 red on missing modules, 2 guards pass on purpose; existing Progress tests (172) pass. Break matrix 109 breaks, 106 killed, 3 equivalent (weekly_ignores_range, loader_warmups, route no_unit_convert).
Choices it made (full shapes in the headers of lift-history.test.ts and lift-page-view.test.tsx):
1. `getLiftHistory(db, userId, id, { timeZone, now? })`.
2. Route takes `?tz=` (400 if bad), returns `{ success, lift }`; lift adds `pinned: [{exerciseDefinitionId, name}]` from resolvePins.
3. `chartSeries(sessions, range, now, timeZone)` → {points, change{e1rm,topSet,reps}, best, heaviest, mostReps, sessions, since}; weeklySets → [{weekStart, sets}] up to the current week, not padded before the first set; effort = rpe else 10−rir.
4. Rules: top-set tie → more reps; record tie → earliest keeps it; bodyweight = every working set at weight 0, one "Most reps" record; Best e1RM / Heaviest tiles all-time, change and sessions follow the range; weekly point date = that week's best session; change % one decimal; ranges ~91/182/365 days; Volume uses the last ~14/27/53 weeks of the All weeklySets.
5. UI contract: LiftView reads ?week=; "Back to Progress"; nav "Pinned lifts" with aria-current; role=tab tabs; aria-pressed ranges; data-chart/point/bar/tile/record/session hooks; 48px targets; one link per Progress row with ?week=; Progress honours ?week= only for a real Monday.
Heads-up: ProgressView's useSearchParams needs a Suspense boundary in /progress/page.tsx.
Not tested: 390px fit, dark mode, chart look, mockup match, real browser.
Lead (2026-11-02): re-ran, 150 fail / 2 pass, files locked. All five choices accepted as written; they stay inside the feature.
