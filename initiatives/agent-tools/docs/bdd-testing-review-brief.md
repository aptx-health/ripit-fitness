# Brief: review our Gherkin/BDD testing approach and propose something better

You are an Opus research agent in a visible herdr tab. Dustin (the user) will read your output and learn from it. This is a **research and design** job: read, measure, think, write one note. Do not change code, tests, features, specs, `work/`, `STATE.md` or `status.md`. Do not commit or push.

Checkout: `~/projects/worktrees/ripit-fitness/worktree2` (branch `feature/agent-balance`). Read `AGENTS.md` first if it exists. Use the `research-spike` skill for the note format if it helps.

## The question

We build features with a behavior-driven, test-first workflow and it is too slow, fragile and hard to learn from. Dustin wants something that is **best practice, repeatable, easy to learn from and improve**. You may throw out anything we do today and start from scratch. Say what you would keep, change and drop, and why.

## What we do today (read it, don't take my word)

A "V3" team workflow: a lead hands numbered items (`work/NNN-*.md`) to a test-builder, then an implementer, then reviewers.

1. A `.feature` file (Gherkin) per capability: `features/agent-tools/*.feature`. The spec is `initiatives/agent-tools/docs/spec.md`.
2. A test-builder writes failing step definitions: `__tests__/features/agent-tools/*.steps.ts`, using Vitest and `@amiceli/vitest-cucumber`. Real Postgres via testcontainers (`lib/test/database.ts`, `lib/test/setup.ts`), Prisma, tools called directly (`callTool(...)`).
3. The step files are locked read-only, and an implementer makes them pass without editing them.
4. To prove the tests can fail, the test-builder writes a scratch fake of the implementation and runs a **break matrix**: dozens of variants, each with one rule broken, each must fail only its targeted tests. See `.claude/skills/break-matrix/` and the skills `handoff-test-builder` and `handoff-implementer` (in `~/.claude/skills/`).

Good examples to read: `features/agent-tools/balance-proposals.feature` with `__tests__/features/agent-tools/balance-proposals.steps.ts` (162 tests), and the other files in `__tests__/features/agent-tools/`. The work items and handbacks in `work/` (001 to 027) show the history, including what went wrong.

## Pain points I measured (verify them)

- One 162-test file takes about 25 s. About 20 s of that is per-test setup: every test resets the database and reseeds users, tokens and exercise definitions. Median test is about 190 ms.
- vitest-cucumber runs **every step as its own test**, so a scenario with 4 steps is 4 tests, state lives in module-level variables, and it can't be reset between steps. Filtering with `-t` skips the Background steps and silently breaks scenarios.
- A break matrix of 60 variants costs about 15 minutes at full-file runs, or 5 to 8 minutes targeted. Parallel runs are CPU-bound, so more parallelism doesn't help. Sharing one Postgres container saved only about 3 s of 25 s (tried and removed).
- Each test file starts its own Postgres container. With `TESTCONTAINERS_RYUK_DISABLED=true` (needed on Colima), killed runs leak containers: about 40 piled up and made unrelated test files fail from load.
- The scratch-fake approach means writing a second implementation (hundreds of lines) just to prove the tests can fail, then deleting it. Fakes themselves had bugs (a break that didn't break anything, false kills).
- Step text must match the `.feature` file exactly, which is brittle, and steps tend to be large imperative blobs rather than reusable vocabulary.
- Some test-builder output is hand-computed expected numbers, which is slow to write and review.

## What I want you to investigate

Work from evidence, not opinion. Run the suite and time it (see commands below). Then answer:

1. **Is Gherkin earning its keep here?** Who reads the `.feature` files, and do they get value beyond a plain Vitest `describe/it` suite with good names? What do mature teams do (examples welcome: living documentation, example mapping, three amigos, "specification by example")? When is Gherkin the right tool and when is it overhead? Be honest, including "drop it".
2. **Test design:** better ways to structure these tests for speed and clarity. Candidates to evaluate, not a checklist: seeding once per file and rolling back per test (transactions or savepoints), template databases, a pure-logic core tested without a database plus a thin integration layer, table-driven tests, property-based tests for the numeric rules, contract tests for the MCP tool shapes, snapshot tests used carefully.
3. **Proving tests can fail:** is a hand-written fake plus 60 breaks the right tool? Compare with mutation testing (for example StrykerJS with the Vitest runner) against the real implementation, a smaller risk-based set of breaks, and "red first" plus review. What gives the most confidence per minute? What is the minimum viable version of this step?
4. **Roles and workflow:** is the split (lead, test-builder, implementer, reviewer) with locked tests helping or hurting? Where does time actually go (look at `work/` handbacks)?
5. **Repeatability and learning:** what would a short, teachable playbook look like (one page), so Dustin can learn the method, improve it, and hand it to any agent? What should be a template, a script or a skill, and what should stay judgement?
6. **Infrastructure:** Docker/Colima/testcontainers choices, Ryuk, parallelism, CI vs laptop. Cheap fixes for the leaked containers.

## Constraints and facts

- Next.js 15, Prisma, Postgres, Vitest. macOS with Colima. Env for tests: `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock`, `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`, `TESTCONTAINERS_RYUK_DISABLED=true`.
- Run tests: `npm run test:run -- <pattern>`. Lint: `npx biome check <file>`. Typecheck: `npx tsc --noEmit -p .`.
- **Run test files one at a time and sequentially.** Running many at once overloads Colima and produces false failures. Don't run more than one vitest process yourself. Do not bulk-remove Docker containers; if you start any, remove only those by name.
- Prefer `fd` over `find`.
- You may create throwaway experiments in your scratchpad directory (outside the repo), for example a copy of one step file rewritten in plain Vitest with transaction rollback, to compare timings. Don't edit files in the repo other than your note.
- The agent-tools features are an AI-agent API (MCP tools, proposals, exports). The wider app is a fitness tracker. Assume the approach has to work for ordinary web features too, not just this API.

## Deliverable

One note: `initiatives/agent-tools/docs/bdd-testing-review.md`, written for Dustin. Structure:

1. **Recommendation** (first, under 150 words): what to do, in order, and what it costs.
2. **What the evidence says**: your measurements (timings, counts) and what you read, with file pointers.
3. **Options considered**, with a verdict for each. Say what you'd throw out.
4. **A proposed playbook**: the one-page repeatable method, with a small worked example (a real scenario from `balance-proposals.feature` written the way you'd do it).
5. **Experiment results**, if you ran any: what you tried, the numbers.
6. **Open questions for Dustin**, and what you could not verify.

Plain English, no jargon without a one-line definition. Dustin wants to learn from this, so explain the why. Keep it as short as it can be and still be useful.

When done, write one line to the lead: `SendMessage` to `"lead-ripit-mcp"` with the note's path and a three-line summary. Then stop.
