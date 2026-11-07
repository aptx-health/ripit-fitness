---
id: 138
state: accepted
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin (slice 1 spec and plan, "Yes, go")
updated: 2026-11-06
---
# Coaching slice 1: build

Checkout: worktree1, branch `feature/coaching-invite`. The locked tests are the contract.

## Read
- `features/coaching/invite-link.feature` (amended 2026-11-06: Copy only at creation; Coaching row in the Account block)
- `work/137-handback.md` and the header of `__tests__/features/coaching/invite-link.steps.ts` (names, routes, codes, the CHECK migration)
- `initiatives/coaching/docs/136-discovery.md` (design)
- `AGENTS.md` (Database and migrations: `db push` + a hand-written migration; never `migrate dev`; never apply SQL to staging or prod)

## Do
Make `__tests__/features/coaching/invite-link.steps.ts` and `__tests__/app/coaching-invite-middleware.test.ts` pass without editing them (they are `chmod a-w`). Schema + migration (CHECK as its own ALTER TABLE), `lib/coaching/*`, routes, limiters (+ `docs/RATE_LIMITING.md`), Settings → Coaching, `/coach/invite/[token]`, return path through sign-in, sign-up and onboarding (same-origin only), admin proposal pages tolerate a null token. Follow existing Settings and auth page styles; work in E-INK.

## Done when
Coaching tests pass; full suite and `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean or explained; 390px screenshots (Coaching as coach and trainee, invite page states) in light, dark and E-INK in `initiatives/coaching/docs/assets/138/`.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-06 CST: created; dispatched to new agent coach-impl (worktree1).
- 2026-11-06 CST: back "needs decision". Lead amended the locked steps (two strings to the amended feature; "he sends" → "they send" in feature and steps; work 138 comments). Re-run: 73/74, the copy fail is expected. Sent back: change the invite copy, and fix the waiver `//evil.com` open redirect (it is on the invite return path) with a test.
- 2026-11-06 CST: round 2 back; lead re-ran (coaching + waiver 84/84, tsc clean). Review 139 dispatched to new agent coach-review.
- 2026-11-06 CST: Dustin on the phone preview: "that all works". Accepted.
