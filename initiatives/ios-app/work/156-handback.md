Report: complete

## Verdict
Checks out. All four web scenarios pass. The full suite, type-check and the perf tap test pass, and the query count stays the same for 1 and 10 workouts. Branch `feature/data-export` in worktree3 has 2 commits (`575a5d05` format + fixture, `a45d90c4` route + UI). Nothing is pushed.

## Not verified
- iOS Safari / installed-PWA blob download. I only drove Chromium (Playwright) at 390px. iOS PWAs can be odd with `a.download`.
- Export time for a very large account. Locally, a seeded user took about 50 ms.

## Summary
New `GET /api/me/export` returns a ripit-export v1 JSON file (`ripit-export-YYYY-MM-DD.json`). It uses session auth, a new 5-per-10-min rate limit, logging and a try/catch, and runs 13 queries no matter how much data there is. Settings → Account has a "Download my data" row: it fetches the file and shows "Preparing your file…", an error message, or a 429 message. The format doc and the fixture are committed.

## Scenario → test map
| Scenario | Tests | Result |
|---|---|---|
| Download my data from Settings | `data-export.steps.ts` (renders AccountBlock, clicks the row, real route, checks filename + header) | pass |
| The export holds only my data | steps + `ripit-export.test.ts` "holds only the user's rows" | pass |
| Complete enough to rebuild | steps (every Exercise/PrescribedSet/LoggedSet id round-trips) + 4 builder tests | pass |
| Rate limited and needs a session | steps (401 without calling the limiter; 200,200,200,429,429 keyed on user id) | pass |

I made two deliberate breaks to show the tests can fail. Dropping user scoping on completions made 3 tests fail, and adding a per-row query made the query-count test fail.

## Files changed
- `docs/RIPIT_EXPORT_FORMAT.md`, `docs/fixtures/ripit-export-v1.json`: the format and an example file built from a test DB.
- `lib/export/ripit-export.ts`: the builder.
- `app/api/me/export/route.ts`: the route.
- `lib/rate-limit.ts`: adds `dataExportLimiter`.
- `components/settings/DownloadDataRow.tsx`: the new row.
- `components/settings/AccountBlock.tsx`: mounts the row.
- `features/data-export.feature`: the first 4 scenarios.
- `__tests__/features/data-export/{data-export.steps.ts,seed.ts}`, `__tests__/lib/ripit-export.test.ts`: the tests and seed data.

## Verification
- `npm run test:run -- export` → 103 passed. Full suite → 4449 passed, 4 skipped.
- `doppler run ... npm run type-check` → clean.
- `npm run lint:all` → **fails, but not on my files.** It has 81 biome errors (biome CLI 2.4.15 vs schema 2.4.6, `clone-worker.test.ts`, `sync-exercise-images.ts`, etc.) and 5 eslint errors (`rate-limit.test.ts:93`, `PwaInstallButton`, `MessageCard`, ...). Biome and eslint are clean on every file I changed.
- `npm run perf:scan -- --changed origin/dev` → one report-only `mount-fetch`, on AccountBlock's existing connected-accounts fetch (not new).
- `npm run perf:tap` (prod build, Settings → Download) → PASS: feedback 7 ms, and the export request took about 50 ms.
- Screenshots at 390px, light and dark: `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree3/6449178e-aa08-460e-a5a7-05ff335c022d/scratchpad/settings-account-light.png` and `.../settings-account-dark.png`. A real download was saved in the same folder.

## Decisions beyond the handoff
- **Nesting:** `loggedSets` sit flat on each completion and point at `exerciseId`. The completion's `exercises` holds only session exercises (one-offs, with their prescribedSets). Planned exercises stay under `programs`.
- **Exercise references:** `exerciseRefs` lists `{id, name}` for every definition the file mentions that isn't one of the user's custom exercises (system ones, by id plus name).
- **Programs:** soft-deleted programs are included, with `deletedAt` set, because past completions point at their workouts.
- **Out of scope for v1:** cardio and the training profile are not exported.
- **Full rows:** settings and other models are exported as whole rows, so new columns show up automatically.

## Open questions and risks
- Should soft-deleted programs be left out (the user deleted them)? If so, their completions would point at missing workouts.
- Lint was already red on `origin/dev`. It needs a separate fix (biome schema bump and the 5 eslint errors).

## Where to look first
- `lib/export/ripit-export.ts:40`: the queries and how definition ids are gathered.
- `docs/RIPIT_EXPORT_FORMAT.md`: the contract for iOS.

## Cleanup for Dustin
- Local worktree3 dev DB (slot 6, port 5439): dmays@test.com now has a waiver acceptance, plus login session and AppEvent rows from the screenshot and tap runs.
- The worktree3 postgres container may still be running after I stopped `dev.sh`.
- Scratchpad files (screenshots, logs, the downloaded JSON) are under `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree3/6449178e-aa08-460e-a5a7-05ff335c022d/scratchpad/`.
