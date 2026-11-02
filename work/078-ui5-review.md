---
id: 078
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI5 review: Settings main page

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-settings` (uncommitted). Review only; no app code changes.

## Read
`initiatives/ui-audit/spec.md` → shared rules, "UI5", 075 carry-overs; `features/ui-audit/settings-page.feature`; the 076 tests; the diff. First pass **before** reading `work/077-handback.md`.

## Check
- Spec met; the 076 tests not weakened (read-only, check mtimes vs the 076 handback).
- Every setting saves and reloads; loading never saves; Change password works (try a wrong current password only; don't actually change it); Sign out works; theme picker and mode toggle work; Admin block for admin/editor only (check the role helper matches the spec).
- The "Connected sign-in methods" change is right for a password user and a Google user (inspect the API and component; don't create real OAuth links).
- The shared popover change doesn't break its other callers (open each one if reachable).
- Suite, tsc, eslint/biome on touched files; `/settings` 200 with no server error in a production build (`.next` already holds one; rebuild if stale).
- Touch-emulated 390px screenshots, light and dark, admin and plain user (create and delete a temp user if needed). Compare with Training.

## Hand back
Verdict, findings ranked, Not verified. Screenshots under `initiatives/ui-audit/docs/assets/078/`. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to reviewer (wF:p3).
- 2026-11-01 MDT: approve; findings 1–4 sent as 079.
