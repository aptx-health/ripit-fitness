---
id: 167
state: ready
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
---
# iOS import: survive sets the web deleted and renumbered

Branch `feature/ios-skeleton`, lead worktree. Size: small.

## Read
`work/162-handback.md`, finding 1 under the 164 re-check. Repro file: `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/63d03f56-5ac0-462c-ab31-d70b9d53b0e3/scratchpad/164/renumbered.json`.

## Do
For a completion that came from a file, the file is the truth for its file-origin sets. Delete file-origin sets that the file no longer lists. Then update set numbers in two passes (for example, move them to temporary negative numbers first), so `UNIQUE(completionId, exerciseId, setNumber)` never trips. Phone-origin sets are never deleted. If a phone set and a file set collide on number, keep both and renumber the phone set after the file's sets. Count deletions in the summary ("removed 1").

## Done when
`mise run ios-check` passes (124 tests unchanged) plus new tests: the renumbered file imports, the deleted set is gone and numbers are 1..n, and a phone-logged set in the same session survives.

## Hand back
The `handoff-implementer` packet, first line `Report: ...`, sent to wX:p1. Commit your paths only. Don't run rm.

## Log
- 2026-11-07 CST: created from the 164 re-check (should-fix).
