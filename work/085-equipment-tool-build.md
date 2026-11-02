---
id: 085
state: review
waiting_on:
executor: scroll-shell
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("yes kick that mcp task off")
updated: 2026-11-01
---
# Agent tools: get_equipment (build)

Checkout: `~/projects/worktrees/ripit-fitness/worktree4`, branch `feature/agent-equipment` (npm ci and prisma generate already done). Lead files are in worktree2.

## Read
`worktree2/work/084-equipment-tool-tests.md` (goal) and `084-handback.md`; `features/agent-tools/equipment.feature`; the locked test `__tests__/features/agent-tools/equipment.test.ts` (shape pinned at the top); `lib/mcp/tools.ts` (`get_anchors`, `get_balance_targets`), `lib/user-training-profile.ts`, `lib/equipment-availability.ts`.

## Do
Add `get_equipment` to `lib/mcp/tools.ts`: input schema, a clear description (say what `isSet: false` means), handler, `readOnlyHint`. Reuse the existing normalisers; don't duplicate logic. If there's MCP tool documentation (e.g. a tools list in docs/ or AGENTS.md), add it there. Don't commit.

## Done when
The 084 tests pass, plus the full suite, tsc, and eslint/biome on touched files.

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after 084; dispatched to scroll-shell (wF:p5).
- 2026-11-01 MDT: handback: done, green. 086 review dispatched.
