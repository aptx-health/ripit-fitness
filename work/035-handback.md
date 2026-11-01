Report: complete (035, TL1 Program Detail tests, red). Relayed to the lead 2026-10-31 by SendMessage; saved by the lead.

**Files** (locked `-r--r--r--`; unlock with `chmod u+w`)
- `__tests__/features/training-library/program-detail.steps.ts`: 83 tests covering all 12 scenarios plus edge describes, run against real Postgres.
- `__tests__/components/program-detail-view.test.tsx`: 18 tests using Testing Library, with role and text queries only (no markup).

**Seams the implementer builds to**

1. **New `lib/db/program-week.ts`:** `getProgramWeek(programId, userId, weekNumber?) => Promise<ProgramWeekData | null>`.
   - It returns null for a 404: an unknown id, another user's program, or a soft-deleted one (`deletedAt`).
   - The shape is the old `CurrentStrengthWeekData` (`{program, week, totalWeeks}`), with:
     - `program` = `{id, name, isActive, isArchived}`;
     - `canTrain` = `isActive && !isArchived`;
     - `canActivate` = `!isActive && !isArchived`.
   - With no `weekNumber`, it returns the current week: the first week with a workout that is neither completed nor skipped, or else the last week. Only this user's non-archived completions count, and a draft doesn't count as done.
   - Each workout carries this user's latest non-archived completion.
2. **New `lib/training/program-links.ts`:**
   - `programDetailHref(programId, query?)` returns `/library/programs/<id>[?k=v]`.
   - `trainingRedirectTarget(userId, query)` returns `Promise<string|null>`.
     - The program it targets must be active, not archived, not deleted, and owned by the user.
     - It keeps every query param, including repeated values.
     - Null means "show `NoActiveProgram`".
   - `legacyProgramRedirectTarget(programId, query)` returns `/library/programs/<id>` plus the full query. There's no `?` when the query is empty, and no id check.
3. **`components/StrengthWeekView.tsx`:** new optional props `readOnly` (default false) and `canActivate` (default false).
   - With `readOnly`:
     - no Start, Continue or Skip;
     - tapping a skipped workout doesn't unskip it;
     - no Complete Week;
     - `?resume=` doesn't fetch or open the logger.
   - With `readOnly && canActivate`:
     - a "Make active to train" button opens `StrengthActivationModal`;
     - nothing is written until "YES, ACTIVATE".
   - Week arrows go to `/library/programs/<programId>?week=N`, and restart pushes `?week=1`.
   - The test mocks these hooks: `useUserSettings`, `usePwaPrompt`, `useBeforeInstallPrompt` and `DraftWorkoutContext`.
   - It stubs these components by module path: `ExerciseLoggingModal`, `WorkoutRollupModal`, `PwaInstallPrompt` and `WorkoutHistoryList`.
4. **`components/StrengthActivationModal.tsx`:** after success, it pushes `/library/programs/<programId>`.
5. **History link:**
   - In `app/api/workouts/history/route.ts`, `workout.week.program` gains `id`.
   - In `components/WorkoutHistoryList.tsx`, "View Full Workout →" goes to `/library/programs/<that id>`.
   - A freestyle session has no link.
6. **Activate route:** unchanged. It's tested through the real handler, with auth, rate limiting and events mocked.

**Red state**
- Steps file: 60 failed, 20 passed. The passes are Background and Given steps, plus one guard (freestyle has no link).
- Component file: 12 failed, 6 passed.
- Every failure comes from missing TL1 code.
- Lead re-run: 75 failed, 26 passed, 101 total.

**Break matrix**
- The baseline passed 83/83 and 18/18.
- 47 breaks were run, and all were killed.
- The matrix found two gaps, now covered by tests:
  - another user's completions counting toward the current week;
  - archived completions showing in the week.

**Not covered**
- **Page glue:**
  - the library page calling `notFound()`;
  - the `/training` redirect;
  - the `/programs/[id]` redirect;
  - passing `readOnly`/`canActivate`.
- **Other link updates:**
  - `QuickActionSheet`, `ReturnToWorkoutStrip`, `ActiveProgramStrip`, `StrengthActions`, `useProgramActions`, and the `ProgramCompletionModal` fallback;
  - these need a `programId` that the draft and next-workout APIs don't return yet.
- **`?week=` beyond the last week:** the spec is silent on this.
- **Declining activation:** it pushes the stale `/programs?tab=strength`.
