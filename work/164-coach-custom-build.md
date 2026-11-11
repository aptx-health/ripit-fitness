---
id: 164
state: review
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-10 Dustin (plan 163 → 164 → 165)
updated: 2026-11-10
---
# Build: coach sends carry their custom exercises

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
Make 163's tests pass and cover every scenario. Accept is one transaction (copies + proposal apply). The review screen choice fits at 390px; "Use one of mine" uses the existing exercise picker. Screenshots to `initiatives/coaching/docs/assets/164/`.

## From 163
Tests: `__tests__/features/coaching/custom-exercises.steps.ts` and `send.steps.ts` (read-only; contract in the header). Packet: `work/163-handback.md`. Lead call: when "<name> (from X)" would exceed the 100-character name limit, trim the base name with "…" so the whole fits; add a test. Also reject choices for exercises not in the send (400).

## Done when
163's tests pass unchanged (or each change explained); full suite and `npx tsc --noEmit` pass; screenshots.

## Don't
Change agent proposals' refusal. No migration unless unavoidable (stop and report). Dev data only; never staging/prod.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-10 CST: created; waits on 163.
- 2026-11-10 CST: 163 done; dispatched to coach-impl (wE:pA).
- 2026-11-10 CST: back complete (suite 4649). Lead re-ran 190 coaching tests + tsc; screenshots checked. Committed; 165 review dispatched.
