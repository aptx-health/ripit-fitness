Report: complete

Verdict
All 17 scenarios now have tests: 32 step tests in a new steps file. On this branch they fail only
because the five tools don't exist yet. They pass against a correct throwaway version of the feature
(a "fake") and fail against each of 32 deliberately broken versions.

Verified
• New file on the current branch: 32 failed. Each failure is an unknown tool, a missing proposal or
  a missing label. None are setup errors.
• Same file against the correct fake: 85/85 passed. 32 broken versions, each run on its target tests
  after one full-file baseline: all 32 caught.
• I changed one expected value (logged sets 5→6) and exactly that test failed. The value is
  restored.
• Full suite: 197 files pass. Only the new file fails (32 of 4,543 tests).

Not verified
• UI: the hidden Revert button and the "can't be undone" confirm on the admin page. Check these in
  the 160 review.
• Rate limit: the test checks that library tools use the same per-token limiter as
  propose_exercise_create, and that a refused call creates nothing. The route already rate-limits
  every tool, so this test only catches a tool that skips it.
• Merge leftovers: the tests don't check Exercise.name or anchors
  (UserTrainingProfile.targetMovements) after a merge.

Needs a call
• spec.md has no library section. The contract is pinned in the test file's header: tool arguments,
  usage keys, isSystem/ownerId, labels and log fields. I recommend the lead copy it into spec.md.
• "Unused" counts pins and preferences, so deleting an exercise that is only pinned or only has a
  preference is refused. Is that right?
• Should a merge also update anchors that point at the old exercise? I recommend yes, but it's
  outside 158.

Assumptions
• Admin search includes other users' custom exercises (from "and whose").
• Every tool is sent a rationale, including create and update.
• Delete and merge proposals store usage in their payload or before.
• A direct change records the exercise id as targetId.

How to run
• npm run test:run -- library-management: a pass is all 32 green.

Where to look first
• __tests__/features/agent-tools/library-management.steps.ts:1: the contract header.
• __tests__/features/agent-tools/library-management.steps.ts:684: merge, including the
  all-or-nothing check (a test-only trigger blocks the final delete).

Locked
• The steps file is read-only and uncommitted. Unlock it with chmod u+w.
• I left the scratch fake and logs for cleanup: /private/tmp/claude-501/-Users-dustin-projects-workt
  rees-ripit-fitness-worktree1/44395796-83f8-416c-9ef5-9945f4154e4f/scratchpad/fake

The packet has also been sent to the lead (wE:p1).
