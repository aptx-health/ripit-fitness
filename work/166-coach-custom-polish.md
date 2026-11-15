---
id: 166
state: review
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-10 lead (review polish inside the confirmed 163–165 scope)
updated: 2026-11-10
---
# Polish from review 165 (coach custom exercises)

Checkout: worktree1, branch `feature/coach-bundle-custom`. Findings: `work/165-handback.md`. Commit nothing. The reviewer's `__tests__/lib/coaching/custom-exercises-review.test.ts` stays.

## Do
1. Review screen uses the coach's first name, as the spec and the copy do: "Dustin's exercise", "Exercises from Dustin" (`SuggestionReview.tsx` → `BundledExerciseChoices`).
2. Long exercise names don't straddle the fieldset border at 390px (visible name inside, legend sr-only or equivalent).
3. "Add a copy" hint shows the copy's name: "Adds "Cable Fly (from Dustin)" to your exercises; you can rename it" (or "You have this from an earlier send" when reused, per spec).
4. Map a P2002 on the copy name to a userError ("Couldn't name the copy, try again").
Update tests; screenshot the review screen at 390px with a long name to `initiatives/coaching/docs/assets/166/`.

## Done when
Full `npx vitest run` and `npx tsc --noEmit` pass; screenshot.

## Hand back
`handoff-implementer` packet, first line `Report: ...`, via `herdr agent prompt wE:p1 '<packet>'`. Don't edit `work/`, `STATE.md`, `status.md`. Webhooks blanked on any dev server.

## Log
- 2026-11-10 CST: from review 165 (ship; low findings 1–4). Dispatched to coach-impl.
- 2026-11-10 CST: back complete; lead re-ran 199 coaching tests + tsc; screenshot checked. Committed; phone preview.
