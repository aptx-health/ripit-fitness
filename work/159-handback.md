# 159 handback (coach-impl wE:pA, 2026-11-09) — Report: complete

Verdict: checks out with adjustments. 158's 85 step tests pass unchanged; full suite 4578 pass (200 files); tsc clean. Manual MCP run on the local stack (webhooks blanked, admin token for dmays@test.com): list shows 5 tools; search usage (Barbell Bench Press: 5 users, 162 sets); create/update applied; duplicate refused with existingId; delete-in-use refused with merge hint; delete/merge pending; via admin API: revert update 200, approve merge 200, revert merge 422, approve delete 200. Admin detail renders the 4 new kinds; Revert hidden on merge/delete.

Not verified: screenshots, perf-check, phone-width approve confirm (for 160). Merge rewrites of anchors and CommunityProgram.programData have no test.

Files: new `lib/proposals/library.ts` (usage in 7 grouped queries; create/update/delete/merge; approve/revert), new `lib/mcp/library-log.ts`; `lib/mcp/tools.ts` (5 admin-only tools), `lib/proposals/service.ts` (4 kinds, IRREVERSIBLE_KINDS, approve/revert; delete that comes into use → `conflict`), `lib/exercises/update-definition.ts` (`applyDefinitionUpdate(tx)` shared with revert), admin proposal page + `ProposalActions` (usage, Revert hidden, inline "can't be undone"), `initiatives/agent-tools/docs/spec.md` library section.

Beyond the handoff: extra usage keys oneOffExercises, anchors, communityPrograms (all block delete). Merge rewrites programData + anchors; renames Exercise rows on the old name; pin/pref on both → keep "into". Merge allowed into shared, or between two customs of the same owner. Duplicate check is library-wide (normalizedName unique). Create/update annotated destructiveHint.
Deviated: updated 3 older tests that hard-coded the tool list (user-agent-tokens, saved-workout-proposals, feedback-to-proposals).
Risks: near-duplicates exist (Barbell Bench Press vs Bench Press). Revert still shows on an applied create whose exercise was later deleted/merged (no-op). tools.ts at 990 lines.
Left running: worktree1 postgres (5434) with token "manual-159" and test user set to admin; an old worktree1 overmind from Nov 7.
