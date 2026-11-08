---
id: 136
state: accepted
waiting_on:
executor: coach-disco
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin (invite link; coach sees only what he sent; delivery as proposals)
updated: 2026-11-06
---
# Coaching: discovery

Checkout: worktree1, detached at origin/dev. Read-only: no code changes. Write your note to `initiatives/coaching/docs/136-discovery.md` in worktree1 (the lead copies it over).

## Goal
Scope a coaching feature so the lead can write the spec and slices. Dustin's friend is new to lifting. Dustin wants to build programs and workouts on his side and send them to the friend as proposals.

## Decided (Dustin, 2026-11-06)
- Connect by an invite link the coach makes; the trainee signs up or signs in and accepts. Either side can end it.
- The coach sees only what he sent and what became of it (pending / approved / declined; maybe started). Not the trainee's logs or Progress.
- Programs and workouts arrive as proposals on the existing review screen, labelled with the coach's name. Approving adds the trainee's own copy.

## Find out
1. Proposals today: `Proposal` in `prisma/schema.prisma` needs an `agentTokenId`; `lib/proposals/`, the MCP tools (`propose_program_create`, `propose_workout_create`), the user review screen, admin pages, Discord notify. What has to change so a person, not an agent token, is the sender? Options and trade-offs (nullable token + `fromUserId`, a separate table, a coach agent token), and which reuses most.
2. "Coach suggestions for users" from the Training + Library redesign (STATE Recently completed): what it is, and whether coaching should build on it or stays separate.
3. Authoring on the coach's side: can Dustin build in his own Library and "Send to <trainee>" (snapshot of his program or saved workout into the proposal payload)? What the payload must carry (custom exercises he made that the trainee doesn't have, equipment, planned sets / targets, units).
4. Invite and link model: tables, invite tokens and expiry, sign-up flow from an invite (is sign-up open today?), ending the link, rate limits. One trainee now; don't block several later.
5. What the trainee sees: where proposals show up for a new lifter, notification (in-app badge; push or email exists?), and what "approve" does for a program vs a workout.
6. What the coach sees: a Coaching page or block (trainees, what was sent, status). Where it fits in Settings / Training.
7. Privacy and auth risks: scoping every query to the link, what a removed link does to pending proposals.

## Hand back
A scoping note: what exists (with file:line), a recommended design with the reuse choice for 1, proposed slices (smallest first, each shippable), and at most 3 questions for Dustin with your recommendation. Use the `discovery` skill. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`.

## Log
- 2026-11-06 CST: created from Dustin's answers; dispatched to new agent coach-disco (worktree1).
- 2026-11-06 CST: back; note read by lead. Three questions to Dustin; lead decides "started" = no (follows his "only what I sent").
- 2026-11-06 CST: Dustin answered: refuse custom exercises (name them); ending a link leaves pending items for the trainee; carry supersets in programInput. Accepted.
