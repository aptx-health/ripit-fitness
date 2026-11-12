---
id: 162
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-10 Dustin ("go ahead" on the roadmap item; 2026-11-07 decided convert RIR = 10 − RPE; 2026-11-10: RIR labels with harder still up; session RPE follows the setting too)
updated: 2026-11-10
---
# Progress follows the user's effort scale (RPE or RIR)

Checkout: worktree2, branch `feature/progress-rir` (from origin/dev). Size: small. No test-builder.
Spec: `features/analytics/effort-scale.feature`.

## Where things are (lead's read, not run)
- Setting: `UserSettings.defaultIntensityRating` (see `app/api/settings/route.ts`, `components/settings/WorkoutsBlock.tsx`, `lib/effort-prompt.ts`).
- Effort math: `lib/insights/effort.ts` (sets have `rpe` and `rir`; distribution buckets le6..rpe10; sessionRpe). Also `lib/insights/progress.ts`, `lib/insights/lift-history.ts`, `lib/insights/progress-records.ts`.
- UI: `components/features/progress/ProgressView.tsx` (~L188 rising note, 215 change vs normal, 277 tile, 292 normal), `WeeklySetsChart.tsx` (label, aria, ≥9 highlight), `LiftView.tsx:553`, `format.ts` (`formatRpe`).
- Leave alone: `lib/mcp/tools.ts`, export, `lib/suggest/*`, `lib/aggregates/compute.ts` (raw numbers), admin analytics.

## Do
Keep the math in one canonical scale (RPE) and convert at display, or add a scale-aware formatter; your call, but one place. Pass the user's scale from the server pages. Tests for each scenario (unit for conversion and buckets, component for labels). Phone-width screenshots of Progress and a lift page in RIR to `initiatives/analytics/docs/assets/162/`.

## Done when
Every scenario covered; full `npx vitest run` passes; `npx tsc --noEmit` clean; screenshots.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-10 CST: created; dispatched to implementer (wE:p7).
- 2026-11-10 CST: back needs-decision; lead re-ran 20 new tests + tsc, checked screenshots. Lead calls: (1) buckets/session scenarios kept at formatter level (no Progress surface), noted in the .feature; (2) bare RPE notes vs labelled RIR notes OK; (3) change-from-normal "+" = harder in both scales OK. Phone preview.
- 2026-11-10 CST: Dustin on the preview: "Looks good". Accepted. PR into dev.
