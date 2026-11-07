---
id: 137
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin (slice 1 spec and plan, "Yes, go")
updated: 2026-11-06
---
# Coaching slice 1: tests

Checkout: worktree1, branch `feature/coaching-invite` (from origin/dev at 457afc54). No phone preview is running.

## Goal
Write the failing tests `features/coaching/invite-link.feature` will be judged by, before any build.

## Read
- `features/coaching/invite-link.feature` (the contract) and `initiatives/coaching/docs/136-discovery.md` (design: CoachInvite, CoachLink, nullable `Proposal.agentTokenId` + `coachLinkId` with a CHECK, hashed single-use tokens like `lib/agent-tokens.ts`, return path through sign-up/sign-in).
- `AGENTS.md` "Database and migrations" (db push + hand-written migration; BetterAuth users aren't in Prisma).
- Proposal readers that assume a token: `app/(app)/admin/proposals/*`, `app/api/admin/proposals/*`, `lib/suggestions/*`.
- Precedents: `lib/agent-tokens.ts`, `lib/rate-limit.ts`, `lib/signup-attribution-cookie.ts`, `app/(auth)/{login,signup}/page.tsx`, Settings sub-pages and `components/settings/*`.

## Shape to test against (the implementer follows the same names)
- `lib/coaching/invites.ts`: `createInvite(db, coachUserId)` → `{ id, token, expiresAt }` (7 days); `revokeInvite(db, coachUserId, id)`; `getInvite(db, token, viewerId)` → status `valid | invalid | self | already_linked` plus coach display name; `acceptInvite(db, token, traineeUserId)`.
- `lib/coaching/links.ts`: `listCoaching(db, userId)` → `{ invites, trainees, coaches }`; `endLink(db, userId, linkId)` (either side; pending proposals untouched).
- Routes under `app/api/coaching/` (invites POST/DELETE, invite accept, links DELETE): 401 signed out, scoped, rate limited (new limiters added to `docs/RATE_LIMITING.md`), errors logged.
- Pages: `app/(app)/settings/coaching/page.tsx`, `app/coach/invite/[token]/page.tsx`; a Coaching row in Settings; sign-in and sign-up honour a safe, same-origin return path (cookie or `?next=`; no open redirect), and sign-up's return happens after onboarding.

## Do
1. DB tests: the CHECK (both or neither sender rejected), existing proposal service and suggestions tests still pass with a nullable token, admin pages tolerate a coach-sent proposal.
2. Invite and link lib + route tests: expiry, revoked, reused, unknown, self, already linked, hash-only storage, scoping (can't revoke or end someone else's), ending leaves pending proposals pending, rate limits.
3. Component tests: Coaching page (coach and trainee views, Copy, End confirm), invite page states, return path (incl. a rejected `//evil.com`).
4. Lock new files (`chmod a-w`) and run a break matrix in small batches.

## Done when
New tests fail on this branch for the right reason; existing tests still pass; break matrix recorded.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet to the lead with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-06 CST: created; confirmed by Dustin; dispatched to new agent test-builder (worktree1).
- 2026-11-06 CST: back; lead re-ran (47 red / 27 pass of 74, as reported). Lead decided: Copy only at creation (hash-only token, like agent tokens); Coaching row in the Account block. Spec amended. Contract for build 138; accepted with the slice on Dustin's preview.
- 2026-11-06 CST: Dustin on the phone preview: "that all works". Accepted.
