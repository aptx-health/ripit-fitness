# Agent tools: slice 1 spec

Status: draft for Dustin's confirmation (2026-10-25). Behaviour lives in
`features/agent-tools/*.feature`; this file fixes the contract that the
test-builder and implementer both code against.

## Goal

Agents (Claude Code on the Mac, reached via herdr/collie or Claude remote) can
read Dustin's training data and **propose** exercise-database changes through
an MCP server in the app. Nothing an agent does changes real data until Dustin
approves the proposal in the admin Workbench. Approved changes can be undone.
A Bark push tells him a proposal is waiting.

Programs (`propose_program`) are slice 2. Bug-fix agents work through GitHub
PRs and are out of scope here.

## Pieces

| Piece | Where | Notes |
|---|---|---|
| `AgentToken` model | `prisma/schema.prisma` | Personal access token per agent. Store SHA-256 hash only; plaintext shown once at creation. Fields: id, userId, name, tokenHash (unique), createdAt, lastUsedAt, revokedAt. |
| `Proposal` model | `prisma/schema.prisma` | id, userId, agentTokenId, kind, status, summary, rationale, payload (Json), targetId?, before (Json?), inverse (Json?), error?, createdAt, decidedAt?. |
| Token helpers | `lib/agent-tokens.ts` | `createAgentToken(prisma, userId, name) -> { token, record }`, `resolveAgentToken(prisma, bearer) -> { userId, tokenId } \| null` (null for unknown or revoked; updates lastUsedAt). |
| Proposal service | `lib/proposals/service.ts` | `createProposal`, `approveProposal`, `rejectProposal`, `revertProposal`. All take `prisma` first. `createProposal` takes an injectable `notify` so tests can assert and fail it. |
| MCP tools | `lib/mcp/tools.ts` | `listTools()` and `callTool(prisma, ctx, name, args)` where `ctx = { userId, tokenId, notify }`. Tool handlers are plain functions; tests call `callTool` directly (project convention: no HTTP in tests). Args validated with zod. |
| MCP route | `app/api/mcp/route.ts` | Official `@modelcontextprotocol/sdk` Streamable HTTP transport, stateless. Bearer token via `resolveAgentToken`; 401 otherwise. Rate-limited. Thin: registers `listTools`/`callTool`. |
| Admin API | `app/api/admin/proposals/...` | `GET` list/detail; `POST [id]/approve`, `[id]/reject`, `[id]/revert`; token create/revoke. `requireAdmin`. Thin wrappers over the service. |
| Notifier | `lib/notify/bark.ts` | POST to `BARK_URL` (Doppler) with title, body and a deep link to `/admin/proposals/<id>`. Unset `BARK_URL` means skip (debug log). Errors are logged, never thrown to the caller. |
| Admin UI | `app/(app)/admin/proposals`, `app/(app)/admin/agent-tokens` | Items 003/004. Proposals: list by status (pending first), detail with a before/after field diff, rationale, token name, and Approve / Reject / Revert buttons that show the result `code`/`error`. Tokens: list (name, created, last used, revoked), create (plaintext shown once with copy button), revoke. Sidebar entries plus a pending-count badge via `getWorkbenchCounts`. Agent text rendered as plain text only. |

## Tools (slice 1)

Read:
- `search_exercises({ query, limit? })` -> id, name, aliases, equipment, primaryFAUs.
- `get_exercise({ id })` -> full definition.
- `list_programs()` -> the user's programs with active flag and week count.
- `get_workout_history({ limit?, since? })` -> completed workouts, newest first, with exercises and logged sets.

Write (proposal only):
- `propose_exercise_create({ definition, rationale })`
- `propose_exercise_update({ id, changes, rationale })`
- `list_proposals({ status? })` -> the caller's proposals and their status.

There is deliberately **no** approve, reject or revert tool.

## Rules

- `kind` values: `exercise_definition.create`, `exercise_definition.update`.
- `status` values: `pending`, `applied`, `rejected`, `reverted`, `conflict`.
- Validate with the existing `validateExerciseDefinition` and `checkDuplicateExercise` in `lib/validators/exercise-definition.ts` at propose time **and** again at approve time.
- An update proposal stores `before` (the full current definition, including `updatedAt`). If the definition's `updatedAt` differs at approve time, mark the proposal `conflict` and change nothing.
- Approve runs in one Prisma transaction: apply the change, store `inverse`, set `applied` and `decidedAt`.
- Revert of an update restores `before` fields. Revert of a create deletes the definition only if no `Exercise` row references it; otherwise refuse and leave it applied.
- Only `pending` can be approved or rejected; only `applied` can be reverted.
- Reverting an update is refused with `code: 'conflict'` if the definition's `updatedAt` no longer matches the value written at approve time; the proposal stays `applied`. (Added 2026-10-25 for item 003.)
- All reads and proposals are scoped to the token's user.
- Agent-supplied text (rationale, names) is data. Render it escaped in the admin UI and in the Bark body.

## Return shapes (pinned 2026-10-25 after 001)

- `approveProposal`, `rejectProposal`, `revertProposal`: `(prisma, proposalId, userId)`. Each returns `{ ok: true, proposal }` or `{ ok: false, code, error }`, where `code` is one of `not_found`, `not_pending`, `not_applied`, `conflict`, `in_use`, `invalid`. Error text says why, for example "proposal is not pending" or "exercise is in use by 1 workout". A stale update sets the proposal's status to `conflict` and returns `ok: false, code: 'conflict'`.
- `callTool` returns an MCP `CallToolResult`: `{ content: [{ type: 'text', text: JSON.stringify(data) }] }`, with `isError: true` on failure. Error payload: `{ error, field?, existingId? }`.
  - A validation error sets `field`, for example `primaryFAUs`.
  - A duplicate sets `existingId`.
- `listTools()` returns `Array<{ name, description, inputSchema }>`.
- `ctx.notify(payload)` receives `{ proposalId, title, body, url }`. `createProposal` builds `url` as `${NEXT_PUBLIC_APP_URL}/admin/proposals/<id>`. `lib/notify/bark.ts` exports a `notify` with this signature.
- `get_workout_history` returns `{ workouts: [{ completionId, name, completedAt, exercises: [{ name, loggedSets: [...] }] }] }`, newest first.
- An approved create makes the definition with `userId` set to the approving user, `isSystem: false` and `createdBy: userId`.

## Notifications (added 2026-10-25 for items 005 and 006)

- Discord is the route: `DISCORD_PROPOSALS_WEBHOOK_URL` in Doppler `fitcsv`. Bark stays as an optional second channel when `BARK_URL` is set.
- `lib/notify/discord.ts` exports `sendProposalToDiscord(payload: NotifyPayload, opts?: { webhookUrl?: string; fetch?: typeof fetch })`. Defaults are `process.env.DISCORD_PROPOSALS_WEBHOOK_URL` and the global `fetch`. It resolves once the POST has finished or failed, and never throws.
  - Body: `{ allowed_mentions: { parse: [] }, embeds: [{ title, description, url }] }`.
  - `title` is at most 256 characters.
  - `description` holds the summary and is at most 4096 characters.
  - `url` is `payload.url`, the review page.
  - Control characters are stripped.
  - A failure or non-2xx response is logged with `logger.warn` and never thrown.
- `lib/notify/index.ts` exports `notify: Notify`. It sends to every configured channel in parallel, each failure isolated. `createProposal`'s default and `app/api/mcp/route.ts` use it instead of importing `bark` directly.
- The existing `lib/discord.ts` (feedback, `DISCORD_WEBHOOK_URL`) is left alone.

## Feedback (added 2026-10-25 for items 007 and 008)

- New read tool: `list_feedback({ status?, category?, limit? })`.
  - `status` defaults to `new`; `limit` defaults to 20, max 50. Newest first, scoped to the token's user.
  - Each item: `{ id, category, message, pageUrl, rating, refinements, status, adminNote, createdAt }`. No `userAgent`.
  - Valid `status` values: `new`, `reviewed`, `resolved`. Valid `category` values are the ones in `app/api/feedback/route.ts`. Bad values return a tool error with `field`.
- `propose_exercise_create` and `propose_exercise_update` accept an optional `feedbackId`.
  - It must be the token user's feedback. Otherwise the tool errors with `field: 'feedbackId'` and creates no proposal.
  - It is stored as `Proposal.feedbackId`, a nullable column added by an additive migration.
- When `approveProposal` applies a linked proposal, it sets the feedback's `status` to `resolved` in the same transaction. It also appends `Resolved by agent proposal <id>` to `adminNote`, keeping any existing note.
- Reject, conflict and revert leave the feedback unchanged.
- Agents get no tool that writes feedback.
- The admin proposal detail page shows the linked feedback's message, with a link to `/admin/feedback`.

## Programs (added 2026-10-26 for slice 2, items 009–011)

Agents can propose a **new** program. Editing an existing program is a later slice.

- New read tool: `get_program({ id })`.
  - Returns `{ program: { id, name, description, isActive, weeks: [{ weekNumber, name, workouts: [{ dayNumber, name, exercises: [{ order, exerciseDefinitionId, name, notes, prescribedSets: [{ setNumber, reps, weight, rpe, rir, isWarmup }] }] }] }] } }`, ordered by week, day, order and set number.
  - Programs that aren't the token user's, or that are soft-deleted, return a tool error `program not found`.
- New write tool: `propose_program_create({ program, rationale, feedbackId? })`, with kind `program.create`.
  - `program` is `{ name, description?, weeks: [{ name?, workouts: [{ name, exercises: [{ exerciseDefinitionId, notes?, prescribedSets: [{ reps, weight?, rpe?, rir?, isWarmup? }] }] }] }] }`.
  - Week numbers, day numbers, exercise order and set numbers come from array position, starting at 1. Agents don't send them.
  - `feedbackId` behaves as it does for exercise proposals.
- Validation runs at propose time and again at approve time. The first failure returns a tool error with `field` set to the offending key name:
  - `name` is required, at most 100 characters.
  - Limits: 1–16 weeks, 1–7 workouts per week, 1–15 exercises per workout, 1–10 sets per exercise. An empty list errors with `field` set to `weeks`, `workouts`, `exercises` or `prescribedSets`.
  - Each `exerciseDefinitionId` must exist and be visible to the user (system or theirs).
  - `reps` is a required non-empty string, at most 20 characters. `weight` is an optional string, at most 20 characters.
  - `rpe` is an integer 1–10, and `rir` an integer 0–10, both optional.
- Approve creates everything in one transaction:
  - The Program is created with `isActive: false`, `isUserCreated: true`, `programType: 'strength'` and `copyStatus: 'ready'`.
  - Every row gets the user's `userId`, and Exercise `name` is copied from its definition.
  - `targetId` is set to the program id. `inverse` stays null.
  - The program-count limit (`MAX_PROGRAMS`) is not applied, because only admins approve.
  - If a referenced definition has gone, approve returns `invalid`, nothing is created, and the proposal stays `pending` with `error` set (same as exercise proposals).
- Revert is refused for `program.create`: it returns `invalid` with the error `program proposals can't be reverted; delete the program from Programs instead`, and the proposal stays `applied`. (Changed 2026-10-26 after Dustin's phone test. An approved program is an ordinary program.)
- Admin detail page: for `program.create`, it shows a read-only outline (weeks → workouts → exercises with a compact set summary such as `3 × 5 @ RPE 8`) in place of the field diff. After approval it links to the created program and shows no Revert button.
- Notifications work as before. The summary is `New program: <name> (<n> weeks)`.

## Not in slice 1

OAuth for claude.ai/mobile connectors, MCP Apps UI, program proposals,
insights tools beyond raw history, multi-user anything.
