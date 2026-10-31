---
id: 054
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (asked for a mockup before confirming)
updated: 2026-10-31
---
# Mockup: Training as three tabbed blocks

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`. Mockup only: no app code changes. Add files under `initiatives/training-library/docs/mockups/054/`.

## Goal
Dustin likes the paper folder tabs (TL6 / mockup A) and wants to consolidate Training into **three major blocks**. Each block has paper tabs, and when a block has more than one tab, the tabs switch what the block shows.

Order, top to bottom:
1. **Coach block:** the "From your coach" tab, plus the "See all" tab (dimmed green, as in the TL6 tweak). Content as in TL6: the kind chip, title, meta, quote and Review suggestion, then the other rows. Dustin said "Proposals", but users see "suggestions" and the tab says "From your coach". Keep that, and mention it in the README.
2. **Workouts block:** two side-by-side tabs, **"Pinned Workouts"** and **"Recent"**. The selected one is filled, the other is quieter. Pinned shows the pinned rows with Start; Recent shows the recent rows with Repeat. Include "See all" for Pinned if it fits, or say why not.
3. **Program block:** two side-by-side tabs, **"Up Next"** and **"Active Program"**.
   - Up Next is today's Up Next content: the program name, Week · Day, the workout and Start Workout.
   - Active Program is today's Current Program content: where you're at, "Week X of Y · N of M workouts done", the bar, and View, which opens the program.
   - **With no active program,** the block still shows, with a placeholder: "No active program", with a short line and a "Find a program" link to the Library's Browse.

## Do
1. **Start from your TL6 build and `mockup-a.html`.** Use the real tokens, Rajdhani, the clip-path tab shape and the bottom nav, with realistic data.
2. **Make one static HTML file per state,** each a full Training page at 390px:
   - `state-1.html`: 3 suggestions, with Pinned Workouts and Up Next selected.
   - `state-2.html`: the same data, with Recent and Active Program selected.
   - `state-3.html`: no suggestions and no active program. The coach block is hidden, Pinned Workouts is selected, and the Program block shows the placeholder.
3. **Screenshot each** at 390px, full page, @2x (`state-1.png` and so on). Also include `current.png`: the current TL6 build, from your latest screenshot.
4. **Write `README.md`:**
   - one line per state;
   - how the tab switching would work: client state, and whether the choice is remembered per user (e.g. in localStorage), with your recommendation;
   - the trade-offs, e.g. Recent and Active Program become one tap away;
   - any open questions for Dustin.

## Done when
- The 3 HTML files, the PNGs, `current.png` and `README.md` exist in `initiatives/training-library/docs/mockups/054/`.
- No app code has changed.

## Hand back
A short packet with the folder path and your recommendations. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created at Dustin's request; queued for implementer (wF:p2) after the TL6 tweak.
- 2026-10-31 MDT: the mockup is in docs/mockups/054 (3 states). Published to Handoff Hub (ripit-fitness/training-blocks-054). Waiting on Dustin.
- 2026-10-31 MDT: Dustin likes it. Changes: put the coach See all tab right beside "From your coach", only where it's needed (not on Workouts), with clearer wording; the lead chose "All suggestions". The other questions take the recommended answers (per-device memory, no Start on Active Program, keep "Pinned Workouts"). Accepted.
