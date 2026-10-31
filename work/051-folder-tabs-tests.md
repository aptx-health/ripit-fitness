---
id: 051
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (picked mockup A)
updated: 2026-10-31
---
# Tests: TL6 Training folder tabs (text and structure only)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-folder-tabs`, stacked on TL5a (#1010). Don't commit.

## Goal
TL6 restyles the Training home to match mockup A. Read:
- the TL6 section of `initiatives/training-library/docs/spec.md`;
- the mockup, `docs/mockups/050/mockup-a.png` and `.html`.

Most of it is visual, and the reviewer judges that from screenshots. Your job is to keep the locked tests true to the new text and structure.

## Do
1. **Update the locked view tests that pin the old headings or text** (e.g. "Coach Suggestions · N", "Recent Workouts", "Pinned Workouts", "Review", the Current Program lines) to the spec's new strings. Files to check:
   - `training-home-view.test.tsx`
   - `pinned-workouts-view.test.tsx`
   - `suggestions-view.test.tsx`
   - and any steps files that assert rendered text.

   List each change.
2. **Add tests for:**
   - the exact `h2` headings;
   - count chips and their accessible labels;
   - the coach "See all" link to `/suggestions`, and Pinned's to `/library?type=workouts`;
   - "Your coach suggests", "Waiting on you", the kind chip and the "Review suggestion" link;
   - the meta line ("N exercises" for workouts);
   - the other suggestions as rows linking to their review screens;
   - the Current Program row ("Week X of Y · N of M workouts done", View, the progress bar);
   - that the section order and empty-home rules still hold.

   Don't assert classes or colours.
3. **Lock the files,** and run a small break matrix on the new assertions.

## Done when
The tests are red only for the missing TL6 markup, and all other files pass.

## Hand back
A short `handoff-test-builder` packet. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: 45 new tests plus text updates in 6 locked files; 34/34 breaks killed. Lead: a workout change gets no exercise count (confirmed). The .feature step wording is left as is so the steps still match. Accepted.
