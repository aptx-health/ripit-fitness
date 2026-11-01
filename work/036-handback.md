Report: complete (036, TL1 Program Detail build). Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Checks (implementer)**
- TL1: 101/101.
- Full suite: 87 files and 1725 tests passed, 4 skipped.
- tsc clean; biome clean on 24 files (2 old warnings at `StrengthWeekView.tsx:172`).
- `npm run build` passes.
- A spot break was killed.

**Built**
- Seams as named in 035: `lib/db/program-week.ts` and `lib/training/program-links.ts`.
- `programDetailHref` is in the client-safe `lib/training/program-href.ts`, re-exported from `program-links.ts`.
- `StrengthWeekView`/`WorkoutCard`: `readOnly`, `canActivate`.
- Activation modal: pushes to the detail page; decline only closes.
- `ProgramCompletionModal`: restart goes to week 1 of the detail page.
- History: the route returns `program.id`, and the list links to the detail page.
- `programId` was added to `GET /api/workouts/active-draft`, `GET /api/training/next-workout` and the `ActiveDraft` type.
- Every active-program link now goes to the detail URL. The remaining `'/training` links mean home, ad-hoc, or a fallback for a missing `programId`.

**Page glue (smoke-tested on the dev server, no tests)**
- `/library/programs/[id]` checks ownership before Suspense, so a 404 returns HTTP 404. The route has no `loading.tsx`.
- `/training` is a plain server redirect: `revalidate` and the Suspense shell were removed.
- `/programs/[id]` redirects with the query kept.

**Open points (outside the item)**
1. The back link goes to `/training`, which redirects straight back until TL2.
2. A draft from a no-longer-active program resumes to a read-only page that ignores `?resume=`. TL2 should decide.
3. Read-only rows still show a chevron.
4. Recent history on any program's page shows all sessions.
5. The worktree2 dev server needs `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to `http://localhost:3200`.
