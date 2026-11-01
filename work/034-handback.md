Report: needs decision

# 034 scoping note: Training + Library (TL1–TL5)

Checked in worktree2 on `feature/training-library`. I changed no repo files; this note exists only in my scratchpad. FACT = I read the code or ran a query; INFERENCE = my reasoning; NOT VERIFIED = I couldn't confirm it. Paths are repo-relative.

## 1. Today's screens

**/training**
- FACT: `app/(app)/training/page.tsx:65-75` loads the active program's week. With `?week=N` it calls `getStrengthWeekByNumber`, otherwise `getCurrentStrengthWeek`. It also loads a completed+draft count. With a week it renders `StrengthWeekView` (`:87-95`); without one it shows `NoActiveProgram`, which links to `/programs` (`:118-134`).
- FACT: both loaders only work for the active program: `lib/db/current-week.ts:58-65` and `lib/db/week-navigation.ts:28-35` filter `isActive = true AND isArchived = false`. "Current week" means the first week with an unfinished workout (completed or skipped counts as done), falling back to the last week.
- FACT: `components/StrengthWeekView.tsx` (651 lines) holds everything TL1 moves: `WeekNavigator` with `baseUrl="/training"` (`:475`), the week overview (`:490-495`), training messages, `WorkoutCard` rows, Complete Week (`:541-559`, `POST /api/weeks/:id/complete`), `WorkoutHistoryList compact` (`:563-564`), the logging modal, `?resume=` auto-open (`:317-327`), the program completion and restart flow (`:256` pushes `/training?week=1`), and the PWA prompt.
- INFERENCE: TL1 can move `StrengthWeekView` mostly as-is. The changes are: pass `baseUrl`, take a `programId` instead of "the active one", and point the restart push at the new route.

**/programs/[id]**
- FACT: `app/(app)/programs/[id]/page.tsx:1-6` only redirects to `/training`. `/programs/[id]/edit` and `/programs/new` are real pages.
- INFERENCE: Program Detail should live at `/programs/[id]` (soon `/library/programs/[id]`, see choice C below). The URL is free, and `ArchivedProgramsList.tsx:106` and `admin/proposals/[id]/page.tsx:255` already link there. A new route isn't needed.
- FACT: none of the logging routes (`app/api/workouts/**`, `app/api/weeks/**`) check `isActive`; only the two week loaders above do.
- INFERENCE: TL1 needs loaders that take a `programId` (filtered by `userId`, not `isActive`). Whether a non-active program's detail page allows logging is choice A below.

**/programs**
- FACT: `app/(app)/programs/page.tsx:16-118` loads the user's programs, every community program, the active week through raw SQL (a third copy of the current-week CTE), the program count and the limit-bypass setting.
- FACT: `components/programs/ConsolidatedProgramsView.tsx` renders the PROGRAMS title (`:237-240`), `ActiveProgramStrip` or a "No active program" note (`:243-262`), and a My Programs | Browse `SegmentedControl` with `?tab=browse` and `?cloning=` handling (`:64-71`, `:202-229`, `:264-276`).
- FACT: `MyProgramsList.tsx:61-64` leaves the active program out of the list because the strip shows it. The create action is `CreateNewCard href="/programs/new"` (`:306-322`). `ProgramCard.tsx:46-48` already has an ACTIVE badge but only `CommunityProgramsView` uses it.
- FACT: `components/ProgramsList.tsx` is never imported (dead code).

**/workouts/saved**
- FACT: `app/(app)/workouts/saved/page.tsx` is a thin page around `SavedWorkoutsList`. That list fetches `GET /api/workouts/saved` and also has a "Start a freestyle workout" button (`SavedWorkoutsList.tsx:28,60-70`). It moves into Library → My Workouts unchanged.

**Nav and links**
- FACT: `components/BottomNav.tsx:11-17` has Training, Programs, the center button, Learn and Settings. A tab is active when `pathname.startsWith(href)` (`:94`). `components/Header.tsx:22-24` has a desktop nav with the same entries.
- FACT: `components/QuickActionSheet.tsx`:
  - "Continue your program" uses `GET /api/training/next-workout` (`:98`) and pushes `/training?resume=<workoutId>` (`:150`).
  - A program draft resumes the same way (`:143`).
  - "My saved workouts" goes to `/workouts/saved` (`:155`).
  - Ad-hoc starts go to `/training/adhoc/:id`.
- FACT: other links to update:

  | Route | Linked from |
  |---|---|
  | `/training` | `app/page.tsx:23` (root redirect: `/training` with an active program, else `/programs`), `welcome/page.tsx:72-77`, `ActiveProgramStrip.tsx:105`, `StrengthActions.tsx:32`, `ActivationConfirmModal.tsx:80`, `StrengthActivationModal.tsx:37`, `useProgramActions.ts:145`, `ProgramCompletionModal.tsx:127`, `ReturnToWorkoutStrip.tsx:46-49`, `AdHocLoggerView.tsx:628-664`, `training/adhoc/[completionId]/page.tsx:99-103` |
  | `/programs` | `onboarding/page.tsx:253`, `community/page.tsx:4` (`?tab=browse`), `CommunityProgramCard.tsx:74` (`?cloning=`), `StrengthActivationModal.tsx:49` (stale `?tab=strength`), `ProgramCompletionModal.tsx:148`, `programs/new` and `[id]/edit` back links |
  | `/workouts/saved` | `WorkoutRollupModal.tsx:640`, `QuickActionSheet.tsx:155` |

- FACT: `WorkoutHistoryList.tsx:306` links `/programs/${completion.workout.id}`, i.e. a workout id used as a program id. It works today only because `/programs/[id]` redirects. Once TL1 puts a real page there it breaks, so TL1 must fix it.
- FACT: there are no Next.js redirects in `next.config.ts`, and `middleware.ts` does nothing route-specific. The PWA `start_url` is `/`.

## 2. Training home data (TL2)

**Up Next**
- FACT: `app/api/training/next-workout/route.ts:18-43` already returns `{workoutId, workoutName, dayNumber, weekNumber, totalWeeks, programName, exerciseCount}` from `getCurrentStrengthWeek`. It returns `null` when there is no active program or nothing is left this week.
- FACT: it treats a skipped workout as "next" (`:24-27`: anything not `completed`), while the current-week query counts skipped as done.
- INFERENCE: if the current week is all skipped and completed except one skipped day, Up Next shows that skipped day. Small, but the spec should say which rule wins. I recommend skipping `skipped` too.
- INFERENCE: TL2 can call the same loader on the server. Start then needs a program-day start path. Today that is `/training?resume=<workoutId>`, which opens the logging modal inside `StrengthWeekView`. After TL1 it becomes `<programDetail>?resume=<workoutId>`, so the resume handling has to move with the view.

**Progress**
- FACT: "Week X of Y" comes from the same loader (`weekNumber`, `totalWeeks`).
- FACT: "N of M workouts" comes from `getProgramCompletionStatus` in `lib/db/program-completion.ts:15-65`. It counts workouts that have a non-archived `completed` or `skipped` completion, out of all workouts.
- INFERENCE: skipped workouts count toward N. Decide whether the card says "complete" or "done".

**Recent Workouts**
- FACT: `GET /api/workouts/history` (`route.ts:26-79`) returns name, `completedAt`, derived duration (`resolveDurationSeconds`), `isAdHoc`, and the program workout plus program name. It covers ad-hoc and program sessions alike.
- FACT: it includes drafts (`status in completed, draft`, `:29`). Recent Workouts should use `completed` only.
- FACT: the dev DB has 91 completed sessions (67 ad-hoc) and `durationSeconds` is null on every one, so duration always comes from `startedAt` to `completedAt`.

**Repeat as a freeform copy**
- FACT: the one-draft-per-user rule lives in both `POST /api/workouts/adhoc` (`route.ts:46-95`) and `POST /api/workouts/saved/[id]/start` (`:64-157`). Each runs a Serializable transaction, finds an existing draft, and returns 409 `DRAFT_EXISTS` with that draft. There is no unique DB index behind it; the P2002 catch is defensive.
- FACT: saved-start hydrates `SavedWorkoutData` into a draft: one-off `Exercise` rows plus `PrescribedSet`s (`:81-129`).
- FACT: `POST /api/workouts/saved` (`:120-168`) already turns a completion into `SavedWorkoutData` (logged sets become plan sets, weight dropped). It refuses non-ad-hoc sessions (`:144-151`) and reads only `completion.exercises`.
- FACT (schema): a program session's exercises belong to the `Workout`, not the completion. Logged sets reach them through `LoggedSet.completionId` plus `exerciseId` (`prisma/schema.prisma:232-243`). So `completion.exercises` holds only the one-offs added during logging.
- INFERENCE: Repeat should be one new route, `POST /api/workouts/completions/[id]/repeat`. It builds `SavedWorkoutData` from `completion.loggedSets` grouped by exercise (this works for both kinds), then runs the saved-start transaction with `savedWorkoutId: null` and `workoutId: null`.
- INFERENCE: a null `workoutId` is what keeps a repeated program day out of program progress, as decided.
- INFERENCE: extract the shared "hydrate data into a draft" helper from the saved-start route rather than copying it a third time. Weight isn't copied: "last time as the plan" means reps, RIR, RPE and warm-up only, because `PrescribedSet` has no weight-from-log path. The spec should confirm that.

## 3. Pinning (TL4)

- FACT: `SavedWorkout` (`prisma/schema.prisma:207-221`) has `lastUsedAt` and two `userId` indexes, and no pin field.
- INFERENCE: the smallest change is `pinnedAt DateTime?` plus `@@index([userId, pinnedAt(sort: Desc)])`. The migration is additive with no backfill. Newest pinned first is `orderBy pinnedAt desc`, then `take 5` for Training.
- INFERENCE, routes to touch:
  - `PATCH /api/workouts/saved/[id]` to accept `pinned: boolean`, setting `pinnedAt` to now or null. The route exists today for rename.
  - `GET /api/workouts/saved` to return `pinnedAt`.
  - `SavedWorkoutRow` for a pin toggle.
  - A Training section that reuses the saved-start route.
- INFERENCE: there are also MCP side effects. `list_saved_workouts` and `get_saved_workout` could expose `pinnedAt`, read-only. Pinning shouldn't count as an "edit" in `deleteSavedWorkout`'s revert check, which compares name, notes and plan only, so it's fine as is.

## 4. Suggestions for every user (TL5)

**What's gated today**
- FACT: proposals are admin-only, not editor-gated:
  - Pages: `admin/proposals/page.tsx:21` and `[id]/page.tsx:149` call `isAdminRole`; the admin layout lets editors in (`admin/layout.tsx:21`).
  - APIs: `GET /api/admin/proposals*` uses `requireAdmin`, and approve, reject and revert share `lib/proposals/decision-route.ts:36` (`requireAdmin`).
  - Tokens: agent tokens are admin-only too (`app/api/admin/agent-tokens/route.ts:23,44`), and the MCP route makes no role check of its own.
- INFERENCE: today a non-admin can't get a token, so can't have any proposals. "Suggestions for every user" also needs a user-facing token screen. That screen isn't in TL1–TL5 (choice B).

**What user accept and reject can reuse**
- FACT: the service is already owner-scoped. `findOwned` and every `updateMany` filter on `{id, userId}` (`lib/proposals/service.ts:350-372, 537-548`).
- INFERENCE: user routes such as `POST /api/proposals/[id]/{accept,reject}` and `GET /api/proposals` can reuse `decisionRoute` with `getCurrentUser` in place of `requireAdmin`, plus a kind allowlist. A `not_found`-style refusal for `exercise_definition.*` keeps those admin-only. There's no revert route for users.
- INFERENCE: ownership is safe as long as the user routes pass `user.id`, the same way the admin routes pass `auth.user.id`.

**Showing each kind to a non-admin**
- FACT: the admin detail page already has a renderer per kind:
  - `program.create`: `programDetail` plus `components/admin/proposals/ProgramOutline.tsx`.
  - `anchors.update` and `balance_targets.update`: `balanceRows` plus `FieldDiff`.
  - `saved_workout.create`: `namedExercises` plus `SavedWorkoutOutline`.
  - `saved_workout.update`: `savedWorkoutRows` plus `FieldDiff` (`[id]/page.tsx:29-140`).
- INFERENCE: TL5 should lift those helpers into a shared module and the components out of `components/admin/`. The user review screen then uses them with user wording ("Suggestion", Accept and Reject, no revert, no admin note).
- INFERENCE: anchors and balance targets are the hardest kinds for a non-admin to read, since the FAU names are terse. The spec should say whether display names are enough.

**"Make it active?"**
- FACT: an approved program is created with `isActive: false` (`lib/proposals/program.ts:114`). The approve result's `targetId` is the new program's id.
- FACT: `POST /api/programs/[programId]/activate` (owner check, deactivate others, activate this one) can be called right after accept.
- FACT: the program limit (`MAX_PROGRAMS = 3`, `lib/constants/programs.ts:2`) is enforced in `POST /api/programs`, community add and duplicate. Admins and users with `customProgramLimitBypass` skip it. Program proposal approve doesn't check it.
- INFERENCE: for regular users, accept would bypass the 3-program limit. That needs a decision; I'd enforce it at accept with a clear refusal.

**Notifications**
- FACT: `createProposal` always notifies Discord and Bark (`lib/notify/index.ts:7-10`). Both channels are global: one `DISCORD_PROPOSALS_WEBHOOK_URL` and one `BARK_URL`, which is Dustin's device. The link is always `/admin/proposals/:id` (`service.ts:209-211`). The summary and rationale go in the body.
- INFERENCE: once non-admins get proposals, every user's suggestion would reach Dustin's channels with their workout and program content, linking to a page they can't open. The fix: notify only when the proposal's user is an admin (or drop notify for users), and link users to the new Suggestions screen. This must land with TL5 or before users get tokens.

## 5. PR cuts (one PR per TL, into dev)

1. **TL1 Program Detail.** Move `StrengthWeekView` behind `/programs/[id]` with `programId`-based loaders. Move `?resume=`, `?week=` and restart to the new route. Fix `WorkoutHistoryList:306`. For now `/training` renders the active program's detail (or redirects there), so nothing else changes yet. Risk: the resume deep links from `QuickActionSheet`, `ReturnToWorkoutStrip` and `AdHocLoggerView`.
2. **TL2 Training home.** Sections for Up Next, Recent plus the Repeat route, and Current Program, with no program required. Includes the Repeat route and the shared draft-hydrate helper, and `next-workout` reuse. Risk: Repeat on program sessions (logged-set grouping) and the one-draft 409 handling.
3. **TL3 Library.** `/library` with Workouts | Programs, then My | Browse. Show the active program in the list with an ACTIVE badge and drop `ActiveProgramStrip`. Change the BottomNav and Header labels. Redirect `/programs` → `/library?type=programs` (keeping `tab` and `cloning`) and `/workouts/saved` → `/library?type=workouts`. Update the root redirect and the stale links. Risk: the `?cloning=` progress flow and `startsWith` active-tab matching.
4. **TL4 Pinned.** Migration, PATCH, pin toggle and Training section. Small.
5. **TL5 Suggestions.** User routes, a shared renderer, the review screen, the Training section, "Make it active?", and the notify change. Largest and riskiest: authz, the limit bypass and notification privacy.

TL1 → TL2 → TL3 is the release set. TL4 can come any time after TL2; TL5 last.

**Tests that will break**
- FACT: no tests cover these screens. There's no e2e or Playwright, and `__tests__/components` has only `SignupCompletedTracker`.
- FACT: the matches for `/training` and `/programs` in `__tests__/api/events.test.ts:36,52` and `admin-create-issue.test.ts:154` are plain `pageUrl` strings and won't break.
- FACT: the BDD steps under `__tests__/features/agent-tools/` call the service directly, so the admin-route changes don't affect them.
- INFERENCE: TL5's notify change will affect `__tests__/features/agent-tools/proposal-notifications.steps.ts` (NOT VERIFIED which scenarios). New behaviour needs new specs and tests, since nothing guards the moves.

## 6. Dev DB (read-only, started and stopped `fitcsv-postgres-wt2`)

- FACT, sessions: 91 completed (67 ad-hoc), 4 abandoned, and none with `durationSeconds` or `savedWorkoutId` set.
- FACT, programs: 1 active out of 3. Saved workouts: 1.
- FACT, proposals by kind:
  - `exercise_definition.*`: 9 (3 pending).
  - `program.create`: 3.
  - `balance_targets.update`: 2 (1 pending).
  - `anchors.update`: 1.
  - `saved_workout.*`: 2.
- FACT, users: 6 with role `user`, 1 admin.

## 7. Open choices (the lead decides)

**A. Can you log workouts from a non-active program's detail page?**
I recommend no in TL1. Detail is view-only unless the program is active, and shows "Make active to train". Why: Up Next, progress and Complete Week all assume one active program. Logging into an inactive one would move its progress invisibly. The APIs allow it today, so this is a UI rule only.

**B. Who gets suggestions in TL5, given only admins can make agent tokens?**
I recommend shipping TL5 with the user-facing review and accept for everyone, while token issuance stays admin-only for now. Add a roadmap item for a user token screen, and gate notifications to admins in TL5. Why: it keeps TL5 to the UI Dustin approved and doesn't make account security part of this PR.

**C. Library URL: a new `/library` route, or keep `/programs` with a renamed tab?**
I recommend a new `/library` (with `/library/programs/[id]` for detail), plus redirects from `/programs` and `/workouts/saved`. Why: the bottom-nav `startsWith` matching and the "Library" label line up, and the old links keep working. Keeping `/programs` would mean My Workouts lives under `/programs`.

Smaller things for the spec, which I've left out of the three choices:
- skipped versus "next" in Up Next;
- "complete" versus "done" in the progress count;
- the 3-program limit on accept;
- weight not copied on Repeat;
- FAU display names for non-admins.
