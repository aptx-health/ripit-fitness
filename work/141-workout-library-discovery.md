---
id: 141
state: accepted
waiting_on:
executor: coach-disco
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin (pain = clutter + finding; pinned + custom tags; fold in AI-workout sprawl)
updated: 2026-11-06
---
# Workout library: discovery

Checkout: worktree1 (branch `feature/coaching-invite`; test-builder is writing tests there, so touch nothing but your note). Read-only. Write your note to `initiatives/workout-library/docs/141-discovery.md`.

## Goal
Scope how saved workouts are kept tidy and easy to find, so the lead can write the spec and slices.

## Decided (Dustin, 2026-11-06)
- The pain is clutter and finding the right workout. Building and editing are not the focus.
- Organise with pinned (exists) plus the user's own tags.
- Include where AI-proposed and (soon) coach-sent workouts land, so they don't pile up. ROADMAP "Proposed workouts without sprawl" has the earlier idea (Start now / Plan for later, save as template on purpose, fold unused into Older) and its open questions.

## Find out
1. Today: `SavedWorkout` (`prisma/schema.prisma:208`), `components/features/saved-workouts/*`, `app/(app)/workouts/saved/page.tsx`, Library (`components/library/LibraryView.tsx`), Training pinned workouts, QuickActionSheet, WorkoutRollupModal. Every way a saved workout is created (save after a session, AI proposal, duplicate) and how the list is ordered and shown. Count how many a heavy user has (query the wt2 seed only if cheap; else say unknown).
2. Tags: data model (table vs string array), add/remove from the row or detail, filter chips, a few suggested tags vs free text, limits. Agents and coaches: should proposals carry tags; MCP read/write.
3. Clutter: what "unused" means (`lastUsedAt`), an Older/Archive fold vs auto-archive, one-off sessions saved by accident, bulk tidy.
4. AI and coach workouts: land in the list as normal, in a separate "Suggested"/"From coach" area until used, or start-now without saving. Recommend one; list the sprawl questions still open, phrased for Dustin.
5. Finding: search, sort, filter by tag, where it lives on Training vs Library, and the phone layout.

## Hand back
A scoping note: what exists (file:line), a recommended design, slices (smallest first, each shippable), and at most 3 questions for Dustin with recommendations. Use the `discovery` skill. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet to the lead with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-06 CST: created from Dustin's answers; dispatched to coach-disco (wE:p8).
- 2026-11-06 CST: back; note read by lead; three questions to Dustin.
- 2026-11-06 CST: Dustin: Older fold at 30 days, manual archive only; AI/coach workouts land in a New group until used; free-text tags, agents/coaches reuse existing ones. Accepted.
