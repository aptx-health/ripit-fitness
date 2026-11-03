---
id: 121
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (planned sets spec "Yes, go")
updated: 2026-11-02
---
# Planned sets in the workout logger: build

Checkout: worktree2, branch `feature/adhoc-planned-sets` (now level with dev, which includes pinned lifts; Prisma client regenerated). No phone preview is running.

## Goal
Make the tests pass and every scenario in `features/workout-logging/adhoc-planned-sets.feature` true.

## Read
- `features/workout-logging/adhoc-planned-sets.feature`
- `work/120-handback.md` (pinned shapes, and the lead's answers (a)–(c); follow them)
- Locked tests: `__tests__/lib/workout-logging/plan-summary.test.ts`, `__tests__/app/adhoc-page-plans.test.ts`, `__tests__/components/adhoc-plan-view.test.tsx`
- `app/(app)/training/adhoc/[completionId]/page.tsx`, `components/adhoc/AdHocLoggerView.tsx` (`prescribedSets={[]}` at :797), `components/workout-logging/{ExerciseDisplayTabs,SetList}.tsx` (don't flip ad-hoc into program layout), the program logger's RPE selector and `parseRepsFromPrescribed`

## Do
- Loader, `lib/workout-logging/plan-summary.ts`, `components/adhoc/PlanLine.tsx`, pre-fill and the RPE selector per the handback. Keep `AdHocLoggerView.tsx` under 1000 lines (extract a hook if needed).
- Screenshots at 390px, light and dark, into `initiatives/agent-tools/docs/assets/121/` (collapsed, expanded, mid-plan, an exercise with no plan). Start a session from a saved workout on a seed user; leave data as you found it.

## Done when
New and existing tests pass; full suite and `npx tsc --noEmit` clean; Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; dispatched to implementer (wF:p2).
- 2026-11-02 CST: back; lead re-ran (tsc clean, 91 tests pass). Review 122 dispatched.
- 2026-11-02 CST: Dustin checked the phone preview ("really nice. Perfect."). Accepted.
