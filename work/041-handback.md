Report: complete (041, TL3 Library tests, red). Relayed by SendMessage 2026-10-31; saved by the lead (condensed, with the seams verbatim).

**New files** (locked)
- `__tests__/features/training-library/library.steps.ts`: 73 tests, no database.
- `__tests__/features/training-library/library-support.ts`: the fixtures. Its header comment is the seam spec.

**Seams**
1. **`lib/library/links.ts`** (pure functions):
   - `libraryHref({type?, tab?, cloning?}?)`.
   - `parseLibraryType(raw)`: only the exact string 'workouts' gives 'workouts'; anything else gives 'programs'.
   - `legacyProgramsRedirectTarget(query)` goes to `/library?type=programs` plus the rest of the query.
   - `legacySavedWorkoutsRedirectTarget(query)` goes to `/library?type=workouts` plus the rest.
   - `legacyCommunityRedirectTarget()` goes to `/library?type=programs&tab=browse`.
2. **`components/library/LibraryView.tsx`:** default export, taking `ConsolidatedProgramsView`'s props. It reads `type`, `tab` and `cloning` through `useSearchParams`.
   - The h1 is "LIBRARY", with `role=tab` Workouts | Programs (`aria-selected`).
   - **Programs:** My Programs | Browse. A user with no programs lands on Browse, including after switching over from Workouts.
   - **Workouts:** "MY WORKOUTS" over `SavedWorkoutsList`, with no create action and no Browse.
   - **My Programs:**
     - The strip and the no-active note are gone.
     - The active program is first, with "ACTIVE" and "Week X of Y"; the others follow, newest first.
     - An expanded row has VIEW, linking to `/library/programs/<id>`.
     - "CREATE NEW PROGRAM" appears only on My Programs.
   - **`?cloning`:** behaves as today, and the address is tidied to `/library?type=programs`.
   - `MyProgramsList` gains an `activeWeekInfo` prop.
3. **`components/programs/ProgramBackLink.tsx`:** a "Library" link to `/library?type=programs`, for the detail page.
4. **Nav:**
   - The tabs are now `/training`, `/library`, `/learn` and `/settings`.
   - Library is active on `/library*`, `/programs/new` and `/programs/<id>/edit`.
   - Training is not active on `/library/programs/*`.
5. **Links:**
   - `CommunityProgramCard` goes to `/library?type=programs&cloning=<id>`.
   - `ProgramCompletionModal` "Choose New Program" goes to `/library` with `type=programs`.
   - `StrengthActivationModal` without `onSkip` goes to `/library?type=programs`.
   - "Find a program" goes to `/library?type=programs&tab=browse`.

**Locked tests changed on purpose**
- `nav-active-tab.test.tsx` (rewritten).
- `program-detail-view.test.tsx` (the skip target).
- `training-home-view.test.tsx` and `training-home.steps.ts` ("Find a program").

**Red state**
- Library steps: 67 of 73 fail.
- Nav: 16 of 28 fail.
- One test each fails in 3 more files.
- Lead's full run: 86 failed, 1858 passed. That matches exactly.

**Break matrix:** 49 breaks, all killed.

**Not covered, for the reviewer to grep**
- The page glue: `/library`, the 3 redirect pages, and the detail page using `ProgramBackLink`.
- The links in onboarding, the new and edit back links, `WorkoutRollupModal` and `QuickActionSheet`.
