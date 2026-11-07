Report: complete
142 workout library slice 1 (implementer, 2026-11-06). lib/saved-workouts/groups.ts (pinned / recent / older, lastUsedAt ?? createdAt, 30-day cutoff); SavedWorkoutsList renders Pinned, Recent, closed "Older (n)" fold (48px, aria-expanded); empty groups hidden; pin/unpin moves the row without a refetch. Tests: __tests__/lib/saved-workout-groups.test.ts, __tests__/components/saved-workouts-groups.test.tsx. Screenshots initiatives/workout-library/docs/assets/142/.
Lead amended two locked fixtures to relative dates (work 142). Suite 4172 pass; tsc clean; perf:scan: /settings no-loading (out of scope) + existing mount-fetch.
Decisions: Pinned newest pin first; redundant "Pinned" chip kept (locked test).
Not verified: no new test for Training/QuickActionSheet (unchanged).
Preview data: 11 synthetic saved workouts for synthetic-bodybuilder in the wt2 DB (removal one-liner in the packet: savedWorkout.deleteMany({where:{userId:'synthetic-bodybuilder'}})).
