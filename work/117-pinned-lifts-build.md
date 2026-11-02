---
id: 117
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (pinned lifts spec "Yes, go")
updated: 2026-11-02
---
# Progress S3 (pinned lifts): build

Checkout: worktree2, branch `feature/pinned-lifts` (off S2). No phone preview is running.

## Goal
Make the S3 tests pass and every scenario in `features/analytics/pinned-lifts.feature` true.

## Read
- `features/analytics/pinned-lifts.feature`
- `work/116-handback.md` (pinned shapes and the UI contract)
- Locked tests: `__tests__/lib/insights/pinned-lifts.test.ts`, `__tests__/lib/insights/pinned-lifts-report.test.ts`, `__tests__/api/progress-pins.test.ts`, `__tests__/components/progress-pinned-view.test.tsx` (headers hold the full shapes), plus all S1/S2 progress tests
- S2 code: `lib/insights/progress.ts`, `lib/insights/progress-records.ts`, `components/features/progress/RecordsLifts.tsx`; anchors in `UserTrainingProfile.targetMovements` and `lib/exercises/anchor-patterns`; search UX in `components/features/target-movements/TargetMovementsEditor.tsx`

## Do
- Prisma `PinnedExercise` + `UserSettings.pinnedLiftsCustomized`, one additive migration (`npx prisma@6.19.0 migrate dev`, local wt2/test DB only; never staging or prod).
- `lib/insights/pinned-lifts.ts`, report `pinned` (optional on the type), `PUT /api/progress/pins` with a limiter in `lib/rate-limit.ts` and a row in `docs/RATE_LIMITING.md`.
- UI per the contract; new component files; files under 1000 lines.
- Screenshots at 390px, light and dark, into `initiatives/analytics/docs/assets/117/` (pinned group, a "Not this week" row, the editor). Leave data as you found it.

## Done when
All S1/S2/S3 progress tests pass, the full suite and `npx tsc --noEmit` are clean, Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; dispatched to implementer (wF:p2).
- 2026-11-02 CST: back; lead re-ran (tsc clean, 507 progress tests pass). Review 118 dispatched.
- 2026-11-02 CST: Dustin checked the phone preview ("Looks great"). Accepted.
