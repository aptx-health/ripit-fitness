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
