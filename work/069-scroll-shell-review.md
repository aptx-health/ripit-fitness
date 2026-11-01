---
id: 069
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("Ok yes" to the scroll-shell item)
updated: 2026-11-01
---
# Review: inner-scroll app shell (065)

Checkout: `~/projects/worktrees/ripit-fitness/worktree1`, branch `feature/ui-scroll-shell` (uncommitted; based on `feature/ui-shared`). Review only; no app code changes. Lead files are in worktree2.

## Read
`worktree2/initiatives/ui-audit/spec.md` → "UI1b", `worktree2/work/065-scroll-shell.md`, and the diff in worktree1. First pass **before** reading `worktree2/work/065-handback.md`. Dustin already checked it on his iPhone and the blur is gone.

## Check
- Every page in `(app)` still scrolls correctly on mobile: reset to top on navigation, back/forward position, sticky headers, the workout logger and its modals, dialogs/sheets (incl. Quick Actions), body scroll locks, infinite or paged lists, welcome page fade. Desktop (md+) unchanged.
- Anything else in the codebase still reading `window.scrollY`/`scrollTo` or listening to window scroll inside `(app)` that was missed.
- Suite, `npx tsc --noEmit`, eslint on changed files.
- 390px screenshots of a long page scrolled (e.g. `/learn`, a program detail, Settings) in `worktree1/initiatives/ui-audit/docs/assets/069/`. Use your own port and worktree1's DB.

## Hand back
Verdict, findings ranked, Not verified. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after Dustin's device check passed; dispatched to reviewer (wF:p3).
- 2026-11-01 MDT: approve; findings 1–2 to scroll-shell (070); 4 noted for Dustin.
