---
id: 143
state: accepted
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin ("Use the email's first part"); lead decides the rest
updated: 2026-11-06
---
# Coaching slice 1: fixes after review 139

Checkout: worktree1, branch `feature/coaching-invite`, uncommitted. Small fixes: write tests yourself for 2 and 3.

## Read
`work/139-handback.md` (findings with file:line) and the two new scenarios at the end of `features/coaching/invite-link.feature`.

## Do
1. perf:scan gate: add `loading.tsx` for `app/(app)/settings` and the two admin proposal pages (preferred, ROADMAP already wants them), or allowlist with a reason if a skeleton doesn't fit. `npm run perf:scan -- --changed origin/dev` exits 0.
2. Names: when there is no `UserSettings.displayName`, use the part of the account email before "@" (BetterAuth `user` table; it isn't in Prisma, so follow how other code reads it). Both sides: the invite page, the coach's trainee list, the trainee's "Your coach". If a locked test pins "Someone" or "Anonymous User", stop and tell the lead the exact line.
3. Waiver gate on `/coach/invite/[token]`: a signed-in user without the current waiver goes to `/waiver?next=<invite>` first (reuse the (app) layout's check).
4. Re-shoot the invite-valid screenshots (current copy) into `initiatives/coaching/docs/assets/143/`.

## Done when
Coaching tests, full suite, tsc clean; perf:scan exits 0.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-06 CST: created after review 139; Dustin chose the email fallback. Dispatched to coach-impl (wE:pA).
- 2026-11-06 CST: back; lead amended locked steps (@work143 exclude + waiver seed); coaching 82/82, tsc clean. Waits for Dustin's phone preview after the workout library one.
- 2026-11-06 CST: Dustin on the phone preview: "that all works". Accepted.
