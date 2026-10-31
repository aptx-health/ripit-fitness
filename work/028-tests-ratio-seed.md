---
id: 028
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-30 Dustin (review Q1 = seed from Settings)
updated: 2026-10-30
---
# Test: anchor approve seeds a new profile's ratioTargets from Settings (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/agent-balance`.

## Goal
Review defect 1 (`work/027-handback.md`). When approving an `anchors.update` creates the missing `UserTrainingProfile`, its `ratioTargets` must be seeded the same way `getOrCreateUserTrainingProfile` (`lib/user-training-profile.ts` ~491) seeds it: from `UserMuscleBalanceSettings.targets`, or the defaults when there's no settings row. Dustin chose this fix.

## Do
Add tests to `__tests__/features/agent-tools/balance-proposals.steps.ts` (unlock with `chmod u+w`, lock again after) as plain describes:
- settings with quads 1.5 and no profile, approve an anchor change → profile `ratioTargets` matches what `getOrCreateUserTrainingProfile` would have produced (quads 1.5);
- no settings and no profile → the default seed.
They must fail on today's code for the right reason. No break matrix; show red against the current code and say what the failure message is.

## Done when
The new tests fail only on the seed; everything else in the file still passes.

## Don't touch
`lib/`, `app/`, `features/**`, the spec.

## Hand back
The handoff-test-builder packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-30 21:00 MDT: created from 027 Q1 (Dustin: seed); dispatched to test-builder (wF:p1).
- 2026-10-30 21:20 MDT: handback saved. Lead re-ran: 5 failed / 163 passed of 168, all 5 on the seed. File read-only. State review.
- 2026-10-30 22:30 MDT: accepted by Dustin after the phone review (buttons fixed).
