---
id: 050
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (asked for 3 rough mockups)
updated: 2026-10-31
---
# Mockups: Training page visual hierarchy (3 directions)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/coach-suggestions`. Make no changes to app code. Only add files under `initiatives/training-library/docs/mockups/050/`.

## Goal
Dustin looked at the Training page on his phone (TL1–TL5a). Everything works, but it reads as "a big list with little headers". He doesn't know where to look first or what he's trying to get to. The hierarchy needs work, without getting busy.

He wants **3 rough mockups** to choose a direction from. In his words:
- **Section headers** ("UP NEXT", "CURRENT PROGRAM" and so on) are too small. He'd like them to look more like tabs, e.g. a tab on an envelope or folder. Something like the Library's tabs (`components/library/LibraryView.tsx`, `SegmentedControl`) is also fine.
- **The suggestion card** under "Coach Suggestions · 3 / View Suggestions" doesn't show that it's a suggestion. It just says "Review". Make it obvious that it was suggested by the coach and is waiting on him.
- Fix the overall hierarchy, but keep it calm.

## Do
1. **Look at today's page.**
   - Read `components/training/TrainingHome.tsx`, plus the screenshots in `initiatives/training-library/docs/assets/048/` and `045/`.
   - Read the theme: `app/globals.css` (the DOOM tokens, fonts, `doom-*` classes), `DESIGN.md` if present, and the Library's tabs.
2. **Make 3 distinct directions,** not 3 tweaks of one idea. Each must still have the same sections in the same order:
   1. Coach Suggestions (3 pending: a workout, a program and a target change)
   2. Up Next
   3. Pinned Workouts (2)
   4. Recent Workouts (3)
   5. Current Program

   Ideas to spread across them:
   - folder or envelope tab headers;
   - one hero card with quieter sections below;
   - grouped "Do now" and "Your stuff" zones;
   - collapsible sections;
   - different weights for primary and secondary sections.

   Each direction must make the suggestion card clearly "from your coach", with a type and a pending state.
3. **Build each as one static HTML file** at 390px wide (`mockup-a.html`, `-b`, `-c`).
   - Use the app's real colours, fonts and border styles (copy the CSS variables you need), with realistic data.
   - Include the bottom nav, so it looks like the app.
   - Rough is fine: no JS needed.
4. **Screenshot each** at 390px, full page, @2x (`mockup-a.png` and so on), with Chrome if it's connected, otherwise Playwright. Also add `current.png`, today's page, for comparison: reuse `assets/048/training-suggestions-many.png`.
5. **Write `README.md`** in the same folder. For each direction give:
   - a name;
   - 2–3 sentences on the idea;
   - what it does for the headers, the suggestion card and the hierarchy;
   - one trade-off.

   End with your recommendation.

## Done when
- The 3 HTML files, the 3 PNGs, `current.png` and `README.md` exist in `initiatives/training-library/docs/mockups/050/`.
- The directions are clearly different.
- No app code has changed.

## Hand back
A short packet with the folder path, one line per direction, and your recommendation. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created at Dustin's request after the TL5a preview; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: 3 mockups in docs/mockups/050 (A folder tabs, recommended; B hero + quiet lists; C do now/your stuff). Published to Handoff Hub (ripit-fitness/training-mockups-050). Waiting on Dustin's pick.
- 2026-10-31 MDT: Dustin picked A (folder tabs): "the most modest one but it looks the best". Accepted.
