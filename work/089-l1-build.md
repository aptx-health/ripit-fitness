---
id: 089
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L1 build: shared logger pieces

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/logger-shared` (from origin/dev; gh stack bottom).

## Read
- `initiatives/ui-audit/spec.md` → "Workout screen (logger) build" and "L1"; `features/ui-audit/logger-confirm.feature`.
- The 088 tests (read-only; interface pinned in the file headers): `__tests__/components/logger-confirm*.test.tsx`, and `work/088-handback.md`.
- `initiatives/ui-audit/docs/logger-audit/README.md` (S1–S5 and Modals) with its screenshots; the ideas pages for the visual language.

## Do
Build L1 as the spec says. Notes: `AdHocLoggerView` is `components/adhoc/AdHocLoggerView.tsx`; use "1 set" / "1 min" singular forms; `LoggerConfirm` must remember and restore the opener's focus itself. Also do the items 088 didn't cover (header bevels → tokens, one `bg-background` surface, 48px stopwatch dismiss, "First time logging this" hides once a set is logged) and add a test for the last one. Touch-emulated 390px screenshots, light and dark, of each confirm, the actions menu and the logger header (before/after) into `initiatives/ui-audit/docs/assets/089/`. Own port; leave data as found. Don't commit.

## Done when
Spec "Done when".

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after 088; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: handback: done, green. 090 review dispatched.
- 2026-11-01 MDT: Dustin on phone preview: "Ok that's better". Accepted.
