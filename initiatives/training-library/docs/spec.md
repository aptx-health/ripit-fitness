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
