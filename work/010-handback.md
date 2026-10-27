Report: complete

(Received from implementer via cross-session message, 2026-10-26. Saved verbatim in substance by the lead.)

010 is done: agents can now read a program in full and propose a new one, and approving the proposal creates it, inactive.

## Verdict
- `npm run test:run -- agent-tools`: 240/240 pass (program-proposals 66/66; was 24 failing).
- Full `npm run test:run`: 80 files pass, 1 skipped; 1092 tests pass, 4 skipped (1026 + 66; nothing new fails).
- Type-check clean; biome and eslint clean on the 6 changed files.
- Break check: disabling the trained-on check in `deleteProgram` failed exactly the 3 Then/And steps of "Reverting a program Dustin has trained on is refused"; restored.

## What changed
- `lib/proposals/program.ts` (197 lines, new): zod `programInput`; `checkProgram` (shape, limits, definition existence and visibility; used at propose and approve); `programSummary`, `createProgram`, `deleteProgram`, `issueField`, `programTreeSelect`.
- `lib/proposals/service.ts` (352 → 400): `program.create` kind, `PROPOSAL_KIND_LABELS`, one program branch each in create/approve/revert; P2003 on approve maps to `invalid`.
- `lib/mcp/tools.ts` (385): `get_program`, `propose_program_create`. Zod errors now report the last named key in the path as `field` (same results for existing tools).
- `components/admin/proposals/ProgramOutline.tsx` (new): weeks → days → exercises, grouped set summary (e.g. `1 × 8 @ 60 warm-up, 3 × 5 @ 100 @ RPE 8`). Detail page shows it instead of the field diff; once applied, links to `/programs/<id>` if the program still exists and isn't soft-deleted. List page and badge use `PROPOSAL_KIND_LABELS`.

## Transaction
Inside the existing approve `$transaction`: claim, re-run `checkProgram` on `tx`, one nested `tx.program.create` (sets via `createMany` per exercise), resolve linked feedback, update proposal. Revert counts WorkoutCompletions across the program's workouts; if none, `deleteMany` on the program (cascade). Already-gone counts as reverted. No schema change.

## Screenshots (390px)
- `initiatives/agent-tools/docs/assets/010/program-proposal-pending-390.png`
- `initiatives/agent-tools/docs/assets/010/program-proposal-applied-390.png`
Fixed bottom nav overlaps the full-page capture, as in 004/008.

## Dev safety
Ran with `DISCORD_PROPOSALS_WEBHOOK_URL=` and `BARK_URL=` blanked (verified on the running processes). Dev data left: token `dev-screenshot-010` (revoked), proposal cmvq2cewy0004vr5fhy30c5tw (applied), program cmvq2cgpk0008vr5fu4q6pm7w (inactive). App and Postgres stopped. Nothing committed.

## Decided alone
- Extra limits: description ≤2000, week and workout names ≤100, exercise notes ≤500.
- `.strict()` schemas at every level: unknown keys (e.g. `weekNumber`) are refused; `field` names the containing object.

## Not verified / outside the item
- Untested: feedbackId on propose_program_create, upper limits and length rules, reverting an already-gone program, the outline UI (screenshot only).
- get_program returns stored nulls as null (matches 009 assumption 1).
- Approve doesn't deactivate other programs or check MAX_PROGRAMS, per spec.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
