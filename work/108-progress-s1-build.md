---
id: 108
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (page C, weekly target setting, unlink Learn; S1 plan "Yes, go")
updated: 2026-11-02
---
# Progress S1 (weekly report): build

Checkout: worktree2, branch `feature/progress-report`. No phone preview is running, so the dev server and builds are fine. Use your own DB for checks, not shared data.

## Goal
Make `features/analytics/weekly-report.feature` true and get the 9 test files from 107 passing. Don't edit the locked tests.

## Read
- The test-builder's packet, `work/107-handback.md`. Every name, route contract, data attribute and field it pins is fixed. The test file headers have the shapes.
- `initiatives/analytics/docs/discovery/README.md`: inventory, Learn touch list, risks.
- The mockup `initiatives/analytics/docs/discovery/ideas/c-report.html`, plus its light and dark PNGs and `_charts.js`. S1 covers the Report card, the week navigator and Last 8 weeks only. Records/Lifts and the trend note are out.
- `initiatives/ui-audit/spec.md`, header section. These style rules apply: paper tabs, folder boxes, plain rows, no `doom-corners`, one `doom-title`, 48px targets, light and dark.

## Decisions already made
- Only `status: 'completed'`, non-archived workouts count. Draft, abandoned and skipped workouts don't.
- `LoggedCardioSession.duration` is in minutes.
- Charts are hand-written SVG in theme tokens. Don't add a chart library.
- `UserSettings.weeklyWorkoutTarget Int @default(3)` gets an additive Prisma migration, created with `npx prisma@6.19.0 migrate dev --create-only` or the repo's usual method. Apply it only to your local or test DB. Never apply it to staging or prod.
- Learn: remove the nav entries and the primer links. `/learn` and `/learn/*` redirect to `/progress`. Leave the tables, the admin CMS, the seeds and `lib/learning/*` alone.
- Put the target control in Settings → Workouts block.

## Done when
- The 9 files pass, and so does the full suite.
- tsc passes, and eslint and biome are clean on the files you touched.
- Every file stays under 1000 lines.
- No N+1 queries: run the `prisma-check` skill on the loader.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Include the migration file name. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 01:05 CDT: created from 107; dispatched to implementer (wF:p2).
- 2026-11-02 01:50 CDT: back; lead re-ran 9 files (304 pass), tsc ok. Review 109 dispatched.
- 2026-11-02 CST: Dustin checked the phone preview ("Looks good"). Accepted.
