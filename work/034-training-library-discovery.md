---
id: 034
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative; he reviews each UI item on a phone preview instead)
updated: 2026-10-31
---
# Discovery: Training + Library redesign

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-library` (fresh from dev). Read-only: change no files.

## Goal
Restructure the app so Training is the day-to-day home and a Library (workouts + programs) replaces the Programs tab. Read, in this order:
- `initiatives/training-library/docs/decisions.md`: Dustin's answers. These win over the handoff.
- `initiatives/training-library/docs/design-handoff.md`: the design.
- The TL1–TL5 lines under Next in `ROADMAP.md`.

Map what the lead needs to spec and size TL1–TL5, and propose how to cut them into PRs.

## Do
1. **Today's screens, with `file:line`:**
   - `/training` (`app/(app)/training/page.tsx` and the components under it): what it renders with and without an active program, its data loading, and what would move into a Program Detail screen for TL1.
   - What `/programs/[id]` already is, and whether Program Detail should live there or at a new route.
   - `/programs` (`ConsolidatedProgramsView` and similar): the active-program card, My/Browse tabs, and create action.
   - `/workouts/saved`.
   - `BottomNav`, `Header`, `QuickActionSheet` (center Workout button), and every link to `/programs`, `/training` or `/workouts/saved`.
2. **Training home data (TL2):**
   - How to find "Up Next" (the next program day) and a program's progress (week X of Y, N of M workouts).
   - Recent completions, with name, date and duration, for both ad-hoc and program sessions.
   - What "Repeat as a freeform copy" can reuse: the saved-workout start route, ad-hoc start, the one-draft-per-user rule.
3. **Pinning (TL4):** the smallest schema change (e.g. `SavedWorkout.pinnedAt DateTime?` plus an index) and the routes to touch.
4. **Suggestions for users (TL5):**
   - What is editor-gated today: the admin proposals pages, `/api/admin/proposals*`, `lib/proposals/service.ts` approve and reject.
   - What a user-facing accept and reject would reuse, with ownership checks so a user only sees their own proposals.
   - How each allowed kind could be shown to a non-admin: saved workout, program, anchors, balance targets.
   - How to offer "Make it active?" after a program is accepted.
   - Whether the Discord and Bark notify paths need changes when non-editors get proposals.
5. **PR cuts:** propose the cuts and their order, the risky parts, and existing tests (unit, BDD, e2e) that will break when screens move.
6. Check the local dev DB read-only if useful (`fitcsv-postgres-wt2`, port 5435; start it and stop it after).
7. Give at most 3 open choices, each with your recommendation and why; the lead decides.

## Done when
The packet covers 1–7, labels each claim FACT, INFERENCE or NOT VERIFIED, and cites `file:line`.

## Don't touch
Any file. No staging or prod.

## Hand back
The discovery skill's scoping note. First line: `Report: complete | needs decision | further handoff`. SendMessage the lead (`lead-ripit-mcp`) when done.

## Log
- 2026-10-31 MDT: created; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: handback saved (034-handback.md). Report: needs decision. Lead decides C (URL /library) and the smaller points; A, B and the program limit go to Dustin.
- 2026-10-31 MDT: Dustin answered A (view-only), B (user token screen in TL5), cap (suggestions may exceed). Decisions in docs/decisions.md. Accepted by the lead.
