---
id: 063
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI1 review: shared folder pieces

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-shared` (uncommitted working tree). Review only; don't change app code.

## Read
`initiatives/ui-audit/spec.md` (UI1, plus the lint baseline note), `features/ui-audit/shared-folder-pieces.feature`, the 061 tests, and the diff (`git diff` + untracked files under `components/`, `app/`, `docs/`, `middleware.ts`). Do your first pass **before** reading `work/062-handback.md`.

## Check
- Every scenario is really covered and the code meets the spec; the tests weren't weakened (they're read-only).
- Run the full suite, `npx tsc --noEmit`, and eslint on the changed files.
- **Screenshots at 390px** (Chrome first, Playwright fallback): Training in light and dark, plus keyboard focus on a tab; confirm it looks as before (compare with `initiatives/ui-audit/docs/assets/062/`). Load `/sw.js` and `/site.webmanifest` signed out.
- Code quality: is `PaperTabs` a clean, reusable piece for UI3 (Library, URL-controlled)? Is `SubpageHeader` ready for UI6?
- Stop the server and DB when done.

## Hand back
Verdict (approve / changes needed), findings ranked, Not verified. Screenshots under `initiatives/ui-audit/docs/assets/063/`. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to reviewer (wF:p3).
- 2026-11-01 MDT: approve with 3 small findings; lead sends 1–3 back to the implementer (064) before Dustin's preview.
