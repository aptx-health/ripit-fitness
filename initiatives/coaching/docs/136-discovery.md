# Scoping note: coaching (person-to-person proposals)

Date: 2026-11-06 · Author: coach-disco · Request: let Dustin build programs and workouts in his own account and send them to a linked trainee as proposals the trainee accepts or declines.

## Summary
Almost everything on the trainee's side already exists: proposals are already shown to users as "suggestions" under a "From your coach" block on Training, with a review screen and accept/reject. The work is (a) letting a proposal come from a coach link instead of an agent token, (b) an invite/link model, (c) a "Send to <trainee>" snapshot from the coach's Library, and (d) a small coach status page. Recommended reuse: make `Proposal.agentTokenId` nullable and add a nullable `coachLinkId`; keep one table, one service, one review screen.

## Constraints
- Schema change needs `db push` + a hand-written migration; BetterAuth's `user` table is not in Prisma, so there is no Prisma relation to users (`AGENTS.md`, "Database and migrations").
- Every API route: `getCurrentUser()`, scope every query to the user, try/catch → 500, rate limiting (`AGENTS.md` Conventions; global CLAUDE.md).
- `createProposal`'s `notify` posts to Dustin's private channels (Bark, Discord); callers must gate it so other users' content never reaches them (`lib/proposals/service.ts:217-224`).

## What I found
**Observed**
- `Proposal.agentTokenId String` is required, FK to `AgentToken` with `onDelete: Cascade` (`prisma/schema.prisma:777,793`). `userId` is the recipient (`:776`). Statuses: pending, applied, rejected, reverted, conflict (`lib/proposals/service.ts:69`).
- `CreateProposalInput` requires `agentTokenId` on every kind (`lib/proposals/service.ts:79-134`); `createProposal` copies it into each branch (`:242-325`) and calls `notify` after create (`:341`). MCP callers pass `ctx.tokenId` (`lib/mcp/tools.ts:576-734`) and gate notify with `notifyFor` (admin only, `:55-56`).
- Readers of `agentToken.name`: `app/(app)/admin/proposals/page.tsx:34,62`, `app/(app)/admin/proposals/[id]/page.tsx:32,83`, `app/api/admin/proposals/route.ts:34`, `app/api/admin/proposals/[id]/route.ts:21`. Admin list is already scoped to the admin's own proposals (`admin/proposals/page.tsx:24`).
- **"Coach suggestions for users" is the user-facing proposal review.** `lib/suggestions/kinds.ts:6-12` allows `saved_workout.create|update`, `program.create`, `anchors.update`, `balance_targets.update` (exercise-library kinds stay admin-only). List: `lib/suggestions/detail.ts:43` (`where: { userId, status: 'pending' }`). Routes: `app/api/suggestions/route.ts`, `app/api/suggestions/[id]/{accept,reject}` via `lib/suggestions/decision-route.ts` (scoped by `findSuggestion(user.id, id)`, rate-limited, no revert). Pages: `app/(app)/suggestions/page.tsx`, `/suggestions/[id]`. Training block: `components/training/TrainingHome.tsx:106-146`, hard-coded label "From your coach", no sender name anywhere.
- Approve: `program.create` re-runs `checkProgram` as the trainee and creates a normal Program owned by them; `targetId` = new program id; no revert (`lib/proposals/service.ts:393-402`). `saved_workout.create` creates a SavedWorkout.
- Payload rules: every `exerciseDefinitionId` must be visible to the **recipient**: `isSystem` or owned by them (`lib/proposals/exercise-definition.ts:30-32`, used in `program.ts:70` and `saved-workout.ts` `checkExercises`). A coach's custom exercise fails with `invalid`.
- `programInput` (`lib/proposals/program.ts:11-48`): name, description, weeks → workouts → exercises (definition id, notes, sets: reps, weight free text, rpe, rir, isWarmup). It does **not** carry `exerciseGroup` (supersets, `schema.prisma:145`), week description, or `Program.equipmentNeeded` (`schema.prisma:30`). Saved-workout proposals omit weight by design (`saved-workout.ts:20-21`) and `exerciseGroup`.
- No Program → `ProgramInput` or SavedWorkout → `workoutCreateInput` converter exists (searched `lib/proposals`, `lib/library`).
- Units: weight is free text; `UserSettings.defaultWeightUnit` defaults "lbs" (`schema.prisma` UserSettings). Display name: `UserSettings.displayName String?` (`schema.prisma:358`); community uses it with an "Anonymous User" fallback (`lib/community/publishing.ts:12`).
- Sign-up is open: email/password plus Google and Discord (`lib/auth.ts:40-83`). After sign-up the page hard-redirects to `/onboarding` (`app/(auth)/signup/page.tsx:84`), after login to `/` (`app/(auth)/login/page.tsx:45`). No return-to/`callbackURL` support. Precedent for carrying context through sign-up: the signup-attribution cookie (`lib/signup-attribution-cookie.ts`, `/go/[gymSlug]`).
- Token precedent: `AgentToken` stores `tokenHash`, has `revokedAt`, a per-user cap (`lib/agent-tokens.ts:21-72`). Rate limiters live in `lib/rate-limit.ts` (e.g. `workoutActionLimiter:93`, `authSensitiveLimiter:142`).
- Notifications to end users: none. Bark and Discord notify Dustin only (`lib/notify/bark.ts`, `lib/notify/discord.ts`); Resend is used only for password reset (`lib/auth.ts:52`). No web push.
- MCP `list_proposals` lists the user's proposals (`lib/mcp/tools.ts:181`), so a trainee's own agents would also see coach proposals.

**Inferred**
- A nullable `agentTokenId` + `coachLinkId` reuses `createProposal`, approve/reject, suggestions list/review and the Training block unchanged except for the sender label. Rests on the service never reading `agentTokenId` after create (only the admin pages above read the relation).
- Approve as-is gives the trainee their own copy (it creates a fresh Program/SavedWorkout under their userId), which matches Dustin's decision.

**Unknown**
- Whether Dustin's programs use custom exercises or supersets often enough to matter for v1. I did not query data.
- Whether `/suggestions` copy ("suggestion", "Accept/Reject") is what Dustin wants for a person, vs "Approve/Decline" in the decisions.

## Decisions and assumptions
- **Reuse choice for Find-out 1: nullable `agentTokenId` + new nullable `coachLinkId` (FK to `CoachLink`), DB CHECK that exactly one is set.** Why: one table keeps the review screen, approve logic, conflict checks and listing working. A separate table would duplicate `approveProposal` and the suggestions loaders. A "coach agent token" (trainee issues a token, Dustin uses MCP) needs no schema change but gives the coach no UI, exposes the trainee's whole `list_proposals` history (including other agents'), and mixes two meanings into Agent access. `coachLinkId` beats a bare `fromUserId` because ending a link and scoping the coach view both key on the link; the coach's user id is on the link.
- Coach path calls `createProposal(prisma, input, noopNotify)`: Dustin's Bark/Discord must not get the coach-sent text. Assumed; matches the comment at `service.ts:217`.
- Payload is a snapshot at send time; later edits to the coach's program don't propagate. Matches `SavedWorkout.workoutData` being a snapshot (`AGENTS.md` Domain gotchas).
- Coach view shows only `Proposal` rows on his links: kind, title, sent date, status. Never follows `targetId` into the trainee's Program. Per Dustin's decision.
- Any signed-in user can be a coach (no role), but the Coaching block can sit behind a flag or admin role until it's proven. Assumed; cheap to change.
- Invites: random 32-byte token, stored hashed like `AgentToken`, single use, expires in 7 days, coach can revoke. One active link per coach–trainee pair; nothing assumes one trainee per coach.

## Recommended design
- **Schema:** `CoachInvite { id, coachUserId, tokenHash @unique, expiresAt, usedAt?, revokedAt?, createdAt }`; `CoachLink { id, coachUserId, traineeUserId, createdAt, endedAt?, endedBy? }` with a partial unique index on active pairs; `Proposal.agentTokenId` nullable, `Proposal.coachLinkId String?` FK to `CoachLink`. New proposal status `withdrawn` for pending items when a link ends.
- **Invite flow:** Settings → Coaching → "Invite a trainee" makes a link `/coach/invite/<token>`. Accept page: signed in → show coach's display name, Accept. Signed out → sign up / sign in, then return to the accept page (needs a return path on `/signup` and `/login`, or a short-lived cookie like signup attribution; new users still go through onboarding first). Either side can end from Settings → Coaching.
- **Send:** On a Library program or saved workout, "Send to <trainee>" opens a sheet: pick trainee, optional note (becomes `rationale`). Server converts to `programInput` / `workoutCreateInput`, runs the existing `check*` as the **trainee**, and refuses with the list of exercises the trainee can't see.
- **Trainee:** Training's "From your coach" block, `/suggestions` list and review show the sender ("From Dustin") using `UserSettings.displayName`; agent ones keep the agent name. Badge = existing count on the Training block. No push/email in v1.
- **Coach page:** Settings → Coaching: invites (copy, revoke), trainees (end link), and per trainee a "Sent" list with pending / accepted / declined / withdrawn.
- **Privacy:** every coach query is `where: { coachLink: { coachUserId: me } }`; trainee routes stay scoped by `userId` (already true). Ending a link marks its pending proposals `withdrawn` in the same transaction; accepted copies stay with the trainee. Rate-limit invite create, invite accept (per IP and user) and send.

## Proposed work
| Step | Role | Input | Output | Checked by |
|---|---|---|---|---|
| 0 | Lead | this note + Dustin's answers below | spec + `.feature` per slice | Dustin |
| 1 | Implementer | spec: schema | `CoachInvite`, `CoachLink`, nullable `agentTokenId`, `coachLinkId`, `withdrawn`; admin pages tolerate null token | tests: existing proposal suite passes; CHECK rejects both/neither |
| 2 | Test builder → implementer | spec: invite + link | create/revoke/accept invite, sign-up/sign-in return, end link, Settings → Coaching skeleton | tests: expiry, reuse, revoked, self-invite, rate limits; phone screenshot |
| 3 | Test builder → implementer | spec: send | Program/SavedWorkout → proposal converters, "Send to" sheet, coach-path createProposal (no notify), sender label on trainee screens | tests: round-trip converter, invisible-exercise refusal, trainee can't see coach data, Dustin's notify not called |
| 4 | Implementer | spec: coach view + end link effects | Sent list with statuses, withdraw on end | tests: coach sees only his links' rows; ended link hides pending from trainee |
| 5 | Reviewer | each PR | review + perf-check + phone preview | Dustin |

Order and dependencies: 1 → 2 → 3 → 4. Each ships alone (1 is invisible; 2 links accounts with nothing to send yet; 3 is the useful slice).

## Risks
- Supersets and program equipment silently dropped by `programInput`; the trainee's copy looks different from Dustin's. Either extend `programInput` with `exerciseGroup` (also helps agents) or warn on send.
- Coach custom exercises block sends until there's a copy path.
- Bare-number weights ("135") read in the trainee's unit, which may differ from the coach's.
- The Training block label "From your coach" already shows agent suggestions; mixing a real coach and agents there may confuse a new lifter without per-item sender names.

## Needs Dustin
1. **Custom exercises in a sent program.** Options: (a) refuse to send and name them; (b) on accept, copy the coach's custom definitions into the trainee's account. Recommend (a) for v1, (b) later if it bites. Confidence: medium (depends on how often you use custom exercises).
2. **Ending a link with items still pending.** Options: (a) withdraw them (trainee no longer sees them); (b) leave them for the trainee to decide. Recommend (a). Accepted copies stay either way. Confidence: high.
3. **Does the coach see "started"?** It means reading the trainee's program state (active / any completion) for the copy he sent. Recommend no for v1: pending / accepted / declined only, which keeps the "only what he sent" line clean. Confidence: medium.

## Out of scope / later
- Push or email to the trainee when something arrives (no user notification channel exists).
- Coach editing or resending a sent item; `saved_workout.update` from coach.
- Several coaches per trainee or a coach marketplace.
- Extending `programInput` with supersets also benefits agent proposals; may deserve its own item.
