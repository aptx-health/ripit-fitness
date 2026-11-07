---
id: 148
state: running
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (slice 2 spec, send + Sent list, "Yes, go")
updated: 2026-11-07
---
# Coaching slice 2: tests

Checkout: worktree1, branch `feature/coaching-send` (stacked on `feature/workout-library-origin`, PR #1043, which is on dev with coaching slice 1 and supersets). No phone preview is running.

## Goal
Write the failing tests `features/coaching/send.feature` will be judged by, before any build.

## Read
- `features/coaching/send.feature` (the contract), `features/coaching/invite-link.feature` (slice 1, built)
- `initiatives/coaching/docs/136-discovery.md` (design: coach-path `createProposal` with a no-op notify, Program → `programInput` / SavedWorkout → workout input converters, run the existing `check*` as the **trainee**, `Proposal.coachLinkId`)
- `work/145-handback.md` and `work/147-handback.md` (origin, `fromCoach`; `createSavedWorkout` hard-codes origin 'agent' today, coach sends must give 'coach')
- `lib/coaching/*`, `lib/proposals/{service,program,saved-workout,groups}.ts`, `lib/suggestions/*`, `components/training/TrainingHome.tsx` ("From your coach"), `app/(app)/settings/coaching/`, Library program and saved-workout screens

## Shape to test against (the implementer follows the same names)
- `lib/coaching/send.ts`: `sendToTrainee(db, coachUserId, { linkId, kind: 'program' | 'saved_workout', sourceId, note? })` → proposal id, or a refusal `{ code: 'not_linked' | 'not_found' | 'invalid', missingExercises? }`. Converters `programToInput`, `savedWorkoutToInput` (pure, round-trip tested, keep supersets).
- `POST /api/coaching/send` (scoped, rate limited, logged); `listSent(db, coachUserId, linkId)` → `{ name, kind, sentAt, status }` (pending / accepted / declined only).
- Sender label on trainee screens: coach display name (or email part, slice 1 names), agents unchanged.
- Accepting a coach saved workout gives `origin: 'coach'`.

## Do
1. Pure converter tests (program with weeks, supersets, warmups, RPE/RIR; saved workout).
2. DB tests: send for each kind, snapshot, refusals (not linked, ended link, someone else's program, custom exercises named), notify never called, accept → trainee copy with origin coach, decline, Sent list scoping and statuses, ended link hides the list but pending stays acceptable, rate limit, logging.
3. Component tests: Send action in Library (hidden with no trainees, picker with several), sheet copy and note, refusal message, "From Dustin" on Training and review, Sent list.
4. Lock new files (`chmod a-w`) and run a break matrix in small batches.

## Done when
New tests fail on this branch for the right reason; existing tests still pass; break matrix recorded.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; confirmed by Dustin; dispatched to test-builder (wE:p9), worktree1.
