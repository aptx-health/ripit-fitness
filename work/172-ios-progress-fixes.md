---
id: 172
state: ready
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal stretch: slice 4)
updated: 2026-11-07
---
# iOS slice 4: fixes after review 169

Branch `feature/ios-skeleton`, lead worktree. Size: small.

## Read
`work/169-handback.md`, Findings 1, 2, 3 and 5.

## Do
1. One rounding helper that rounds half up, like JS `toFixed(1)` and `Math.round` (including negative halves: -14.5 becomes -14). Use it for every displayed decimal and signed change in Progress. Add core tests for 3.25 → 3.3, 8.25 → 8.3 and -14.5 → -14. If the helper lives in the app target, move it to RipitCore so it can be tested.
2. At AX sizes, `CardRow` stacks the aside under the value, and labels never break mid-word.
3. Progress reloads when data changes (the store's `revision`), not only in `onAppear`.
4. The import result alert shows wherever the import was started (app level).
Lead answers: the lift page's Top set/Volume tabs and the programWeek line are deferred to the backlog.

## Done when
`mise run ios-check` passes with locked tests unchanged, plus an AX screenshot of the report card.

## Hand back
A short packet, first line `Report: ...`, sent to wX:p1. Commit your paths only. Don't run rm.

## Log
- 2026-11-07 CST: created after review 169 (Q1 b, Q2 b, Q3 a).
