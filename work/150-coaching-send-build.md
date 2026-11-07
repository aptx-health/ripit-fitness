---
id: 150
state: accepted
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (slice 2 spec, "Yes, go")
updated: 2026-11-07
---
# Coaching slice 2: build

Checkout: worktree1, branch `feature/coaching-send` (stacked on `feature/workout-library-origin`, PR #1043). The locked tests are the contract.

## Read
- `features/coaching/send.feature`
- `work/148-handback.md` and the header of `__tests__/features/coaching/send.steps.ts` (names, routes, codes, labels)
- `initiatives/coaching/docs/136-discovery.md`, `work/145-handback.md`, `work/147-handback.md` (origin, `fromCoach`)
- `AGENTS.md` conventions (auth, scoping, try/catch, rate limits, logging)

## Do
Make `__tests__/features/coaching/send.steps.ts` and `__tests__/lib/coaching-send-converters.test.ts` pass without editing them. Converters, `lib/coaching/send.ts`, the two routes (+ limiter in `docs/RATE_LIMITING.md`), `SendToTrainee` on the Library program page (a real button, not just the import) and the saved-workout dialog, the Sent list on Settings → Coaching, the sender name on trainee screens, `origin: 'coach'` on accept (pass it from `approveProposal` by `coachLinkId`, not hard-coded). Coach sends call `createProposal` with a no-op notify.

## Done when
New tests pass; full suite and `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean; 390px screenshots (Send button + sheet + picker, a refusal, Sam's Training and review "From Dustin", the Sent list) in light, dark and E-INK in `initiatives/coaching/docs/assets/150/`. Leave synthetic preview data in the wt1 DB (a coach and a linked trainee you can sign in as, a program and saved workout to send, one custom exercise) and say how to sign in and how to remove it.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; dispatched to coach-impl (wE:pA).
- 2026-11-07 CST: back complete; lead re-ran 130/130, tsc clean. Review 151 dispatched to coach-review.
- 2026-11-07 CST: Dustin approved slice 2 on the preview ("everything works really well"). Accepted.
