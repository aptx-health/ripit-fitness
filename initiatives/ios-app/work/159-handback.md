Report: complete

## Verdict
**Meets spec; good to accept.** Branch `feature/data-export` (`a45d90c4`, worktree3) meets all four scenarios in `features/data-export.feature`. It is scoped to the user, needs a session, is rate limited, and uses a fixed number of queries. No blocking defects. There are three small non-blocking notes below.

## First pass (unaided, before reading 156-handback)

**Checks run**
- `npm run test:run -- export`: 103 passed. Full suite: 196 files, 4449 passed, 4 skipped.
- `doppler run ... npm run type-check`: clean.
- `npm run lint:all`: red, but the errors are already on dev. `npx biome check` on the 8 changed TS/TSX files is clean. No em dashes in the diff.
- `npm run perf:scan -- --changed origin/dev`: one report-only `mount-fetch` at `components/settings/AccountBlock.tsx:24`. It's the existing connected-accounts fetch, not this change.

**Live app at 390px** (Playwright 1.63 with touch; Chrome's window wouldn't resize below a 110px viewport, so I didn't use it)
- The row sits in Account between Coaching and Change password, in the same folder style. Its touch target is 356x65, with no horizontal scroll. Screenshots: `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree3/5715dc96-7aaa-46fd-87db-437691c06eb7/scratchpad/settings-row.png`, `.../settings-limited.png`.
- Tapping it downloaded `ripit-export-2026-11-07.json` in about 144 ms on dev.
- Repeated requests returned `200,200,200,200,429`; with the earlier tap that is 5 allowed, then 429. The row then shows "Too many downloads. Try again in a few minutes."
- Unauthenticated `curl /api/me/export`: 401.

**Downloaded file vs `docs/RIPIT_EXPORT_FORMAT.md`**
- Its top-level keys match the doc and the fixture exactly.
- Every `userId` in the file is the signed-in user's.
- Every `exerciseDefinitionId` resolves to `customExercises` or `exerciseRefs`.
- Every `LoggedSet.exerciseId` resolves to the completion's own exercises or to a program workout's exercises.
- Keys contain no tokens, secrets, passwords, emails, sessions or auth rows. Agent tokens, proposals and coaching links aren't exported, as the doc says.

**Code**
- `app/api/me/export/route.ts`: `getCurrentUser`, then 401, then a limiter keyed on user id. It has try/catch with `logger`, `no-store`, and an attachment filename. It is sound.
- `lib/export/ripit-export.ts`: every root query filters on `userId`. Nested includes run one query per level. The query-count test (1 vs 10 workouts, ≤16) means it.
- Tests: the scoping tests seed a second user with marked names and ids, and assert none appear. The fixture-shape test fails if any exported column changes. That guards the "whole rows" choice: a new column, sensitive or not, can't slip into the iOS contract unnoticed.
- One-off exercises in program sessions: I checked `add-during-logging` and `start-draft`. They always set `workoutCompletionId`, so the "session exercises" nesting picks them all up.

**Non-blocking notes**
1. `exerciseRefs` is fetched by id only. If a user's program references someone else's custom exercise (for example a community copy), that exercise's name is exported. The format doc states this, and coach sends already block it (`lib/coaching/send.ts:179`). Low risk; I'm only noting it.
2. `DownloadDataRow`: the "failed" and "limited" messages stay until the next tap. That's acceptable, just worth knowing.
3. Nit: the log field `bytes: body.length` counts UTF-16 characters, not bytes.

## Questions (each has a default; none blocks)
1. Should soft-deleted programs stay in the export? Default: yes, as built, because completions point at their workouts.
2. Should `UserSettings` internal flags (`customProgramLimitBypass`, prompt counters, `seenMessageIds`) be exported? Default: yes. They are the user's own row, harmless, and the doc says "every scalar column".

## Revised review
I read 156-handback after the first pass. It agrees with what I found: 13 queries, the same lint baseline, and the same mount-fetch. Its open question matches my Q1. Nothing changed my verdict.

## Not verified
- Blob download on iOS Safari or an installed PWA. I only tested Chromium.
- Export time for a large account.

## Outside this item
- `npm run lint:all` is red on dev (biome schema/CLI mismatch plus a few eslint errors). It needs its own fix.
- Chrome's MCP window wouldn't resize below a 110px-wide viewport on this machine. Phone screenshots fell back to Playwright.

## Cleanup (nothing deleted)
- The stale overmind socket `/tmp/fitcsv-overmind-wt6.sock` (nothing was listening) was moved to `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree3/5715dc96-7aaa-46fd-87db-437691c06eb7/scratchpad/stale-overmind-wt6.sock` so `dev.sh` could start. It can be deleted.
- I stopped the worktree3 dev stack (`dev.sh quit`), but the container `fitcsv-postgres-wt6` (port 5439) is still running.
- The worktree3 dev DB has new login session rows for dmays@test.com, and that user's data-export rate-limit bucket is used up for about 10 minutes.
- Scratchpad files: the drive script, screenshots, the downloaded JSON and logs, in `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree3/5715dc96-7aaa-46fd-87db-437691c06eb7/scratchpad/`.
- An unpinned `npx -p playwright` (latest) is in the npx cache from a first attempt that failed.
