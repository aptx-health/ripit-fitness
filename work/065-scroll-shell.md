---
id: 065
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("Ok yes" to trying the inner-scroll shell as its own item)
updated: 2026-11-01
---
# UI1b: inner-scroll app shell to stop the iOS top blur

Checkout: `~/projects/worktrees/ripit-fitness/worktree1`, branch `feature/ui-scroll-shell` (based on `feature/ui-shared`, PR #1014; a separate PR, not part of the style stack). The lead's files (`work/`, `initiatives/`, `STATE.md`) live in worktree2: read them there.

## Read
- `~/projects/worktrees/ripit-fitness/worktree2/initiatives/ui-audit/spec.md` → "UI1b".
- `worktree2/initiatives/ui-audit/docs/2026-11-01-ios-pwa-top-blur.md` and the last lines of `initiatives/ui-audit/status.md`.
- Collie's installed build for reference (read only): `~/.local/share/collie/versions/1.23.4/web/dist/` (look for `--app-h` and `overflow-y-auto` in `assets/index-*.js`).
- `app/(app)/layout.tsx`, the bottom nav, and grep for `window.scrollTo`, `scrollIntoView`, `window.scrollY`, `sticky`, `addEventListener('scroll'`.

## Notes from the first look (implementer, before the move)
- Window-scroll dependencies in (app): `welcome/page.tsx:114-119`, `CommunityProgramsView.tsx:109`, `GoalsWizard.tsx:59,67`; body-overflow locks in `WorkoutPlanEditor.tsx:76` and `WorkoutRollupModal.tsx:177`.
- Collie sets `--app-h` to `100dvh`, and in iOS standalone to `min(100lvh, calc(100dvh + env(safe-area-inset-top)))`.
- The phone preview uses port 10000 for whichever worktree runs it; only one at a time. Don't start it; the lead does.

## Do
Build the shell as the spec says. Add tests where behaviour is testable (e.g. the inner container resets to top on route change). Take before/after 390px screenshots of Training, Library, a workout in the logger, and Settings into `worktree1/initiatives/ui-audit/docs/assets/065/` (they'll ship in this branch). List every place that relied on window scrolling and what you did about it. Don't commit.

## Done when
Spec "Done when", except Dustin's device check (the lead runs the phone preview).

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after Dustin still saw the blur on the UI1 preview; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: Dustin: run the scroll fix in its own worktree, apart from the style stack. Moved to worktree1 (branch feature/ui-scroll-shell from origin/feature/ui-shared) and a new agent `scroll-shell`; implementer stopped (no changes made).
- 2026-11-01 MDT: handback: done, green. Device check first (phone preview from worktree1), then reviewer.
- 2026-11-01 MDT: Dustin's device check passed ("looks good in preview"). 069 review next.
- 2026-11-01 MDT: committed 1aa44d33, PR #1015 (base feature/ui-shared). Accepted on Dustin's device check.
