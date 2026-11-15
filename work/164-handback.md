# 164 handback (coach-impl wE:pA, 2026-11-10) — Report: complete
163's 56 tests pass unchanged; one older test (`__tests__/lib/coaching-send-fixes.test.tsx`) now refuses a third user's exercise instead. Suite 4649 pass; tsc, biome, perf:scan clean.
Send bundles coach-owned exercises as payload `customExercises`; accept takes choices (lib 4th arg / route JSON body), copies or reuses (recorded `copyId`) or maps to "mine", inside the approve transaction. Review screen: a fieldset per exercise; "Use one of mine" opens ExerciseSearchInterface in a dialog.
New: `lib/coaching/custom-exercises.ts` (snapshot, choices schema, naming, earlier-copy lookup via JSON array_contains, resolve/remap), `components/suggestions/BundledExerciseChoices.tsx`, `__tests__/lib/coaching/custom-exercises.test.ts` (100-char trim, 400 for unknown choice / choice without bundle, equal query count 1 vs 3).
Edited: send.ts, proposals service/program/saved-workout (`bundled` visible ids; only coach senders may bundle; `resolveSend`; `userError`), suggestions decision-route/bodies/detail/types, SuggestionReview, ExerciseSearchInterface + FilterChoiceSheet (matchMedia guard; aria-label "Select <name>").
Beyond: copies via one createManyAndReturn; free name from up to 50 numbered candidates in one query; reverting a saved_workout.create keeps the copies.
Not verified: perf:tap; raw DB failure during accept → 500 generic.
Risks: pre-existing eslint error ExerciseSearchInterface.tsx:432. Cleanup (worktree1 dev DB): coach164@test.com, its link, program, 2 exercises, proposal, dmays's copy and accepted program; seed at scratchpad/tmp164/seed164.ts.
Screenshots: initiatives/coaching/docs/assets/164/01-04 (390px).
