---
owner: personal
remote: github-personal  # org: github.com/aptx-health
---
# AGENTS.md

Ripit Fitness: a strength-training tracker. Users build programs and log workouts without rigid app constraints. Single user per account, no multi-tenancy. Stack: see `package.json` (Next.js 16 App Router, React 19, Prisma 6, Postgres, BetterAuth, BullMQ/Redis, Tailwind). Deployed to self-hosted k8s via ArgoCD.

Project state and active work: `STATE.md`, `initiatives/`, `work/`, `deferred/`.

## Commands

Doppler supplies env vars (project `fitcsv`). Always pass `--config` explicitly; never run bare `doppler run`. Worktrees have no Doppler directory scope, so add `--project fitcsv` there. No per-worktree configs exist. The Doppler CLI token is directory-scoped too: a worktree needs a token scoped to `~/projects/worktrees/ripit-fitness` (copy it with `doppler configure set token ... --scope`), or it falls back to a global token that can read no secrets.

```bash
./scripts/dev.sh                                  # postgres + app (primary checkout)
./scripts/dev.sh start                            # all services (postgres, redis, worker, minio, app)
DOPPLER_PROJECT=fitcsv DOPPLER_CONFIG=dev_personal ./scripts/dev.sh start -l postgres,app   # in a worktree

npm run test:run                                  # all tests (Docker required, no Doppler)
npm run test:run -- <pattern>                     # one file
doppler run --config dev_personal -- npm run type-check
npm run lint:all                                  # biome + eslint
doppler run --config dev_personal -- npx prisma generate
```

- Use `./scripts/dev.sh`, not raw overmind. It puts `OVERMIND_SOCKET` in `/tmp`, because Turbopack panics on `.overmind.sock` in the project root.
- `npm test` is Vitest watch mode. Agents should use `npm run test:run`.

## Worktrees

Put worktrees at `~/projects/worktrees/ripit-fitness/worktreeN`. Each worktree gets its own postgres and redis containers. Slot-derived ports come from `scripts/worktree-env.sh`:

- Postgres: `5433 + slot`
- Redis: `6379 + slot`
- App: `3000 + slot*100`

The primary checkout is slot 0 and serves the app on 3000.

First run in a new worktree:
1. `npm install`
2. `doppler run --config dev_personal -- npx prisma generate`
3. Start with `dev.sh` as above.

Startup applies the schema and seeds the test user **dmays@test.com / password**. Details: `WORKTREE_SETUP.md`.

## Database and migrations

A schema change needs both a local `db push` and a hand-written migration file. Deploys run `prisma migrate deploy` from an init container.

1. Edit `prisma/schema.prisma`.
2. Run `doppler run --config dev_personal -- npx prisma db push`. If it offers to drop tables (BetterAuth's `user` and related tables are not in the Prisma schema), refuse. Write the migration SQL first, apply it with `npx prisma db execute --file <migration.sql>`, then continue from step 5.
3. Run `doppler run --config dev_personal -- npx prisma generate`.
4. Create `prisma/migrations/<date -u +%Y%m%d%H%M%S>_<name>/migration.sql` containing the SQL.
5. Run `DATABASE_URL="postgresql://postgres:postgres@localhost:<PG_PORT>/ripit" npx prisma migrate resolve --applied <dir>`.
6. Commit the schema and the migration together.

Hard rules:
- Never run `prisma migrate deploy`, and never apply SQL to staging or prod.
- Stay on Prisma 6. Use `npx prisma@6.19.0`, never v7.
- After a schema change, tell Dustin: "Schema updated locally. Production migration auto-applies on deploy."
- CI (`migration-check.yml`) labels migration PRs. Destructive migrations fail until they carry the `destructive-migration-approved` label.

Connection pooling (`DATABASE_URL` vs `DIRECT_URL`, PgBouncer): `docs/DATABASE_CONNECTIONS.md`. More detail: `docs/DATABASE_MIGRATIONS.md`.

## Domain gotchas

- Hierarchy: Program > Week > Workout > Exercise > PrescribedSet (the plan) and LoggedSet (what happened). Both are stored so plan and reality can be compared; never collapse them.
- Weight is free text ("135lbs", "65%", "RPE 8").
- `WorkoutCompletion` also covers ad-hoc (freestyle) workouts that belong to no program.
- `SavedWorkout.workoutData` is a JSON snapshot, not a live reference.
- Only one strength program can be active at a time.
- Community program cloning runs in the BullMQ worker (`cloud-functions/clone-program`, which has its own `package.json`), one week per transaction. See `docs/CLONE_WORKER.md`.

## Conventions

- **API routes:**
  - Authenticate with `getCurrentUser()` from `@/lib/auth/server`, or `requireAdmin` / `requireEditor` from `@/lib/admin/auth`.
  - Scope every query to the user.
  - Wrap handlers in try/catch and return 500 on errors.
  - Rate-limit with `lib/rate-limit.ts` (`docs/RATE_LIMITING.md`).
- **Route params:** dynamic route `params` is a Promise; `await` it.
- **Logging:** use `logger` from `@/lib/logger` on the server and `clientLogger` from `@/lib/client-logger` on the client, never `console.*`. See `docs/LOGGING.md`.
- **Queries:** avoid N+1 queries (use the `prisma-check` skill). Select patterns are in `docs/PRISMA_SELECT_PATTERN.md`.
- **File size:** keep files under 1000 lines and split by responsibility. The pre-commit check is advisory (`|| true`), so it won't stop you.
- **Styling:** follow `docs/STYLING.md` (DOOM theme tokens).
- Keep solutions simple. No emojis in code or commits.
- Quote git paths that contain brackets: `git add "app/api/exercises/[id]/route.ts"`.

## Testing

- Vitest plus Testcontainers: each run gets its own Postgres and Redis, so Docker must be running. Under Colima, export the env vars in `docs/TESTING.md` first.
- Tests call lib functions directly with a `PrismaClient` (no HTTP) and assert database state.
- Factories live in `lib/test/factories.ts` and the harness in `lib/test/database.ts`. Patterns: `docs/TESTING.md`.
- Behaviour specs are Gherkin files in `features/`, run through `@amiceli/vitest-cucumber`. Write a spec only when its work item is about to be dispatched, never ahead of time.
- **UI changes:** drive the real flow and take a screenshot before pushing. Use the `webapp-testing` skill and `docs/PLAYWRIGHT_RECIPES.md`, and add a recipe whenever discovering a flow took more than 5 minutes.

## Git, CI, deploy

- Branch from `dev` as `feature/<name>` and open PRs to `dev`.
- `dev` deploys to staging (https://staging.ripit.fit). `main` deploys to prod (https://ripit.fit); its image SHA is bumped by hand in the infra repo.
- PRs run `test.yml`, which does `npm run test:run` and type-check.
- Image tags and workflows: `docs/DEPLOYMENT.md`, `docs/IMAGE_TRACEABILITY.md`.
- Architecture and design questions go to GitHub Discussions, not Issues. GraphQL IDs are in `docs/DEPLOYMENT.md`.

## Docs index

- `docs/DATABASE_MIGRATIONS.md`, `docs/DATABASE_CONNECTIONS.md`: database.
- `docs/LOGGING.md`, `docs/RATE_LIMITING.md`, `docs/LINTING.md`: API and code conventions.
- `docs/STYLING.md`, `docs/PLAYWRIGHT_RECIPES.md`: UI.
- `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/CLONE_WORKER.md`, `docs/IMAGE_TRACEABILITY.md`: testing, deploy and the worker.
- `docs/ADDING_LEARN_ARTICLES.md`: Learn tab content.
- `WORKTREE_SETUP.md`: worktrees.
- `docs/archive/` is historical. Don't follow it.
