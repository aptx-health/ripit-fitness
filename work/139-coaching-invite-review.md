---
id: 139
state: accepted
waiting_on:
executor: coach-review
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin (slice 1 plan)
updated: 2026-11-06
---
# Coaching slice 1: review

Checkout: worktree1, branch `feature/coaching-invite` (uncommitted; `git diff origin/dev` plus untracked files is the change). Read-only except your report and screenshots.

## First pass: before reading any handback
Read only `features/coaching/invite-link.feature`, `initiatives/coaching/docs/136-discovery.md` and the code. Judge it against the spec and AGENTS.md conventions. Focus on:
- Security: invite tokens (hash only, single use, expiry, race on accept), scoping of every coaching route and query, the return path through sign-in, sign-up, onboarding, OAuth and the waiver (open redirects), rate limits, error logging.
- The Proposal schema change: CHECK migration, admin pages and `/suggestions` with a null token, nothing else that assumed a token (grep `agentToken`).
- Migration safety: the hand-written migration matches the schema, and applies cleanly to a DB that has the old schema.
- UI: Settings → Coaching and `/coach/invite/[token]` at 390px in light, dark and E-INK; 48px targets; matches the Settings and auth pages.
- Run a real browser flow if you can (Playwright, `webapp-testing` skill): a new user opens an invite, signs up, goes through onboarding and the waiver, lands back on the invite, accepts. Use local test users only; no real emails or webhooks.
- `perf-check` skill: `npm run perf:scan -- --changed origin/dev`, and `npm run perf:tap` on a production build for the Coaching page and the invite page.

## Second pass
Then read `work/137-handback.md` and `work/138-handback.md` and check their claims and "Not verified" items.

## Hand back
Findings ranked by severity, each with file:line and a failure scenario; a verdict (ship / fix first); screenshots in `initiatives/coaching/docs/assets/139/`. First line `Report: complete | needs decision | further handoff`. Don't edit code, `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-06 CST: created; dispatched to new agent coach-review (worktree1).
- 2026-11-06 CST: back: ship after gate fix; display names need Dustin. Fixes item 143 next.
- 2026-11-06 CST: Dustin on the phone preview: "that all works". Accepted.
