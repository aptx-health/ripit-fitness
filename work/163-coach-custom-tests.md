---
id: 163
state: review
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-10 Dustin (plan 163 → 164 → 165; decisions below)
updated: 2026-11-10
---
# Tests: coach sends carry their custom exercises

Checkout: worktree1, branch `feature/coach-bundle-custom` (from origin/dev). Run `npx prisma@6.19.0 generate` first. Tests: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock && npx vitest run`.
Spec: `features/coaching/custom-exercises.feature` (replaces "Custom exercises are refused" in `features/coaching/send.feature`).

## Decisions (Dustin, 2026-11-10)
- The trainee gets their own copy, named "<name> (from <coach first name>)", because `ExerciseDefinition.normalizedName` is unique app-wide. No migration: copy has `userId` = trainee, `createdBy` = coach.
- On accept the trainee chooses per custom exercise: "Add a copy" (default; reuses a copy from an earlier send of the same exercise) or "Use one of mine" (their own or shared library).

## Where things are
- Send: `lib/coaching/send.ts` (`exercisesFor` refuses missing exercises today; `snapshot`; `sendToTrainee` creates a pending `program.create` / `saved_workout.create` proposal with `coachLinkId`). Names: `lib/coaching/names.ts`.
- Accept: `app/api/suggestions/[id]/accept/route.ts`, review screen `app/(app)/suggestions/[id]/page.tsx`, proposal apply in `lib/proposals/service.ts` / `program.ts` / `saved-workout.ts`.
- Existing coaching tests: `__tests__/features/coaching/` (the refusal step must change with the spec).
- How to recognise "an earlier copy": decide and document (e.g. stored source definition id in the copy's notes/aliases is not good enough; prefer a field in the accepted proposal payload or a lookup by createdBy + name); no migration unless unavoidable — stop and report if so.

## Do
Failing tests for every scenario (send and accept at the lib/API level against the test DB; the review screen choice at component level), written before the build. Update the old refusal test to the new spec. Prove they can fail (break-matrix where useful). Pin the contract (payload shape for bundled definitions, accept input for the choices) in the test file header.

## Done when
Every scenario maps to a test; new tests fail for the right reason on this branch; the rest of the suite passes.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-10 CST: created; plan confirmed; dispatched to test-builder (wE:p9).
- 2026-11-10 CST: back complete; lead re-ran coaching steps: 31 new fail for the right reason (send refusal), 139 pass. Scratch worktree removed. Lead call: over-long copy names trim the base name with "…".
