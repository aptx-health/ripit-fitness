---
id: 152
state: accepted
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (slice 2); lead decides fix details
updated: 2026-11-07
---
# Coaching slice 2: fixes after review 151

Checkout: worktree1, branch `feature/coaching-send`, uncommitted. Small: write tests yourself.

## Read
`work/151-handback.md` (findings with file:line).

## Do
1. Sendable programs, and a real reason when not:
   - Normalise before checking: skip days with no exercises and exercises with no sets; numbered labels (A1/A2) become their letter (A); drop a group label that ends up on one exercise or isn't adjacent (a superset of one is just an exercise). Clip free-text reps/weight over the limit? No: refuse those, but say which exercise and field.
   - Pass `createProposal`'s error through as `reason` (route body and the sheet), naming the exercise/day where possible, e.g. "Week 1, Day 2, Squat: reps is too long (max 20)". Keep the custom-exercise message.
2. Coach-name lookup: create the BetterAuth `user` table in the affected tests (like `user-agent-tokens.steps.ts:119`) and remove the catch in `app/api/workouts/saved/route.ts:116` (or log at error level if a fallback is kept).
3. Duplicate sends: refuse when the same source is already pending on that link ("Already waiting for Sam to decide"), 409.
4. Trainees: the program page passes trainees from the server; the saved-workout dialog fetches only when it opens. No request for users who coach nobody.

## Done when
Locked tests still pass; full suite and tsc clean; perf:scan exits 0 (mount-fetch gone). Preview data still in the wt1 DB.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created after review 151; dispatched to coach-impl (wE:pA).
- 2026-11-07 CST: back; lead amended two locked steps (second source); 143/143, tsc clean. Ready for Dustin's phone preview.
- 2026-11-07 CST: Dustin approved slice 2 on the preview ("everything works really well"). Accepted.
