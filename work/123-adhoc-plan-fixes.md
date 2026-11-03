---
id: 123
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (one effort picker; rename the line to "Target"; keep the expanded list and next chip)
updated: 2026-11-02
---
# Planned sets: fixes from review 122

Checkout: worktree2, branch `feature/adhoc-planned-sets`, uncommitted (your 121 build). No phone preview is running.

## Do
1. **Hidden RPE bug** (review finding 1): a set logged after the plan is done must not carry a hidden effort. Only the effort shown in the form is saved.
2. **One effort picker** (Dustin): for an exercise whose plan uses RPE targets, with intensity on, show only the RPE picker (no empty RIR above it), keyed on the exercise's plan rather than the next set, so it stays after the plan is done and nothing jumps. RIR plans and no-plan exercises stay as today.
3. **Rename the line to "Target"** (Dustin): the line text is "Target " plus the summary. The lead already amended the locked `adhoc-plan-view.test.tsx` strings and the feature; keep "Planned sets" as the list name and the header's "Plan" button as is.
4. **Refill after delete** (finding 4): deleting a logged set, or a failed log rolling back, refills the form from the next planned set if the form is untouched.

New scenarios at the end of `features/workout-logging/adhoc-planned-sets.feature`. Add tests in a new file (e.g. `__tests__/components/adhoc-plan-fixes-view.test.tsx`). If a locked assertion pins both pickers for an RPE plan, the lead allows you to change only that assertion, with a comment `// lead amendment 2026-11-02 (Dustin: one effort picker), work 123`, and re-lock; list each one in your packet. Don't change any other locked assertion.

Refresh screenshots into `initiatives/agent-tools/docs/assets/123/` (mid-plan, plan done); leave data as you found it.

## Done when
All tests pass; full suite and `npx tsc --noEmit` clean; Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; lead amended locked adhoc-plan-view.test.tsx ("Plan " → "Target ") for Dustin's rename; dispatched to implementer (wF:p2).
- 2026-11-02 CST: implementer asked to amend locked adhoc-plan-view.test.tsx:515 (RPE picker null after plan done) and :442; lead approved both (follow Dustin's one-picker rule), with amendment comments.
- 2026-11-02 CST: back; lead re-ran (tsc clean, 105 tests pass). Starting phone preview.
- 2026-11-02 CST: Dustin checked the phone preview ("really nice. Perfect."). Accepted.
