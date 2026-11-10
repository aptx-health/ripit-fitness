---
id: 161
state: review
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-09 lead (review fixes inside the confirmed 158–160 scope; no new behaviour for Dustin to accept)
updated: 2026-11-09
---
# Fix 160 review findings (library MCP)

Checkout: worktree1, branch `feature/library-mcp`. Findings: `work/160-handback.md`. Commit nothing; the lead commits.
The reviewer's uncommitted test `__tests__/lib/library-merge-json.test.ts` and screenshots in `initiatives/agent-tools/docs/assets/160/` stay as they are.

## Do (all six)
1. Bans: merge replaces "from" with "into" in `UserTrainingProfile.bannedExerciseIds` (deduped); delete removes the id; usage gains a `bans` count (bans don't block delete). Tests.
2. Community merge renames: in programData, a sibling `name` equal to from.name becomes into.name; nested `exerciseDefinition` gets into's name (and aliases). Test.
3. Lock: `SELECT ... FOR UPDATE` on the definition row(s) at the start of applyDelete/applyMerge, before the usage re-check.
4. Search: aliases match by substring, case-insensitive. Test.
5. Approve confirm: warning above the buttons, with Cancel; fits at 390px above the bottom nav. Screenshot to `initiatives/agent-tools/docs/assets/161/`.
6. Revert of an applied create whose exercise is gone: refuse with not_found instead of marking reverted. Test.
Also check: pending proposals (saved_workout/program create) that reference a merged-away id fail clearly at approval rather than crashing; list what happens.

## Done when
Full `npx vitest run` passes; `npx tsc --noEmit` clean; tools.ts stays under 1000 lines.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-09 CST: lead chose to fix all review findings before merge (Dustin wants this in before prod). Dispatched to coach-impl (wE:pA).
- 2026-11-09 CST: back complete (suite 4591). Lead re-ran 98 library tests + tsc; screenshot checked. Committed.
