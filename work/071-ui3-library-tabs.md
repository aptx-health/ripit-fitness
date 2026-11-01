---
id: 071
state: review
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI3: Library tabs and Workouts

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-library-tabs` (stacked on UI2).

## Read
`initiatives/ui-audit/spec.md` → shared rules and "UI3"; the audit's Library sections in `initiatives/ui-audit/docs/audit/README.md` with `02-*`, `03-*`, `04-*`, `05-*`, `06-*` screenshots; `components/library/LibraryView.tsx`, `SavedWorkoutRow.tsx`, `SavedWorkoutsList.tsx`, `SavedWorkoutDetailDialog.tsx`; `components/ui/PaperTabs.tsx`, `components/training/TrainingHome.tsx` (`EmptyLine`, Pinned rows).

## Do
Build UI3 as the spec says, with the tests it names. Before/after 390px screenshots (light, dark) into `initiatives/ui-audit/docs/assets/071/`. Use your own port; the phone preview (port 10000) may be running. Leave test data as you found it. Don't commit.

## Done when
Spec "Done when".

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to implementer (wF:p2). Test-builder skipped on purpose: mostly styling; the implementer adds URL-tab tests.
- 2026-11-01 MDT: handback: done, green. Lead accepts both choices (sr-only heading; unannounced chip). 072 review dispatched.
