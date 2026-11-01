Report: complete (038, TL2 Training home tests, red, including the nav addendum). Relayed by SendMessage 2026-10-31; saved by the lead (condensed, with the seams verbatim).

**Files** (locked)
- `__tests__/features/training-library/training-home.steps.ts`: 97 tests.
- `__tests__/components/training-home-view.test.tsx`: 19 tests.
- `__tests__/components/nav-active-tab.test.tsx`: 16 tests.

**Seams** (new modules; the names are the contract)

1. **`lib/training/home.ts`:** `getTrainingHome(userId) => Promise<{ upNext, recent, currentProgram }>`.
   - **`upNext`:** `{programId, programName, workoutId, workoutName, weekNumber, dayNumber, exerciseCount, hasDraft, href} | null`.
     - The next workout is the first in week then day order with no completed or skipped completion. Only this user's non-archived completions count.
     - `hasDraft` means this user has a non-archived draft for that workout.
     - `href` is `programDetailHref(programId, {week, resume: workoutId})`.
     - It is null with no active program (active, non-archived, non-deleted and owned) or when everything is done.
   - **`recent`:** `[{id, name, completedAt: Date, durationSeconds | null, canRepeat}]`.
     - The 3 newest of the user's completed, non-archived sessions, of any kind.
     - `name` is `workout.name ?? completion.name ?? 'Open Workout'`.
     - The duration is `resolveDurationSeconds(durationSeconds, startedAt, completedAt)`.
     - `canRepeat` means the session has at least one logged set.
   - **`currentProgram`:** `{programId, programName, weekNumber, totalWeeks, workoutsDone, workoutsTotal} | null`.
     - `weekNumber` is the next workout's week, or else the last week.
     - `workoutsDone` counts distinct workouts with this user's completed or skipped, non-archived completion.

2. **`app/api/workouts/completions/[id]/repeat/route.ts`:** `POST(req, {params: Promise<{id}>})`.
   - **Responses:**
     - 200 `{completionId}`.
     - 401 when there's no user.
     - 404 when the session isn't the user's, doesn't exist, or isn't `completed`. The 404 check runs before the 409 one.
     - 422 `{error:'NOTHING_TO_REPEAT'}`.
     - 409 `{error:'DRAFT_EXISTS', message, draft:{completionId,isAdHoc,name}}`, with nothing written. Only the user's own non-archived draft blocks.
   - **The new draft:**
     - `status` draft, `isAdHoc` true, `workoutId` and `savedWorkoutId` null, `startedAt` set.
     - `name` is `workout.name ?? completion.name`.
   - **Its exercises:**
     - `isOneOff`, with `workoutId` null and `workoutCompletionId` set to the new session.
     - The same `exerciseDefinitionId` as the source.
     - `order` runs 1..n, by each exercise's earliest `LoggedSet.createdAt`.
   - **Its sets:** one `PrescribedSet` per logged set.
     - `reps` as text, plus `rir`, `rpe` and `isWarmup`; weight is null.
     - Numbered 1..n in `setNumber` order, including warm-ups.
   - **Left alone:** the source session and `lastUsedAt`.
   - **Shared code:** the hydrate helper is shared with saved-start, and saved-start's existing tests guard it.

3. **`lib/training/program-links.ts`:** gains `trainingResumeRedirectTarget(userId, query) => Promise<string|null>`.
   - It returns the detail URL with the full query, but only when `resume` is present and there is an active program. Otherwise it returns null.
   - TL1's `trainingRedirectTarget` is no longer tested here.

4. **`lib/training/home-redirect.ts`:** `homeRedirectTarget(userId) => '/onboarding' | '/training'`.

5. **`components/training/TrainingHome.tsx`:** default export, with prop `{home}`.
   - **Headings:** "Up Next", "Recent Workouts" and "Current Program", in that order; each is absent when empty.
   - **Up Next:**
     - It shows "Week W · Day D", the workout name and "N exercises".
     - Its link reads "Start Workout", or "Continue", and goes to `href`.
   - **Recent rows:**
     - Each shows the name, the date ("Oct 28") and the duration ("45 min" or "1h 05m").
     - A Repeat button appears only when the session can be repeated.
     - Repeat POSTs, then pushes `/training/adhoc/<id>`.
     - On 409 it shows the message, and on other errors it shows `role=alert`. It sends only one request at a time.
   - **Current Program:** "Week X of Y", "N of M workouts done", a `progressbar` (`aria-valuenow`/`aria-valuemax`), and a "View Program" link.
   - **Empty:** "Start a workout", and a "Find a program" link to `/programs`.

6. **Nav:** `lib/nav/active-tab.ts` exports `isTabActive(tabHref, pathname)`.
   - It is a `startsWith` match, plus `/training` is also active on `/library/programs/*`.
   - `BottomNav` and `Header` both use it, and the active Header link gets `aria-current="page"`.

**Red state:** 86 failed / 11 passed, 19 of 19 failed, and 15 of 16 failed. Every other file passes.

**Break matrix:** 91 breaks, all killed.

**Judgement calls:**
- The tests don't cover a Repeat on an archived session.
- Exercise order is by "first logged".
- Weeks with no workouts aren't tested.

**Not covered** (page glue):
- `/training` calling the loader and the resume redirect;
- `/` calling `homeRedirectTarget`;
- the back link restyle;
- the "Start a workout" target.
