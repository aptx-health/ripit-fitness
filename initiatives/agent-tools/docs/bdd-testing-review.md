# Review: our Gherkin/BDD testing approach, and a better one

2026-10-30. Research note for Dustin. Brief: `bdd-testing-review-brief.md`. No code, tests or work items were changed.

## 1. Recommendation

Keep writing scenarios for you to confirm. Stop running them through Gherkin step files, and stop writing scratch fakes. In order:

1. **Fix the database reset** (about 1 hour). One SQL statement replaces 27 `TRUNCATE`s. Each reset drops from 157 ms to 6 ms, so the 162-test file goes from about 19 s to an estimated 7 s.
2. **Fix the laptop setup** (5 minutes):
   - Give Colima more CPU. It has 2 CPUs and 2 GB on a 14-core Mac, which explains why parallel runs never sped up.
   - Turn Ryuk back on. I tested it: it works on Colima and cleans up killed runs, so the leaked containers stop.
3. **New tests are plain Vitest.** Use one `it` per confirmed scenario, with the same title, and pure rules tested without the database. A 30-line script checks that every scenario has its test.
4. **Replace the break matrix with "red first" plus mutation testing** on the real code after it passes. Try it first on one module (half a day).

This removes the test-builder's biggest time sink, the fake, and most of the workflow's fragility.

## 2. What the evidence says

**Timings** (one vitest process at a time; reports in my scratchpad):

| File | Tests | Wall time | Per-test median | Body of a test |
|---|---|---|---|---|
| `balance-proposals.steps.ts` | 162 | 19.3 s | 139 ms | ~3 ms |
| `training-insights.steps.ts` | 85 | 8.3 s | 12 ms* | – |
| `exercise-proposals.steps.ts` | 104 | 5.4 s | 3 ms* | – |

\* These files are mostly Gherkin steps. The ~130 ms reset is paid once per scenario, in the first Background step (the slowest steps are all `Given Dustin has an agent token…` at 125–131 ms), so the median looks small.

- **The reset is the whole cost.** `freshState()` calls `db.reset()` (19 `TRUNCATE … CASCADE` statements, `lib/test/database.ts:122`). Each file then adds its own `wipeTables` (8 more). In my benchmark that costs 157 ms per test. The test bodies take a few milliseconds.
- **Container start plus schema push is about 2 s**, and vitest startup about 3 s. That is why sharing a container saved only about 3 s: the per-test reset swamped it.
- **Every test file starts a Postgres container**, including the 39 of 85 that never touch the database. `lib/test/setup.ts` calls `getTestDatabase()` for every file.
- **Colima has 2 CPUs and 2 GB** (`colima list`) on a 14-core Mac. Every Postgres container runs inside that VM, so parallel runs fight over 2 CPUs. That is the "CPU-bound" ceiling in `.claude/skills/break-matrix/SKILL.md`.
- (The balance numbers were taken while 107 of the 162 tests failed fast, because item 026 is still being built. The reset cost is the same either way.)

**Gherkin usage:**
- 7 `.feature` files, 76 scenarios, 275 step lines. Of those, 207 are unique. The repeats are mostly Background lines, so there is almost no reusable step vocabulary. Each step is written for one scenario.
- In `balance-proposals.steps.ts`, 84 of the 162 tests are plain `describe/it` blocks (from line 737), not Gherkin. The 15 scenarios are the human-readable top layer; most of the checking already happens in plain Vitest.
- Who reads the `.feature` files: you do, when you confirm scenarios ("Dustin confirmed the scenarios", `status.md:53`, `:74`). The lead and reviewers count them. No one reads the step files except agents.
- Problems caused by the runner itself:
  - it runs one test per step, so state lives in module variables (`balance-proposals.steps.ts:47`);
  - the `afterEach` mock wipe broke When→Then (`work/006:49`);
  - a `-t` filter skips Background steps, which needed `|Background` workarounds and caused false kills (`work/025-handback.md:34`);
  - scenario counts were miscounted three ways (`status.md:18`).

**Where time went** (from `work/` and `status.md`; durations are lead timestamps):
- Test items took 2–48 minutes. Builds took 3–7 minutes. 025 (162 tests, 60 breaks) took about 48 minutes, the longest item by far (`status.md:74-75`).
- The break matrix found **one real gap** in 025 (the 14-day window edge, `025-handback.md:17`). It also produced **two survivors** where the spec was silent (`017-handback:16`, `025-handback:15`).
- Tests caught **no implementation bugs** that are recorded anywhere. The V3 retro says the "pass-proof caught nothing wrong this time" (`status.md:49`).
- The bugs that mattered were found by **reviewers and your phone test**, not by tests or breaks:
  - revert overwriting later edits (`work/002:55`);
  - a transaction timeout on large programs (`011-handback:23`);
  - a formula guard that missed tab or CR characters (`022-handback:16`);
  - the confusing revert on programs (`status.md:30`).
- Locked tests were unlocked 4 times, each for a planned change. There was 1 real conflict (`work/006:49`). Locking costs little and causes little friction.
- No hand-computed expected number was ever wrong. They are slow to write, but they haven't been a source of errors.

## 3. Options considered

| Option | Verdict | Why |
|---|---|---|
| **Keep `.feature` + vitest-cucumber step files** | **Drop the step files.** Keep the scenarios. | The scenarios earn their keep as the list you confirm. Binding them to code with exact-text steps buys nothing a test title doesn't, and the runner caused 3 of the problems above. |
| Scenarios as an "example map" you confirm | **Keep** | Example mapping means listing rules, then one or two concrete examples per rule, then questions. That is what the `Rule:` + `Scenario:` blocks already are. It is the cheap part, and it is where you add value. |
| Plain Vitest, `describe(rule)` / `it(scenario title)` | **Adopt** | It's the same readability with a normal runner: `beforeEach` works, `-t` works and state is local. Given/When/Then become three comment lines or helper names. |
| Traceability script (every confirmed scenario has an `it` with the same title) | **Adopt** | Keeps the "living documentation" link without a Gherkin runner. About 30 lines; it could parse the existing `.feature` files. |
| **Fast reset**: one `DO` block that deletes every table with FK checks off | **Adopt now** | 6 ms against 157 ms. It's a drop-in for `db.reset()`, and it covers new tables automatically, so the per-file `wipeTables` copies can go. |
| Seed once per file, roll back a transaction per test | **Later, where it fits** | 1.3 ms per test. But `lib/proposals/service.ts:287` opens its own `prisma.$transaction`, and Prisma can't nest those. You'd need a wrapper whose `$transaction(fn)` calls `fn(tx)` on the outer transaction. That's worth it only after the fast reset, if suites grow. |
| Template database per test (`CREATE DATABASE … TEMPLATE`) | **Use per file, not per test** | 32 ms per test, which is slower than the fast reset. It is the right tool for **one container per run, one database per file**, which cuts 85 container starts to 1. |
| Pure logic core tested without a database | **Adopt** | `lib/insights/balance.ts` already exists. Bounds, step size, window edges and summaries are pure functions, so they test in microseconds. Today each row of `it.each([-0.05, 2.05, 3, 1.33 …])` pays a full reset to test a validator. |
| Table-driven tests (`it.each`) | **Keep** | Already used well (`balance-proposals.steps.ts:1092-1110`). Move them to the pure layer. |
| Property-based tests (fast-check: generate many inputs, check a rule always holds) | **Adopt for numeric rules** | Rules like "every target 0–2 on a 0.05 step is accepted and nothing else is", or "a set inside the window counts and one outside doesn't", are properties. Generated inputs find edges, like the 14-day gap, that hand-picked cases miss. |
| Contract tests for MCP tool shapes (check each tool's input and output shape) | **Adopt, cheaply** | One shared test that every tool's output matches its zod or JSON schema and contains no forbidden words. Today each file re-asserts key lists by hand (`:486-494`). |
| Snapshot tests | **Only for the agent-facing text** | Good for summaries and error messages, where a reviewer reads the diff. Bad for numbers or anything with ids and dates. |
| **Scratch fake + 60-break matrix** | **Drop** | It is a second implementation written only to be deleted. It had its own bugs, it is the main cost in the slowest item, and it found 1 gap in 60 breaks. |
| Mutation testing (StrykerJS) on the real code | **Pilot** | A mutation tool makes small automatic changes ("mutants") to the real code, such as `<` to `<=` or a dropped condition. A test that still passes is a gap. It does what the fake does, with no fake to write. It runs after green, on changed files only. Not verified here; see §6. |
| "Red first" + review, with a small risk-based break list | **Adopt as the minimum** | Red first: before the code exists, every new test fails for the right reason. Before mutation testing is in place, the implementer makes 3–5 hand breaks of the riskiest rules in the real code, then reverts them. |
| Separate test-builder and implementer, locked tests | **Keep for risky work; optional for small items** | Independence is real value: whoever writes the tests hasn't seen the code. Locking is cheap. But for 2–7 minute items, the handoff costs more than the work. |

## 4. Proposed playbook (one page)

**1. Example map** (lead with Dustin, about 10 minutes). For each rule, write 1–3 concrete examples and any open questions. Dustin confirms the list. *Template.* Format: the current `.feature` text, minus anything only the step code needs.

**2. Decide the layer for each example** (test-builder, judgement):
- **Pure rule** (validation, maths, formatting): test it without a database, as a table or a property.
- **Behaviour through the tool or API** (permissions, what is stored, conflicts): an integration test with real Postgres.
- **UI flow**: a Playwright test plus your phone preview.

Most examples are pure rules with one integration test on top.

**3. Write tests red** (test-builder):
- Use `describe('<Rule>')` and `it('<Scenario title, verbatim>')`. Write Given/When/Then as three short comment lines, using shared helpers (`seedSession`, `proposeTargets`, `approve`).
- Run them. Every new test must fail for the right reason ("unknown tool", "not a function"). A wrong reason, such as a `TypeError` in setup, is a test bug.
- Run `scripts/check-scenarios` (*script*): every confirmed scenario has an `it` with that title.
- Lock the files. *Script:* fail CI if the implementer's commit touches them.

**4. Make them green** (implementer). Then make 3–5 deliberate breaks in the real code on the riskiest rules, confirm a test fails each time, and revert. Once the pilot works, run `npx stryker run --mutate <changed files>` instead (*script*). Report survivors; the lead decides whether each one is a missing test or doesn't matter.

**5. Review**: an agent reviewer, then your phone test. Neither is optional; the evidence says these find the real bugs.

**What stays judgement:** which examples to confirm, the layer for each, which survivors matter. **Skills:** example-map, test-writer (steps 2–3), implementer (step 4). **Scripts:** fast reset, scenario check, test-lock check, Stryker config, container cleanup.

**Worked example.** *"An out-of-range or off-step target is refused"*, today 1 scenario + 20 `it.each` rows, each paying a 157 ms reset:

```ts
// Pure layer: no database, microseconds per case
describe('Target changes are proposed and approved', () => {
  it('An out-of-range or off-step target is refused', () => {
    // Given / When: validating quads 2.5, or quads 1.33
    for (const v of [2.5, 1.33, -0.05, 2.05, 0.07, Infinity, '1.3', null]) {
      expect(validateTargetChanges({ quads: v })).toMatchObject({ ok: false, field: 'quads' })
    }
  })

  it('every on-step value from 0 to 2 is accepted, and nothing else', () => {
    fc.assert(fc.property(fc.double({ min: -1, max: 3, noNaN: true }), (v) => {
      const onStep = v >= 0 && v <= 2 && Math.abs(v * 20 - Math.round(v * 20)) < 1e-9
      expect(validateTargetChanges({ quads: v }).ok).toBe(onStep)
    }))
  })
})

// Integration layer: one test proves the tool uses the validator and stores nothing
it('the tool refuses a bad target and creates no proposal', async () => {
  const out = await proposeTargets({ quads: 2.5 })
  expect(toolError(out).field).toBe('quads')
  expect(await db.proposal.count()).toBe(0)
})
```

`validateTargetChanges` stands for whatever the pure module exports. The test-builder names it in the work item, so it's part of the contract.

## 5. Experiment results

The benchmark script, `reset-bench.mts` in my scratchpad, ran against a real testcontainer. Each run did a reset, the 025 seed (token + 4 exercises) and a one-write, one-read body, 30 times:

| Reset strategy | Median per test | 162 tests |
|---|---|---|
| Today: `db.reset()` + `wipeTables` | 157 ms | 25.5 s |
| One `TRUNCATE` listing all 34 tables | 58–69 ms | 9–11 s |
| `DELETE` only the 3 touched tables | 6.5–7.4 ms | 1.0–1.2 s |
| **`DO` block: `DELETE` every table, FK checks off** | **6.1 ms** | **1.0 s** |
| Seed once, transaction rolled back per test | 1.3–1.7 ms | 0.2–0.3 s (0 rows leaked) |
| New database from a template per test | 31.7 ms | 5.1 s |

`TRUNCATE` is slow on tiny tables because it rebuilds files on disk; `DELETE` on a near-empty table is almost free. The `DO` block (one SQL statement that loops over tables) needs a superuser, which the test container has:

```sql
DO $$ DECLARE r record; BEGIN
  SET LOCAL session_replication_role = replica;  -- skip FK checks
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'
  LOOP EXECUTE 'DELETE FROM ' || quote_ident(r.tablename); END LOOP;
END $$
```

**Ryuk on Colima works. Disabling it is what leaks containers.** Ryuk is testcontainers' reaper container: it deletes a run's containers when the run dies.

I ran the balance file with `DOCKER_HOST` and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` set and `TESTCONTAINERS_RYUK_DISABLED` unset. Ryuk started and the tests ran. Then I sent `kill -9` to the whole vitest process tree mid-run, and Ryuk removed that run's Postgres container within 10 s. The socket override is the documented Colima fix, and it was already in our env.

So the cheap fix for the ~40 leaked containers is to **drop `TESTCONTAINERS_RYUK_DISABLED=true` on the laptop** (keep it in CI if you like). A second leak path is also covered: killing only the vitest parent with `-9` left an orphaned worker that held its container.

## 6. Open questions, and what I could not verify

**Questions for Dustin**
1. Do you want to keep the scenarios in `.feature` syntax, so the scenario check can parse them, or as a list in the spec? Either works.
2. Is it OK to raise Colima to 6 CPUs and 8 GB (`colima stop && colima start --cpu 6 --memory 8`)? It restarts your other containers (qbittorrent, gluetun).
3. For small items (under about 10 minutes), can one agent write the tests and the code, with an independent reviewer?

**Not verified**
- **Stryker with this setup.** I didn't install it, because that would change `package.json`. Unknowns: whether `@stryker-mutator/vitest-runner` reuses one container per worker, and its runtime on the balance module. The pilot answers both.
- **End-to-end time after the fast reset.** 7 s for the balance file is an estimate: 2 s container, 3 s vitest startup, about 2 s of tests. Re-measure after the change.
- **Whether more Colima CPUs fixes parallel scaling.** It's very likely, given 2 vCPUs, but I didn't restart Colima while other agents were running tests.
- **CI** runs on `ubuntu-latest` with Ryuk disabled (`.github/workflows/test.yml:49`). The fast reset and the one-container-per-file setup change apply there too; nothing was run in CI.
