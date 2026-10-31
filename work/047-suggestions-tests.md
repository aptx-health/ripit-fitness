---
id: 047
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Tests: TL5a Coach Suggestions (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/coach-suggestions`, stacked on TL4 (#1009) and the rest of the chain. Don't commit.

## Goal
Write the tests TL5a will be judged against, before it is built. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL5a Suggestions for users");
- the behaviour, `features/training-library/coach-suggestions.feature`;
- the code map, `work/034-handback.md` §4: the admin gating, `decision-route`, the service, the admin detail renderers, the cap;
- the existing seams in `work/038-handback.md` (`getTrainingHome`, `TrainingHome`);
- the agent-tools proposal tests under `__tests__/features/agent-tools/`, which show how proposals of each kind are seeded.

## Do
1. **Choose seams and name them precisely.** For example:
   - the four route handlers, called directly with mocked auth;
   - `getTrainingHome`'s `suggestions`;
   - the `TrainingHome` section;
   - the review screen, or its per-kind body components, rendered with Testing Library;
   - the accept flow's "Make it active?" step.

   Seed proposals through the real service or MCP tools, not raw rows, where that's cheap.
2. **Update any locked TL2 or TL4 test** that asserts the exact `getTrainingHome` shape, the section order or the empty-home rule. List each one you change.
3. **Write the tests.** Cover every scenario as steps, plus edges:
   - only pending and allowed kinds in the list, newest first;
   - 404 for hidden kinds, other users and unknown ids, on every route;
   - 409 when the suggestion isn't pending;
   - a conflict result;
   - the program accept response carries the program id;
   - Make active and Not now;
   - the cap is exceeded on purpose;
   - there's no revert route;
   - kind labels;
   - FAU and pattern display names, never keys;
   - the section is first and shows at most 3;
   - suggestions suppress the empty home;
   - `/suggestions*` highlights Training;
   - the UI says "Suggestion", never "Proposal".
4. **Lock the files read-only.**
5. **Prove the tests can fail** with the break matrix.

## Done when
- Every scenario is covered.
- The tests are red only for missing TL5a code.
- Every other test file still passes, apart from the ones you deliberately updated.
- The breaks are killed.

## Don't touch
- Non-test code.
- `work/`, `STATE.md`, status files.

## Hand back
The `handoff-test-builder` packet, with the seams spelled out. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: handback saved (153 tests + locked updates; 60/60 breaks). Lead confirmed response keys, reject→GET, 404. Accepted.
