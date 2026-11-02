---
id: 091
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L1 fixes from review 090

Checkout: worktree2, branch `feature/logger-shared`. Read `work/090-handback.md`.

## Do
1. `LoggerConfirm`: the secondary button is disabled while `busy`. Add a test (new file; 088 files stay read-only).
2. Complete summary: under a minute reads "under 1 min" (both loggers); add a test.
3. Header (`ExerciseLoggingHeader`): Finish, Exit and Edit workout plan at 48px tall, keeping the bar compact (say how).

Screenshot the header and the Complete confirm (light, dark) into `initiatives/ui-audit/docs/assets/091/`. Don't commit.

## Done when
Suite, tsc, eslint/biome on touched files pass.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 090 findings 1–3 (header part); dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; lead accepts secondaryDisabled instead of busy (locked test). Phone preview next.
- 2026-11-01 MDT: Dustin on phone preview: "Ok that's better". Accepted.
