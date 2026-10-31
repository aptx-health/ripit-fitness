---
id: 041
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Tests: TL3 Library (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/library`. This branch is stacked on `feature/training-home` (TL2, PR #1007), which is stacked on TL1 (#1006). Don't commit.

## Goal
Write the tests TL3 will be judged against, before it is built. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL3 Library");
- the behaviour, `features/training-library/library.feature`;
- the code map, `work/034-handback.md` §1: `/programs`, `ConsolidatedProgramsView`, `MyProgramsList`, `/workouts/saved`, nav and links;
- the existing seams from TL1 and TL2, in `work/035-handback.md` and `work/038-handback.md`.

## Do
1. **Choose seams and name them precisely** for the implementer. For example:
   - the Library view rendered with Testing Library, given its data and search params;
   - the redirect targets for `/programs`, `/workouts/saved` and `/community`, as pure functions, as in TL1;
   - the My Programs list's ordering, badge and "Week X of Y";
   - the `isTabActive` rule.
2. **Update the existing locked tests that TL3 changes on purpose:**
   - `nav-active-tab.test.tsx`: Library replaces Programs, and `/library/programs/*` highlights Library, not Training;
   - the TL1 and TL2 assertions on the detail back link, or on `/programs` hrefs such as "Find a program".

   List each one you change.
3. **Write the tests.** Cover every scenario as steps, plus edges:
   - the default type is Programs;
   - an unknown `type` is treated as Programs;
   - `tab` and `cloning` survive the redirect;
   - a first-time user lands on Browse;
   - the active entry is first with "Week X of Y";
   - VIEW links to the detail page;
   - there's no create action or Browse on Workouts;
   - the old strip is gone.
4. **Lock the files read-only.**
5. **Prove the tests can fail** with the break matrix.

## Done when
- Every scenario is covered.
- The tests are red only for missing TL2 code.
- Every other test file still passes, apart from the ones you deliberately updated, which go red only for missing TL3 code.
- The breaks are killed.

## Don't touch
- Non-test code.
- `work/`, `STATE.md`, status files.

## Hand back
The `handoff-test-builder` packet, with the seams spelled out. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: handback saved. Lead re-ran full suite: 86 failed (all TL3-missing) / 1858 passed. 49/49 breaks killed. Accepted.
