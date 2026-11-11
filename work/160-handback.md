# 160 review (coach-review wE:pB, 2026-11-09) — Report: needs decision
Verdict: solid; one real gap.
1. MEDIUM merge ignores UserTrainingProfile.bannedExerciseIds (read by lib/suggest/training-state-builder.ts:393): ban on "from" dangles; "into" can be suggested to someone who banned it. Usage omits bans.
2. LOW community merge swaps ids but keeps old names in programData (sibling "name", nested exerciseDefinition name/aliases).
3. LOW race between usage re-check and delete: pin/pref created in the gap is cascade-deleted. Fix: SELECT ... FOR UPDATE on the definition row first.
4. LOW search matches aliases exactly only.
5. LOW UI approve warning below buttons, half under bottom nav on phone; no Cancel.
6. NIT revert of applied create whose exercise was merged away no-ops and marks reverted.
Checked fine: admin gating, every relation moved, one transaction + rollback, delete re-check/conflict, revert create/update, delete/merge not revertable, logging, rate limit (agentMcpLimiter 60/min).
Tests added: __tests__/lib/library-merge-json.test.ts (3; anchors move/dedupe; programData ids incl. nested), break-checked. 926 pass in 14 files; tsc clean; full suite not run.
Screenshots: initiatives/agent-tools/docs/assets/160/merge-approve-confirm-{first-tap,scrolled}.jpg (425px).
Not verified: pending proposals referencing a merged-away id at approval; 390px exactly.

# 161 handback (coach-impl, 2026-11-09) — Report: complete
All six fixed: bans (usage count, merge moves+dedupes, delete/revert-create drop); programData renames; lockDefinitions FOR UPDATE in id order for delete/merge/revert-create; searchLibraryIds ILIKE name/aliases (escaped); approve warning above buttons with Cancel (390 screenshot assets/161); revert-create of gone exercise → not_found. Pending proposals on merged-away ids fail at approve with clear errors (saved_workout/program/anchors invalid; exercise update conflict). Suite 4591 pass; tsc clean; tools.ts 987. New test __tests__/lib/library-review-fixes.test.ts (10). Not verified: lock concurrency test. Risk: seeding went through the worktree1 dev server on 3100 whose Discord webhooks were NOT blanked (dev_personal has DISCORD_PROPOSALS_WEBHOOK_URL) → likely 3 test posts in #proposals; lead stopped that server.
