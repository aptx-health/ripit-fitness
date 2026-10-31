Report: complete

Item 025: tests for anchors and balance targets (red). Worktree2, branch feature/agent-balance. Nothing committed.

**Built**
- `__tests__/features/agent-tools/balance-proposals.steps.ts`, locked read-only (`chmod u+w` to unlock). 162 tests: all 15 scenarios plus plain describes for tool registration, reads, anchor and target arguments, and approve/revert for both kinds.
- Covers every extra in the item: 18 FAUs and 6 patterns always present; empty `changes` refused; duplicate ids removed before the limit of 5; another user's exercise refused; `days` bounds; reads do no writes (counted write calls, with a control that proves the counter works); unrelated profile or settings edits don't conflict; revert refused with `conflict` when a touched key moved; summary format.

**Verdict**
- `npm run test:run -- balance-proposals`: 107 failed, 55 passed. The failures are all "unknown tool: ..." or "proposal not found" from the missing tools and kinds. The 55 passes are Background and Given steps, plus a few When steps and controls that pass today.
- Rest of agent-tools, run file by file: exercise-proposals 104/104, feedback-to-proposals 52/52, program-proposals 59/59, proposal-notifications 18/18, training-insights 85/85, training-export 78/78. Biome is clean and tsc has no errors in the file.

**Pass-proof (break-matrix, scratch wrapper fake in the scratchpad, deleted afterwards)**
- Baseline: 162/162 pass against the fake.
- 60 one-rule breaks: reads (anchors, targets, volume), anchor proposals, anchor approve and revert, target proposals, target approve and revert. 59 killed by their targeted tests. Each variant ran only its targeted tests; only the baseline was a full-file run.
- Survivor: a different separator in the multi-pattern anchor summary (`Update anchors: Hinge; Squat`). The spec doesn't fix it, so the test only asserts the prefix and that every pattern name appears.
- One real gap found and fixed during the matrix: nothing tested the edge of the 14-day default window. Added a session at 15 days that must be excluded.

**Assumptions to confirm (spec is silent)**
1. `before` and `inverse` are keyed by touched key only (`{ hinge: [...] }`, `{ quads: 1 }`), and `inverse` equals `before`. Unset values are recorded as `[]` or 1.
2. `get_anchors` keeps the stored order of ids.
3. The success payload shape of the propose tools is not asserted beyond `proposalId` in the notify call, plus the summary text.
4. Approving an anchor proposal with no profile row creates the row (`ratioTargets` is required, so `{}`).
5. `days` and `changes` errors follow the existing zod style: `field` is the key itself. Non-number target values name the FAU. Calc keys in a target change (`lookbackDays`) are refused, named by that key.
6. `lastLoggedDaysAgo` is a floor of 24h periods. Seeds are offset +1h so the day count is stable at any time of day.
7. Revert after the settings row was created by approve leaves the row in place with default targets (the test reads effective values).

**Out of scope, for the lead**
- Admin detail page (FieldDiff rows, revert button) has no tests here.
- `getAnchorStaleness` counts archived sessions and only looks at the last 50 completions (from 024). Not touched.

**Environment and process notes**
- Colima: Ryuk is disabled, so killed runs leave `postgres:15` containers (~40 left from the matrix), which made group runs fail from load.
- `break-matrix` skill updated (v0.2.0) in worktree2: targeted `-t` runs, measured costs, batched runs with progress, `|Background` note. `SKILL.md` modified, `scripts/run-batch.sh` untracked. Uncommitted.

**Not verified**: rate limiting, the admin page, anything under `lib/` or `app/`.
