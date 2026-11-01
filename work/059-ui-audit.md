---
id: 059
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (asked for this read-only audit directly)
updated: 2026-11-01
---
# UI audit: bring Library, Workout center and Settings up to the Training style

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-audit`. Read-only: **no app code changes.** Add files under `initiatives/ui-audit/docs/audit/` only.

## Goal
Dustin likes the new Training page: the paper folder tabs (`components/training/SectionTab.tsx`, `TabbedBlock.tsx`, `TrainingHome.tsx`) are organised and coherent. The other tabs now look older. He wants a **comprehensive list of things to update** so they match. His notes, in his words:
- **Library:** the tab layout (the `SegmentedControl` in `components/library/LibraryView.tsx`) is the old style and needs updating.
- **Library → Browse:** the program cards look OK but use the old **angled bracket** (clipped corner) format, which he likes less than the new tabs. Browse Programs could use some updating.
- **Library → My Programs:** the flat look is OK; probably fine as is.
- **Library → Workouts:** the same old angled bracket look; clean it up.
- **Workout center button (bottom nav, the Quick Actions sheet):** the same angled brackets; update them. **Remove the greyed out "Pick a Workout" / "Coming Soon" button.**
- **Settings:** clean it up and bring it up to the spec of the other three tabs.
- **Learning tab: out of scope.** It will be replaced.

## Do
1. **Learn the target style.** Read the Training components above, `app/globals.css` (tokens, `doom-*` classes), `docs/STYLING.md`, and `initiatives/training-library/docs/mockups/054/` (README and PNGs).
2. **Run the app.** From inside worktree2 run `.claude/skills/phone-preview/phone-preview.sh start` (in the background; 3–5 min build), then `status`. Log in as `dmays@test.com` / `password`. If a page is empty, seed through the app's UI or APIs, not by inserting rows. Stop it with `stop` when you're done.
3. **Screenshot every in-scope screen at 390px wide** (Chrome first, Playwright fallback; see `docs/PLAYWRIGHT_RECIPES.md`): Training (reference), Library (each tab, including Browse and a program detail), Workouts list and a workout detail, the Quick Actions sheet open, Settings (each section), plus any sub-pages you reach from those. Also check one light theme and one dark theme for anything theme-specific.
4. **Write `initiatives/ui-audit/docs/audit/README.md`:**
   - one section per page, with its screenshot(s);
   - each finding as one line: **what** looks off, **where** (file:line or component), **suggested fix** in the Training style, **size** (S/M/L), and **priority** (P1 = clashes visibly with Training; P2 = inconsistent; P3 = polish);
   - shared fixes (e.g. "replace the clipped-corner card with X everywhere") pulled out at the top, since one component change may fix several pages;
   - a proposed split into 3–6 build items, in a sensible order.
5. Note anything broken (not just style), like a layout bug or console error, in a separate "Bugs seen" list.

## Done when
- `initiatives/ui-audit/docs/audit/README.md` and its screenshots exist.
- Every page Dustin named is covered, and Learning is not.
- The preview is stopped and no app code has changed.

## Hand back
A short packet: the folder path, the top 5 findings, and the proposed build items. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created at Dustin's request; read-only, so his request counts as confirmation.
- 2026-11-01 MDT: dispatched to reviewer (wF:p3).
- 2026-11-01 MDT: handback received; README + screenshots exist, no app code changed. Review: waiting on Dustin to pick build items.
- 2026-11-01 MDT: Dustin: do all of them, blur fix included. Accepted.
