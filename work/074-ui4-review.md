---
id: 074
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI4 review: Browse and program detail

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-browse` (uncommitted). Review only; no app code changes.

## Read
`initiatives/ui-audit/spec.md` → shared rules, "UI4" and the 072 carry-overs; the audit's Browse / My Programs / Program detail sections and screenshots; the diff. First pass **before** reading `work/073-handback.md`.

## Check
- Spec met; every Browse action still works (add, locked add, unpublish, cloning progress, limit modal, level filter, request a program, paging if reachable); My Programs actions (open, activate, create); program detail (week arrows, start/complete day, complete week, history toggle).
- Did anything useful to a user get dropped from Browse cards? Say what, and whether it should come back.
- Touch targets 48px everywhere touched.
- Suite, `npx tsc --noEmit`, eslint/biome on touched files.
- **Touch-emulated 390px screenshots**, light and dark: Browse top and scrolled, filtered-empty, My Programs, program detail week and history. Compare with Training. Own port, worktree2's DB, leave data as found.

## Hand back
Verdict, findings ranked, Not verified. Screenshots under `initiatives/ui-audit/docs/assets/074/`. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to reviewer (wF:p3).
- 2026-11-01 MDT: approve; follow-ups 1–5 sent as 075.
