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
