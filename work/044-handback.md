Report: complete (044, TL4 Pinned workouts tests, red). Relayed by SendMessage 2026-10-31; saved by the lead (condensed, with the seams verbatim).

**Files** (locked)
- `__tests__/features/training-library/pinned-workouts.steps.ts`: 62 tests, using a real DB and the real route handlers.
- `__tests__/components/pinned-workouts-view.test.tsx`: 22 tests.

**Schema:**
- `SavedWorkout.pinnedAt DateTime?` plus `@@index([userId, pinnedAt(sort: Desc)])`.
- The tests use raw SQL, so they are red with `PrismaClientKnownRequestError` until the migration exists.

**Seams**
1. **`PATCH /api/workouts/saved/[id]`:**
   - Body `{pinned?, name?, notes?}`. An empty body is a 400.
   - `pinned: true` sets `pinnedAt = now()` only if it is null. `false` clears it.
   - A non-boolean `pinned` is a 400 with no write.
   - Rename and pin together does both.
   - Pinning touches nothing else: not the content, `exerciseCount` or `lastUsedAt`.
   - 401 with no user; 404 for an unknown id.
   - **404 for another user's id. Today this is a 403, so this changes on purpose.**
   - Returns 200 `{saved:{..., pinnedAt}}`.
2. **`GET /api/workouts/saved`:** every item carries `pinnedAt`, and the order is unchanged.
3. **`getTrainingHome`:** gains `pinned: [{id, name, exerciseCount, pinnedAt: Date}]`, newest first, at most 5.
4. **`TrainingHome`:**
   - The "Pinned Workouts" section sits between Up Next and Recent.
   - Each row shows its name, "N exercises" and a Start button.
   - A "See all" link goes to `/library?type=workouts`.
   - Start POSTs to the saved-workout start route, then pushes `/training/adhoc/<id>`. A 409 shows the message, and other errors show `role=alert`. Only one request runs at a time.
   - Having a pinned workout means the empty-home screen doesn't show.
5. **Toggles on `SavedWorkoutsList` rows and in `SavedWorkoutDetailDialog`:**
   - The button reads "Pin <name>" or "Unpin <name>", with `aria-pressed`. A pinned row shows "Pinned".
   - It sends `PATCH {pinned}` and updates the row in place, with no refetch.
   - On failure it reverts and calls `toast.error`.
   - The toggle never opens the dialog, and pinning from the dialog shows on the row.

**Locked TL2 tests changed:** `training-home-view.test.tsx` fixtures and `training-home.steps.ts` (the new-user `toEqual`) gain `pinned: []`.

**Red state**
- Steps: 49 of 62 fail.
- View: 20 of 22 fail.
- 1 TL2 test fails.
- Everything else passes.

**Break matrix:** 38 breaks, all killed.

**Not covered**
- The page glue, which only passes `pinned` through.
- The rule that proposal conflict and revert ignore pinning. The 031 tests still guard it, so the reviewer should confirm no `updatedAt` is used.
