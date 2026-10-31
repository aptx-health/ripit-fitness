# Training + Library: spec

Written just in time, one section per roadmap item. Decisions: [decisions.md](decisions.md). Behaviour: `features/training-library/*.feature`.

## TL1 Program Detail

Today's Training screen (`StrengthWeekView`: week navigation, week overview, workout days, Complete Week, recent history, logging modal) becomes the detail screen for one program, at `/library/programs/[id]`.

**Route**
- `/library/programs/[id]` shows the program with that id if the signed-in user owns it and it isn't deleted. Otherwise it is a 404, including for another user's program.
- `?week=N` shows week N. With no `week`, it shows the current week: the first week with a workout that is neither completed nor skipped, or else the last week. This is the same rule as today, applied to this program rather than "the active one".
- The data loaders take `programId` and `userId`. They don't assume `isActive`.

**Active program**
The page behaves exactly as `/training` does today:
- logging, the draft resume through `?resume=<workoutId>`, Complete Week, and recent history;
- the completion and restart flow, where restart goes to week 1 of this detail page.

**Non-active program (including archived)**
- The same week view, read-only. There is no way to start or log a workout and no Complete Week, but completed workouts can still be viewed.
- A "Make active to train" button opens the existing activation flow (`StrengthActivationModal` / `POST /api/programs/[programId]/activate`). Afterwards, the page shows the program as active.
- Archived programs show the read-only view without the button.

**Until TL2 replaces `/training`**
- `/training` with an active program redirects to `/library/programs/<activeId>`, keeping its query string (`week`, `resume`).
- `/training` with no active program shows the `NoActiveProgram` state, as today.

**Links**
- `/programs/[id]` redirects to `/library/programs/[id]`, keeping the query string.
- Every link that means "the active program" goes straight to its detail URL, so TL2 can turn `/training` into the home page without breaking them. The 034 handback (§1, "Nav and links") lists them:
  - `QuickActionSheet` "Continue your program" and the program-draft resume;
  - `ReturnToWorkoutStrip` for program drafts;
  - `ActiveProgramStrip`, `StrengthActions`, the activation modals, `useProgramActions`, `ProgramCompletionModal`, and restart.
- Links that mean home stay `/training`: the root redirect, welcome, and the end of an ad-hoc session.
- `WorkoutHistoryList` links each program session to its program's detail page, not to `/programs/<workoutId>`.
- The detail page's back link goes to `/training` for now. TL3 changes it to the Library.

**Out of scope:** the Training home (TL2), the Library and nav (TL3), and any visual redesign of the week view.

## TL2 Training home

`/training` stops redirecting and becomes the home page: "what should I do next?" It is a vertical page of sections, and each section appears only when relevant. The order is fixed:
1. Coach Suggestions (TL5)
2. Up Next
3. Pinned Workouts (TL4)
4. Recent Workouts
5. Current Program

TL2 builds Up Next, Recent Workouts and Current Program, and leaves space for the other two. It works with no active program.

**Up Next**
- Shown when the user has an active, non-archived program with a next workout. The next workout is the first workout, in week then day order, that is neither completed nor skipped (skipped counts as done).
- It shows the program name, "Week W · Day D", the workout name and its exercise count.
- Its button is "Start Workout". If the user already has a draft for that workout, the button is "Continue" instead.
- The button goes to the program's detail page at that week, resuming that workout (`programDetailHref(programId, {week, resume: workoutId})`), which opens the logger as today.
- Absent when there's no active program, or when every workout is done.

**Recent Workouts**
- The user's 3 most recent completed sessions, newest first, of any kind: ad-hoc, saved-workout or program. Drafts, abandoned sessions and archived completions are excluded, and so are other users' sessions.
- Each row shows the session name (the program workout's name, or the ad-hoc session's name), the date and the duration. The duration comes from `durationSeconds`, or from the timestamps as the history route does today.
- Each row has a Repeat button.
- Absent when there are no completed sessions.

**Repeat:** `POST /api/workouts/completions/[id]/repeat`
- It starts a new freeform (ad-hoc) draft session for the current user, using the source session's logged sets as the plan.
  - The new session has the same name.
  - It has the same exercises, in the order they were first logged.
  - For each exercise, it has the same number of sets, each with that set's reps (as text), RIR, RPE and warm-up flag. Weight is not copied.
- The draft has no program workout and no saved workout (`workoutId` and `savedWorkoutId` are null), so it never counts toward program progress.
- The response contains the new session id, and the UI goes to `/training/adhoc/<id>`.
- Errors:
  - It refuses with 409 `DRAFT_EXISTS` when the user already has a draft, matching the ad-hoc and saved-workout start routes, under the same Serializable transaction rule. The UI shows the same message those routes do.
  - It returns 404 for a session that isn't the user's, doesn't exist, or isn't completed.
  - A session with no logged sets can't be repeated: 422 `NOTHING_TO_REPEAT`. The UI hides Repeat for such rows.
- It reuses the saved-workout start's "hydrate into a draft" logic. Extract a shared helper, and don't duplicate it.

**Current Program**
- Shown when there's an active, non-archived program.
- It shows:
  - the name;
  - "Week X of Y", using the current-week rule from TL1;
  - "N of M workouts done", where skipped counts as done;
  - a progress bar for N/M;
  - a "View Program" link to the program's detail page.

**Empty home**
- With no sections to show, Training shows a short empty state:
  - "Start a workout", which opens the center Workout button's sheet or starts a freestyle workout;
  - "Find a program", which goes to `/programs`. TL3 changes it to the Library.

**Other changes**
- `/training` no longer redirects, and its query strings mean nothing. Old `/training?week=` and `?resume=` links are gone since TL1. A `?resume=<workoutId>` that still arrives redirects to the active program's detail page with the query kept, so old bookmarks and PWA state still work.
- The root `/` redirects to `/training` whether or not there's an active program (onboarding still comes first).
- The detail page's back link to `/training` is now meaningful. Restyle it to match the app's existing back navigation (the header or back pattern other detail pages use), replacing the plain "← Back to Training" text link. (Dustin, TL1 preview.)
- The bottom nav and desktop header highlight the right tab, with its gold underline, on every page. `/library/programs/*` highlights Training until TL3 adds the Library tab; after that it highlights Library. Today nothing is highlighted there. (Dustin, TL1 preview.)

**Out of scope:** Coach Suggestions (TL5), Pinned Workouts (TL4), the nav and Library (TL3), a program draft whose program is no longer active (still rare; it stays as in TL1), and any change to the logger.

## TL3 Library

The Programs tab becomes **Library**, at `/library`: the place to manage workouts and programs. Most of today's Programs page is reused.

**Navigation**
- The bottom nav and desktop header become Training · Library · Workout (center) · Learn · Settings. The Library tab takes the Programs tab's place and links to `/library`, and its icon may stay the same.
- `isTabActive`:
  - Library is active on `/library` and everything under it, including `/library/programs/*`.
  - Remove TL2's rule that made Training active on `/library/programs/*`.
  - Library is also active on `/programs/new` and `/programs/*/edit`, which stay at their current addresses.

**`/library` page**
- **Title:** "LIBRARY", in the same style as today's "PROGRAMS".
- **Content switch:** WORKOUTS | PROGRAMS, controlled by `?type=workouts|programs`. With no `type`, it shows Programs.
- **Programs:** MY PROGRAMS | BROWSE, as today, with `?tab=browse` and `?cloning=`. A first-time user with no programs still lands on Browse, as today.
- **Workouts:** My Workouts only. There's no Browse sub-tab yet (deferred), so no secondary switch is shown.
- **Create action:** "+ Create New Program" appears only on Programs → My Programs. There's no create action on Workouts (deferred).

**My Workouts**
- Today's saved-workouts list (`SavedWorkoutsList`), unchanged in behaviour (start, open details, rename, delete), under the heading "MY WORKOUTS". Keep its "Start a freestyle workout" button.
- An empty list keeps today's empty message.

**My Programs**
- Remove the big active-program strip (`ActiveProgramStrip`) and the "no active program" note above the tabs.
- The active program is a normal entry in the list, shown first, with an ACTIVE badge and "Week X of Y" (TL1's current-week rule).
- Every entry's expanded actions gain **VIEW**, which opens `/library/programs/<id>`. The existing actions stay: activate, edit, duplicate, delete.

**Browse Programs:** unchanged.

**Redirects** (keeping the rest of the query)
- `/programs` → `/library?type=programs`, keeping `tab` and `cloning`.
- `/workouts/saved` → `/library?type=workouts`.
- `/community`, which already redirects to `/programs`, goes straight to `/library?type=programs&tab=browse`.

**Links:** every link to the old list pages goes to the new addresses:
- onboarding;
- `CommunityProgramCard` (`?cloning=`);
- `ProgramCompletionModal`;
- `StrengthActivationModal`'s no-`onSkip` path;
- the back links on `/programs/new` and `/programs/[id]/edit`;
- `WorkoutRollupModal` and `QuickActionSheet` for saved workouts;
- Training's empty-state "Find a program", which goes to `/library?type=programs&tab=browse`.

**Program detail back link:** "← LIBRARY" to `/library?type=programs`, in place of "← TRAINING".

**Out of scope:** Browse Workouts, Create New Workout, pinning (TL4), suggestions (TL5), and moving `/programs/new` and `/programs/[id]/edit`.

## TL4 Pinned workouts

Users pin saved workouts to keep informal routines on Training without building a program.

**Schema** (additive, no backfill)
- Add `SavedWorkout.pinnedAt DateTime?` and `@@index([userId, pinnedAt(sort: Desc)])`.
- Create the migration locally (the worktree DBs are built with `db push`, so use `db execute` + `migrate resolve --applied` rather than `migrate dev`). It is applied on deploy, never by hand to staging or prod.

**API**
- `PATCH /api/workouts/saved/[id]` accepts `pinned: boolean`, alone or alongside today's rename fields.
  - `true` sets `pinnedAt` to now, but only if it isn't pinned already: pinning again keeps its place.
  - `false` clears `pinnedAt`.
  - Another user's or an unknown id is a 404, as today. A non-boolean `pinned` is a 400.
  - The response includes `pinnedAt`.
- `GET /api/workouts/saved` returns `pinnedAt` for each workout. The list order is unchanged.
- Pinning doesn't change `updatedAt`-based or content checks: the proposal conflict and revert rules compare name, notes and plan only.

**My Workouts (Library → Workouts)**
- Each row has a pin toggle: an icon button labelled "Pin" or "Unpin" with `aria-pressed`. A pinned row shows a small pinned marker.
- The saved-workout detail dialog has the same toggle.
- Toggling updates the row in place, with no full reload. On failure it reverts and shows the list's usual error.

**Training → Pinned Workouts**
- Goes between Up Next and Recent Workouts, in the TL2 order.
- Shown only when the user has at least one pinned workout.
- Lists the 5 most recently pinned, newest first. Each shows the name, "N exercises" ("1 exercise" when singular) and a **Start** button.
- Start uses the existing saved-workout start (`POST /api/workouts/saved/[id]/start`) and goes to the ad-hoc logger.
  - On 409 `DRAFT_EXISTS`, it shows the same message the Repeat button shows.
  - Only one request runs at a time.
- A "See all" link goes to `/library?type=workouts`. It is always shown in the section.
- `getTrainingHome` gains `pinned: [{id, name, exerciseCount, pinnedAt}]`, holding at most 5.

**Out of scope:** pinning program days, a pin limit, reordering pins, and exposing `pinnedAt` through MCP.

## TL5 Coach Suggestions

TL5 is split into two stacked PRs:
- **TL5a:** users review suggestions in the app.
- **TL5b:** users create their own agent tokens, and notifications are scoped to the owner.

Until TL5b lands, only admins have tokens, so in practice only Dustin gets suggestions.

### TL5a Suggestions for users

"Suggestion" is the user-facing word for a pending agent proposal. The UI never says "proposal".

**Kinds users see:** `saved_workout.create`, `saved_workout.update`, `program.create`, `anchors.update` and `balance_targets.update`. Exercise-library kinds (`exercise_definition.*`) never appear outside admin, and any user-facing route treats them as not found.

**API** (signed-in user, own proposals only; another user's, an unknown or a hidden-kind id is a 404, with rate limiting as for other user routes)
- **`GET /api/suggestions`:** the user's pending suggestions of the allowed kinds, newest first, as `{id, kind, summary, rationale, createdAt}`.
- **`GET /api/suggestions/[id]`:** one suggestion of an allowed kind, whatever its status, with what the review screen needs.
- **`POST /api/suggestions/[id]/accept`:** runs the existing approve in `lib/proposals/service.ts`, with the same result mapping as the admin decision route.
  - A suggestion that isn't pending is a 409.
  - A conflict result keeps the existing status `conflict` and responds so the UI can say "This suggestion no longer applies".
  - For `program.create` the response includes the new program's id.
- **`POST /api/suggestions/[id]/reject`:** runs the existing reject.
- There's no user revert: undo stays in admin.
- Accepted programs may take a user past the 3-program cap (decided). The service already allows this.

**Training → Coach Suggestions**
- The first section, above Up Next. Shown only when the user has at least one pending suggestion.
- The heading is "Coach Suggestions · N".
- The newest suggestion is prominent:
  - its kind label: "Workout" for a saved workout create, "Workout change" for an update, "Program", "Anchor lifts" or "Training targets";
  - its summary;
  - its rationale, cut to 2 lines;
  - a **Review** button that opens `/suggestions/[id]`.
- Up to 2 more suggestions are listed compactly, by summary only, each linking to its review screen.
- A **View Suggestions** link goes to `/suggestions`.
- `getTrainingHome` gains `suggestions: {count, items}`, where `items` holds the newest 3. Pending suggestions also suppress the empty-home screen.

**`/suggestions`**
- The list of pending suggestions, with the same rows as above. If none are pending, it says "No suggestions right now" and links back to Training.

**`/suggestions/[id]` review screen**
- The title, kind label, rationale and created date.
- A body per kind. Lift the renderers out of the admin proposal detail page into shared components and use them in both places, with no duplicated logic:
  - **Saved workout create:** the outline (exercises with planned sets).
  - **Saved workout update:** the changed fields, before and after.
  - **Program:** the program outline (weeks, days, exercises).
  - **Anchors and balance targets:** before and after per pattern or FAU, always using display names, never keys.
- **Accept** and **Reject** buttons, shown only while the suggestion is pending. A suggestion that isn't pending shows its outcome ("Accepted", "Rejected", "No longer applies") and no buttons.
- **After Accept:**
  - A workout lands in My Workouts. The screen confirms with a link to `/library?type=workouts`.
  - A program asks "Make it active?" with **Make active** and **Not now**.
    - Make active uses the existing activation (`POST /api/programs/[id]/activate`), then goes to the program's detail page.
    - Not now goes to the program's detail page, which stays inactive.
  - Anchors and targets confirm with "Updated".
- **After Reject:** it goes back to `/suggestions`, or to Training if none are left.
- An action that fails shows the error and leaves the suggestion pending.

**Titles** (added after review 049)
- Users never see the service summary, which admin keeps. Every user-facing title comes from `suggestionTitle`:
  - workout create: the workout's name;
  - workout update: "<current name>: <changed fields>", e.g. "Push A: name, exercises";
  - program: the program's name;
  - targets: "<FAU display name> <before> → <after>", joined with ", ";
  - anchors: the pattern display names, joined with ", ".
- The review screen's title is a normal-size heading, not the all-caps display style.

**Error wording:** route errors to users never contain "proposal". By code:
- `not_pending`: "This suggestion was already decided."
- `conflict`: "This suggestion no longer applies."
- `not_found`: "Suggestion not found."
- `invalid`: "This suggestion can't be applied."

Responses return `{id, status, kind}`, never the whole row.

**Navigation:** `/suggestions*` highlights the Training tab.

**Admin:** unchanged. Admins still see every kind in `/admin/proposals`, with revert.

**Out of scope for TL5a:** user tokens and the notification changes (TL5b), undo, and editing a suggestion before accepting it.

### TL5b User agent tokens and scoped notifications

Any user can connect their own agent (Claude, Hermes and so on) to the MCP server, so the suggestions they review in TL5a can come from it. Admins keep their existing token manager.

**Settings → Agent access** (`/settings/agent-access`)
- Linked from the Settings page as a row like "Muscle balance", labelled "Agent access".
- The page uses the settings-subpage pattern, with a back link "← Settings".
- It explains in one or two lines that an agent with a token can read your training data and make suggestions you review. It shows the MCP server address to connect to: `<app origin>/api/mcp`.
- It lists the user's tokens, newest first. Each shows its name, created date, and "Revoked" or a Revoke button.
- **Create:**
  - A name field (1–50 characters, trimmed) and a Create button.
  - After creating, the token is shown **once** in a copyable box, with "Copy it now; you won't see it again." Leaving or reloading the page hides it for good.
- **Revoke:** confirm in place ("Revoke <name>?" with Revoke and Cancel). A revoked token stops working at once.
- **Limit:** at most 5 active (unrevoked) tokens per user. At the limit, Create is disabled and explains why.

**API** (signed-in user, own tokens only, rate limited like other user routes)
- **`GET /api/agent-tokens`:** `{tokens:[{id, name, createdAt, revokedAt}]}`. Never the hash or the token.
- **`POST /api/agent-tokens`:** `{name}`.
  - Returns 201 `{token:{id, name, createdAt}, secret}`. `secret` is the plain token, returned only here.
  - A bad name is a 400.
  - At the limit, 409 `{code:'TOKEN_LIMIT'}`.
- **`DELETE /api/agent-tokens/[id]`:** revokes the token and returns 200 `{token}`. Revoking an already revoked token is fine. Another user's or an unknown id is a 404.
- Reuse `lib/agent-tokens.ts` (`createAgentToken`, `revokeAgentToken`). The admin routes stay as they are.

**MCP for non-admin token owners**
- `propose_exercise_create` and `propose_exercise_update` are refused for non-admin owners. They return an error with code `forbidden` and the message "Exercise library changes are admin-only." Nothing is created and nobody is notified.
- `tools/list` hides those two tools from non-admins.
- Every other tool works as before.

**Notifications**
- A new proposal posts to Discord and Bark only when its owner is an admin.
- A proposal owned by a non-admin sends no notification at all, so other users' content never reaches Dustin's channels.

**Out of scope:** token scopes or expiry, last-used tracking, an in-app agent, and notifying users themselves (for example by email).

## TL6 Training folder tabs (mockup A)

Dustin picked mockup A, `docs/mockups/050/mockup-a.html` and `.png`. It's a visual restyle of the Training home: behaviour, data and routes stay as they are. Build it to match the mockup closely, using the app's tokens and components.

**Section tabs**
- Every section gets a folder-style tab header (a new shared `SectionTab` component): an icon, an uppercase label, an optional count chip, and an optional right-aligned link.
- The tab sits on the section's box, and the box border matches the tab.
- Variants:
  - **coach:** gold, filled. Label "From your coach", the pending count as a chip, and "See all" to `/suggestions`.
  - **next:** green, filled. Label "Up Next".
  - **quiet:** tan:
    - "Pinned", with a count chip and "See all" to `/library?type=workouts`;
    - "Recent", with a count chip;
    - "Current Program".
- Each tab label is the section's heading (`h2`), with the count in a separate chip whose accessible label is, e.g., "3 suggestions". Exact strings: "From your coach", "Up Next", "Pinned", "Recent", "Current Program".

**The suggestion card**
- At the top, "Your coach suggests" with the coach icon, and a "Waiting on you" stamp.
- Then the kind label as a dark chip ("Workout", "Program", …), the title (`suggestionTitle`), a meta line, the rationale as a quote with a gold rule, and a full-width gold **Review suggestion** button to `/suggestions/<id>`.
- The meta line:
  - a workout: "N exercises · suggested <relative day>";
  - anything else: "suggested <relative day>".
  - The relative day ("today", "yesterday", "Oct 28") renders client-side only, as the TL2 dates do.
- The other pending suggestions (up to 2) are rows below a dashed divider. Each row has a gold dot, the kind label in small caps, the title and a chevron, and links to its review screen.

**Other sections**
- Up Next is unchanged in content, inside a green box.
- Pinned and Recent rows use mixed-case titles, with the bordered Start and Repeat buttons as today.
- Current Program becomes one row:
  - the name;
  - "Week X of Y · N of M workouts done";
  - a "View" link on the right;
  - the progress bar underneath.

**Unchanged:** the section order and rules, the empty home, and every link target and behaviour from TL2, TL4 and TL5a.

**TL6 changes from Dustin's preview (2026-10-31)**
- The "See all" action becomes its own paper tab, to the right of the section's tab: same folder shape, a dimmed primary green, the text "See all", and the accessible names kept. It applies wherever a section has "See all" (From your coach, and Pinned).
- The suggestion card drops "Your coach suggests" and the "Waiting on you" stamp, since the tab already says "From your coach". The card starts with the kind chip.

**TL6 final layout: three tabbed blocks (mockup 054, confirmed by Dustin 2026-10-31)**

Training has three blocks in this order, each a folder box with paper tabs. When a block has more than one tab, the tabs switch what the block shows (a tablist, both panels server-rendered, switching hides one, no fetch).
1. **Coach block** (only with pending suggestions):
   - The "From your coach" tab, with its count chip.
   - Directly beside it, like a second tab, a dimmed-green link tab "All suggestions" to `/suggestions`.
   - Content as before: the kind chip, title, meta, quote, Review suggestion, and up to 2 rows.
2. **Workouts block:** tabs "Pinned Workouts" and "Recent".
   - Pinned Workouts shows the pinned rows with Start. Recent shows the recent rows with Repeat.
   - There's no "See all" tab.
   - A tab whose list is empty is still selectable and shows a short empty line. The whole block hides only when there are no pins and no recent sessions.
3. **Program block:** tabs "Up Next" and "Active Program".
   - Up Next is today's Up Next content.
   - Active Program is today's Current Program row: name, "Week X of Y · N of M workouts done", the bar, and "View <name>". It adds a "Next: Week W · Day D · <workout>" line when there's a next workout. There's no Start button.
   - With no active program, the block still shows. Both tabs show the same placeholder: "No active program", one line of text, and "Find a program" to `/library?type=programs&tab=browse`.
- **Tab selection:**
  - Remembered per device, in `localStorage`, read after mount.
  - Defaults: Pinned Workouts if there are pins, else Recent; Up Next if there's a next workout, else Active Program.
  - A stored choice never opens an empty panel when the other tab has content.
- **Empty home:** the empty-home screen is gone. The Program block's placeholder and the Workouts block, when present, cover it. With no pins, no recent sessions and no program, the page shows only the Program block's placeholder.
- **Headings:** each tab is a tab button, and each block is a region named after the block ("From your coach", "Workouts", "Program").
