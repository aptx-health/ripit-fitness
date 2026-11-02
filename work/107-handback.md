Report: complete (test-builder, wF:p1, 2026-11-02)

- New, locked: `__tests__/lib/insights/progress.test.ts` (50), `progress-report.test.ts` (33), `__tests__/api/progress-week.test.ts` (24), `weekly-workout-target.test.ts` (18), `__tests__/components/progress-view.test.tsx` (36), `weekly-target-setting.test.tsx` (17), `learn-removal.test.tsx` (6).
- Edited: `nav-active-tab.test.tsx`, `library.steps.ts` (Progress replaces Learn).
- Red on dev: 185 fail in those 9 files; rest green. Lead re-ran: 185 failed / 119 passed.
- Pinned interface (names, route contract, data attributes, setting field) is in the packet, summarised in work/108.
- Break matrix: 100 breaks, all killed.
- Lead answers to its open points: cardio `duration` is minutes (docs/features/CARDIO_DESIGN.md:182); only `status: 'completed'` and not archived counts (abandoned/draft/skipped excluded); library.feature:9 and its step text changed to Progress by the lead.
- Not tested: screenshots, layout, light/dark, SVG look, Settings placement, performance.
