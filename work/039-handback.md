Report: complete (039, TL2 Training home build). Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Checks**
- TL2, TL1 and nav: 235/235.
- Full suite: 1859 passed, 4 skipped. The lead re-ran it with the same result.
- tsc, biome and eslint are clean, and the build passes.

**Built**
- The seams as named in 038.
- A shared `lib/workouts/start-draft.ts` (`startDraftFromPlan`, `draftExistsBody`), now used by saved-start too.
- `trainingResumeRedirectTarget`, replacing `trainingRedirectTarget`.
- `isTabActive` in both `BottomNav` and `Header`, with `aria-current`.
- `formatDuration` moved to `lib/format/duration.ts`.
- Repeat:
  - It is rate limited, with the event `workout_repeated`.
  - It copies each exercise's notes and group too.
  - An archived session gives a 404.

**Beyond the item**
- The `completions/[completionId]/` routes (effort, rollup) moved to `completions/[id]/`. Next.js rejects two different slug names at the same level.
- Their URLs are unchanged.

**Page glue (smoke-tested)**
- `/training`: `?resume` redirects; otherwise the home renders.
- `/` goes through `homeRedirectTarget`.
- Empty "Start a workout" starts a freestyle workout directly, because the sheet's state is local to the nav. A 409 shows as an alert.
- The back link uses the settings-subpage pattern: ArrowLeft plus "TRAINING".

**Screenshots:** `initiatives/training-library/docs/assets/039/`, taken with Playwright because the Chrome extension wasn't connected.
- The nav underline shows on both Training and the detail page.
- A temporary user made for the empty-state shot was deleted.

**Open points**
1. dmays's active program changed in the wt2 DB during the work. This was probably Dustin, on the TL1 preview.
2. The seeded sessions show no durations.
3. The Repeat button (bordered) and Start (3D) use different styles.
