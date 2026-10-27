Report: complete

The program-proposal tests are written and red, and they pass against a scratch fake of the contract.

Verdict: npm run test:run -- program-proposals gives 24 failed and 42 passed (66 total). All 10 scenarios are bound. The failures come from missing get_program, propose_program_create,
and the program.create approve and revert behaviour. The 42 passing are mostly Given/And steps and "nothing created" checks that pass while nothing exists. exercise-proposals,
proposal-notifications and feedback-to-proposals still pass together (174 of 174).

Verified
- Can fail: with no implementation present, each scenario fails on unknown tool: get_program, unknown tool: propose_program_create, or the not_found that follows from having no proposal.
- Can pass: the correct fake passes 66 of 66.
- Broken fakes: I broke the fake 18 ways, and each break failed only the scenarios it targets. The fake and its config are deleted.

┌─────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Rule   │                                                                Broken variants, each caught                                                                │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Read    │ unordered output, other user's program returned, soft-deleted program returned                                                                             │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Propose │ creates the program at propose time, skips the rpe check, skips the visibility check, skips the empty-exercises check, no notification, wrong summary text │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Approve │ active program, not marked user-created, non-atomic approve, targetId not set, 0-based week numbers, dropped isWarmup, reject creates the program          │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Revert  │ ignores completions, status stays applied                                                                                                                  │
└─────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Cases: 10 scenarios plus 5 extra second-call checks inside them (66 tests). There was no case cap.
- get_program: a soft-deleted program is hidden. Rows are seeded in reverse order, so ordering must come from the numbers.
- Unknown exercise: another user's private definition is also refused.
- Empty list: an empty weeks list is refused with field: 'weeks'.
- Effort: rir 11 is refused with field: 'rir'.
- Approve: the full week → workout → exercise → set tree is compared in a single toEqual, including the exercise name copied from its definition and userId on every row. Program flags,
  targetId, inverse and the proposal error are checked too.
- Invalid approve: nothing at all is left behind (no program, week, workout, exercise or set), and the proposal stays pending with error set.
- Revert: the whole tree is gone and the exercise library is untouched.

Locked: the new file __tests__/features/agent-tools/program-proposals.steps.ts is chmod a-w. Unlock with chmod u+w, then re-lock. I didn't touch lib/, app/, prisma/, features/**, the
other steps files, work/, STATE.md or status.md. Nothing is committed.

Assumptions to confirm (the spec is silent or loose):
- get_program returns missing optional values as null, not omitted, for the seeded program. The seed fills every field, so only null for unset values is untested.
- The notification text: New program: Agent Block (2 weeks) must appear somewhere in the notify payload, and proposal.summary must equal it exactly.
- A weeks: [] program errors with field: 'weeks'. The spec lists it, but the feature has no such scenario.
- Programs with deletedAt set count as not found for get_program.

Not verified
- Revert when the program is already gone ("counts as reverted").
- feedbackId on propose_program_create.
- The upper limits (16 weeks, 7 workouts, 15 exercises, 10 sets) and the name, reps and weight length rules.
- That MAX_PROGRAMS is skipped.
- The admin detail page.
- The fake approves non-atomically only in the broken variant. It does not prove that the real transaction rolls back midway; the "nothing left behind" assertions are what would catch
  that.
- No coverage tool was run.

Quirks: none from a reference, since there isn't one.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
