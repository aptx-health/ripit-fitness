---
id: 081
state: accepted
waiting_on:
executor: logger-audit (new agent)
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (asked for this read-only audit and ideas directly)
updated: 2026-11-01
---
# Audit + ideas: the workout logger screen and its modals

Checkout for running the app: `~/projects/worktrees/ripit-fitness/worktree1`, detached at `origin/feature/ui-settings` (the UI audit stack so far). Read-only: **no app code changes.** Write everything under `~/projects/worktrees/ripit-fitness/worktree2/initiatives/ui-audit/docs/logger-audit/` (the lead's checkout; touch nothing else there).

## Goal
The rest of the app now has a "folder" look: paper tabs on bordered boxes, plain rows, filled chips, outline buttons (see `components/ui/PaperTabs.tsx`, `PaperTabTitle.tsx`, `components/training/TrainingHome.tsx`, `docs/STYLING.md` → "Folder blocks"). Dustin says the **workout screen** (where you log a workout) reads flat and simplistic next to it. He thinks it's not bad, but there's low-hanging fruit. In his words:
- the **workout plan sidebar/drawer** you pull up to see the plan "definitely shows some age and wear";
- the **tab bar** could look more modern;
- the **bottom bar buttons** could look more modern and sleeker;
- also look at the modals around starting a workout: the saved-workout detail ("look at this workout") and "Start this workout" (partly redone in UI3), plus the logger's own dialogs (complete, exit, delete set, rest stopwatch, exercise actions, plan editor).

## Do
1. **Run the app** in worktree1: start Postgres for that worktree and a dev server on a free port (not 10000, not 3201); see `.claude/skills/phone-preview/phone-preview.sh` for how the DB slot and env are set up, or `docs/PLAYWRIGHT_RECIPES.md`. Log in as `dmays@test.com` / `password`. Start a workout (from a program day and a freestyle one), log a set or two, open every drawer/modal; then **discard or clean up** so data ends as you found it (note counts first).
2. **Screenshot at 390px, touch-emulated** (Chrome first, Playwright fallback), light and dark: the logger in full mode and follow-along mode, the plan drawer, the tab bar, the bottom bar, each modal. Training and Library for comparison.
3. **Read the code:** `components/workout-logging/**`, the logger page(s) under `app/(app)/training/**`, `components/features/training/**`.
4. **Write `README.md`:** findings per area (what / where file:line / suggested fix in the folder style / size S-M-L / priority), shared fixes first, then a proposed split into 2–4 build items.
5. **Ideas:** for the three areas Dustin named (plan drawer, tab bar, bottom bar), make **2–3 rough directions each** as static HTML at 390px using the app's real tokens and fonts (`app/globals.css`), screenshot them, and recommend one per area. Rough is fine; they must look like the app.

## Done when
README, screenshots and the idea mockups exist in `logger-audit/`; data is back to how you found it; servers and DB stopped; no app code changed.

## Hand back
A short packet: folder path, top 5 findings, your recommended direction per area, proposed build items. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created at Dustin's request; read-only. A new agent with little context, per Dustin. Runs in worktree1 so it doesn't collide with UI6 in worktree2.
- 2026-11-01 MDT: back; published Handoff Hub ripit-fitness/logger-ideas-081. Waiting on Dustin's picks.
- 2026-11-01 MDT: Dustin picked A for all three (bottom bar, tab bar, plan drawer): "the recommended (heavy alterations) setup". Accepted.
