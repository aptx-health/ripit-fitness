---
id: 163
state: ready
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal; lead runs the loops)
updated: 2026-11-07
---
# iOS slice 1: fixes after review 155

Branch `feature/ios-skeleton`, lead worktree. Size: small; write your own tests (new test files; locked tests stay unchanged).

## Read
`work/155-handback.md`, Findings 1-8, with file:line references.

## Do
1. Weight must be finite and between 0 and 2000 (lbs or kg). Enforce it in `AppDatabase.logSet` (throw a clear error) and in the UI. Add tests.
2. Search: treat punctuation as a space, and also match with spaces removed, so "BENCH-press!", "pull up", "t bar row" and "lockoff" all hit. Add tests for those cases.
3. Dynamic Type at AX sizes: the set entry row and history rows must stay usable (let them wrap or stack; no fixed widths).
4. Remove an exercise from an open workout (with its sets, behind a confirmation), and block finishing a workout with no logged sets ("Log a set first, or discard").
5. Select all text on focus in prefilled weight and reps fields.
6. Pluralize "1 exercise" on the resume card.
7. Debounce Log so fast taps make one set.
8. Decode thumbnails off the main thread.
Keep the per-set unit toggle (lead call). Notes 9-10 are noted for later; 160 already leaves system `imageUrls` alone (confirm that in your packet).

## Done when
`swift test --package-path ios/RipitCore --skip Program` passes, the simulator build passes, and you have screenshots for 3, 4 and 5.

## Don't touch
Locked tests, `work/`, `STATE.md`, `initiatives/`. Commit your paths only. programs-impl merges this branch into `feature/ios-programs`, so keep the changes tight.

## Hand back
The `handoff-implementer` packet, first line `Report: ...`, sent to wX:p1. Don't run rm.

## Log
- 2026-11-07 CST: created after review 155; lead answered the review questions: 1 = fix search, 2 = fix now, 3 = keep the per-set unit.
