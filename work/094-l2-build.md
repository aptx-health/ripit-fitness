---
id: 094
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L2 build: one bottom bar

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/logger-bottom-bar`.

## Read
`initiatives/ui-audit/spec.md` → "L2" and the 090 carry-overs; `features/ui-audit/logger-bottom-bar.feature`; the 093 tests (read-only; interface pinned in the headers) and `work/093-handback.md`. The look: `git show origin/docs/ui-audit-logger-notes:initiatives/ui-audit/docs/logger-audit/ideas/bb-a-light.png > <scratch>` (also `bb-a-done-*`, `bb-a-dark`), and the audit README's Bottom bar section the same way.

## Do
Build L2 as the spec and tests say. Delete `ExerciseActionsFooter.tsx` and `FollowAlongFooter.tsx` once unused. Decide sensibly what's unpinned (bar while an input is expanded; banner after "+ Extra set"; filled vs outline "Next exercise" after the last set; match the bb-a-done mockup) and say what you chose. Touch-emulated 390px screenshots, light and dark, before/after: program logger mid-exercise, after the last set (not last and last exercise), follow-along, freestyle empty and with an exercise, into `initiatives/ui-audit/docs/assets/094/`. Own port; leave data as found (note: a freestyle "Push A" draft may exist from Dustin's preview; leave it alone). Don't commit.

## Done when
Spec "Done when".

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after 093; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: further handoff (usage limit), then resumed by the same agent; still running.
- 2026-11-01 MDT: handback: done, green. 095 review dispatched.
- 2026-11-01 MDT: Dustin on phone preview: "Ok looks great". Accepted.
